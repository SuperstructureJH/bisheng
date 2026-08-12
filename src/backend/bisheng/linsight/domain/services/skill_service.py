"""Tenant custom skill management service (F035 Track D, design §7.4/§7.5).

Validation chain (design §7.4): size gate → unpack/parse → frontmatter +
name/display_name checks → duplicate checks → disk bundle write → DB metadata
→ best-effort owner tuple via PermissionService.authorize.

built-in skills never pass through here: any name that does not exist in the
tenant's `linsight_skill` table is answered with 11053 (not-found), so their
existence is not leaked (design §7.5).
"""

from __future__ import annotations

from loguru import logger

from bisheng.common.errcode.linsight import (
    SkillFileTooLargeError,
    SkillNameDuplicateError,
    SkillNotFoundError,
    SkillValidationError,
)
from bisheng.database.models.audit_log import AuditLogDao
from bisheng.linsight.domain.models.linsight_skill import (
    SKILL_SOURCE_MANUAL,
    SKILL_SOURCE_PRESET,
    LinsightSkill,
    LinsightSkillDao,
    LinsightSkillPolicyDao,
)
from bisheng.linsight.domain.schemas.skill_schema import (
    SkillBrief,
    SkillCreateForm,
    SkillDetail,
    SkillFileContent,
    SkillFileEntry,
    SkillPage,
    SkillSelectable,
)
from bisheng.linsight.domain.services.github_skill_fetcher import fetch_skill_files, parse_github_url
from bisheng.linsight.domain.services.skill_store import (
    DISPLAY_NAME_META_KEY,
    MAX_BUNDLE_SIZE,
    MAX_DESCRIPTION_LEN,
    MAX_DISPLAY_NAME_LEN,
    SKILL_MD,
    SkillStore,
    compose_skill_md,
    parse_skill_md,
    unpack_zip_bytes,
    validate_skill_name,
)
from bisheng.permission.domain.schemas.permission_schema import AuthorizeGrantItem
from bisheng.permission.domain.services.permission_service import PermissionService

_ARCHIVE_SUFFIXES = (".zip", ".skill")

SKILL_OBJECT_TYPE = "linsight_skill"


class SkillService:
    """All methods assume the tenant context is already established
    (endpoint dependency or worker context, design §6.5). Skills are
    tenant-private: ``LinsightSkillDao`` enforces strict ``tenant_id = current``
    isolation on every read/write (no Root→child sharing), so a tenant only
    ever sees and mutates its own skills."""

    def __init__(self, store: SkillStore | None = None):
        self.store = store or SkillStore()

    # ------------------------------------------------------------- queries --
    async def get_page(
        self,
        keyword: str | None,
        enabled: bool | None,
        page: int,
        page_size: int,
        can_configure_frontend_hidden: bool = False,
    ) -> SkillPage:
        skills, total = await LinsightSkillDao.get_page(
            keyword=keyword,
            enabled=enabled,
            page=page,
            page_size=page_size,
            include_frontend_hidden=can_configure_frontend_hidden,
        )
        hidden_names = (
            await LinsightSkillPolicyDao.list_frontend_hidden_names()
            if can_configure_frontend_hidden
            else set()
        )
        return SkillPage(
            data=[
                SkillBrief.from_model(
                    s,
                    frontend_hidden=(s.name in hidden_names) if can_configure_frontend_hidden else None,
                )
                for s in skills
            ],
            total=total,
            can_configure_frontend_hidden=can_configure_frontend_hidden,
        )

    async def get_selectable(self) -> list[SkillSelectable]:
        skills = await LinsightSkillDao.list_enabled(include_frontend_hidden=False)
        return [
            SkillSelectable(name=s.name, display_name=s.display_name or s.name, description=s.description)
            for s in skills
        ]

    async def get_detail(self, tenant_id: int, name: str, allow_hidden: bool = False) -> SkillDetail:
        skill = await self._get_or_404(name, allow_hidden=allow_hidden)
        frontend_hidden = None
        if allow_hidden:
            policy = await LinsightSkillPolicyDao.get_by_skill_name(name)
            frontend_hidden = bool(policy and policy.frontend_hidden)
        try:
            source_text = self.store.read_text(tenant_id, name)
            _, body = parse_skill_md(source_text)
        except (FileNotFoundError, ValueError) as exc:
            # Disk drifted from DB (shared-volume misconfig etc.) — surface, don't hide.
            logger.warning("skill disk read failed for {}: {}", name, exc)
            source_text, body = "", ""
        detail = SkillDetail(
            **SkillBrief.from_model(skill, frontend_hidden=frontend_hidden).model_dump(),
            preview=body.strip(),
            source_text=source_text,
            files=[SkillFileEntry(**e) for e in self.store.list_files(tenant_id, name)],
        )
        return detail

    async def read_bundle_file(
        self,
        tenant_id: int,
        name: str,
        path: str,
        allow_hidden: bool = False,
    ) -> SkillFileContent:
        await self._get_or_404(name, allow_hidden=allow_hidden)
        try:
            content = self.store.read_text(tenant_id, name, path)
        except ValueError:
            raise SkillValidationError(msg=f"illegal file path: {path}")
        except FileNotFoundError:
            raise SkillNotFoundError(msg=f"file not found in skill bundle: {path}")
        return SkillFileContent(path=path, content=content)

    # ----------------------------------------------------------- mutations --
    async def create_from_form(self, tenant_id: int, user_id: int, form: SkillCreateForm) -> SkillDetail:
        files = {
            SKILL_MD: compose_skill_md(
                name=form.name,
                description=form.description,
                body=form.content,
                display_name=form.display_name,
            ).encode("utf-8")
        }
        return await self._create(tenant_id, user_id, form.name, form.display_name, form.description, files)

    async def create_from_upload(self, tenant_id: int, user_id: int, filename: str, data: bytes) -> SkillDetail:
        name, display_name, description, files = self._parse_upload(filename, data)
        return await self._create(tenant_id, user_id, name, display_name, description, files)

    async def create_from_github(self, tenant_id: int, user_id: int, url: str) -> SkillDetail:
        """Import a skill from a public GitHub directory URL.

        The downloaded bundle joins the exact same create chain as the upload path,
        so frontmatter/size/duplicate checks and the owner tuple are all reused.
        """
        target = parse_github_url(url)
        files = await fetch_skill_files(target)
        name, display_name, description = self._extract_meta(files)
        return await self._create(tenant_id, user_id, name, display_name, description, files)

    async def update_from_form(
        self,
        tenant_id: int,
        name: str,
        form: SkillCreateForm,
        allow_hidden: bool = False,
    ) -> SkillDetail:
        skill = await self._get_or_404(name, allow_hidden=allow_hidden)
        if form.name != name:
            raise SkillValidationError(msg="skill ID cannot be changed when editing")
        self._validate_fields(form.name, form.display_name, form.description)
        await self._check_duplicate(form.name, form.display_name, exclude_id=skill.id)
        # Re-render SKILL.md, keep any other bundle assets untouched.
        new_md = compose_skill_md(
            name=form.name, description=form.description, body=form.content, display_name=form.display_name
        ).encode("utf-8")
        files = self._load_existing_bundle(tenant_id, name)
        files[SKILL_MD] = new_md
        size = self.store.write_bundle(tenant_id, name, files)
        skill.display_name, skill.description, skill.size = form.display_name, form.description, size
        await LinsightSkillDao.update(skill)
        return await self.get_detail(tenant_id, name, allow_hidden=allow_hidden)

    async def update_from_upload(
        self,
        tenant_id: int,
        name: str,
        filename: str,
        data: bytes,
        allow_hidden: bool = False,
    ) -> SkillDetail:
        """Whole-bundle replacement; frontmatter name must equal the path name."""
        skill = await self._get_or_404(name, allow_hidden=allow_hidden)
        new_name, display_name, description, files = self._parse_upload(filename, data)
        if new_name != name:
            raise SkillValidationError(msg=f"frontmatter name '{new_name}' must equal skill ID '{name}'")
        await self._check_duplicate(name, display_name, exclude_id=skill.id)
        size = self.store.write_bundle(tenant_id, name, files)
        skill.display_name, skill.description, skill.size = display_name, description, size
        await LinsightSkillDao.update(skill)
        return await self.get_detail(tenant_id, name, allow_hidden=allow_hidden)

    async def set_status(self, name: str, enabled: bool, allow_hidden: bool = False) -> None:
        await self._get_or_404(name, allow_hidden=allow_hidden)
        if not await LinsightSkillDao.set_enabled(name, enabled):
            raise SkillNotFoundError()

    async def set_frontend_hidden(
        self,
        tenant_id: int,
        name: str,
        frontend_hidden: bool,
        operator_id: int,
    ) -> SkillBrief:
        skill = await self._get_or_404(name, allow_hidden=True)
        previous, _ = await LinsightSkillPolicyDao.set_frontend_hidden(
            skill_name=name,
            frontend_hidden=frontend_hidden,
            updated_by=operator_id,
        )
        await AuditLogDao.ainsert_v2(
            tenant_id=tenant_id,
            operator_id=operator_id,
            operator_tenant_id=tenant_id,
            action="linsight.skill.frontend_hidden.update",
            target_type=SKILL_OBJECT_TYPE,
            target_id=str(skill.id),
            object_name=skill.display_name or skill.name,
            metadata={
                "skill_name": skill.name,
                "before": previous,
                "after": frontend_hidden,
                "scope": {"type": "tenant", "tenant_id": tenant_id},
            },
        )
        return SkillBrief.from_model(skill, frontend_hidden=frontend_hidden)

    async def provision_preset(
        self,
        tenant_id: int,
        operator_id: int,
        form: SkillCreateForm,
    ) -> tuple[SkillBrief, str]:
        """Idempotently provision one system preset through the F035 service.

        Customer initialization scripts call this method rather than writing
        ``linsight_skill`` directly, preserving the owning domain's validation,
        bundle lifecycle and owner-grant behavior. A same-ID tenant-authored
        Skill is never overwritten.
        """
        existing = await LinsightSkillDao.get_by_name(form.name)
        if existing and existing.source != SKILL_SOURCE_PRESET:
            raise SkillValidationError(
                msg=f"refusing to overwrite non-preset skill '{form.name}' (source={existing.source})"
            )
        if existing:
            await self.update_from_form(
                tenant_id,
                form.name,
                form,
                allow_hidden=True,
            )
            await self.set_status(form.name, True, allow_hidden=True)
            operation = "updated"
        else:
            await self._create(
                tenant_id,
                operator_id,
                form.name,
                form.display_name,
                form.description,
                {
                    SKILL_MD: compose_skill_md(
                        name=form.name,
                        description=form.description,
                        body=form.content,
                        display_name=form.display_name,
                    ).encode("utf-8")
                },
                source=SKILL_SOURCE_PRESET,
            )
            operation = "created"

        brief = await self.set_frontend_hidden(
            tenant_id=tenant_id,
            name=form.name,
            frontend_hidden=True,
            operator_id=operator_id,
        )
        await AuditLogDao.ainsert_v2(
            tenant_id=tenant_id,
            operator_id=operator_id,
            operator_tenant_id=tenant_id,
            action="linsight.skill.preset.provision",
            target_type=SKILL_OBJECT_TYPE,
            target_id=str(brief.id),
            object_name=brief.display_name,
            metadata={
                "skill_name": brief.name,
                "operation": operation,
                "frontend_hidden": True,
                "enabled": True,
                "scope": {"type": "tenant", "tenant_id": tenant_id},
            },
        )
        return brief, operation

    async def delete(self, tenant_id: int, name: str, allow_hidden: bool = False) -> None:
        skill = await self._get_or_404(name, allow_hidden=allow_hidden)
        await LinsightSkillDao.delete_by_name(name)
        if not self.store.delete(tenant_id, name):
            logger.warning("skill dir missing on delete: tenant={} name={}", tenant_id, skill.name)

    # ----------------------------------------------------------- internals --
    async def _get_or_404(self, name: str, allow_hidden: bool = False) -> LinsightSkill:
        skill = await LinsightSkillDao.get_by_name(name)
        if not skill:
            # built-in names also land here: 404 without leaking existence (design §7.5).
            raise SkillNotFoundError()
        if not allow_hidden:
            policy = await LinsightSkillPolicyDao.get_by_skill_name(name)
            if policy and policy.frontend_hidden:
                # Tenant admins and business callers receive the same answer as
                # an unknown Skill; this prevents known-ID probing from exposing
                # hidden identity or configuration.
                raise SkillNotFoundError()
        return skill

    def _parse_upload(self, filename: str, data: bytes) -> tuple[str, str, str, dict[str, bytes]]:
        if len(data) > MAX_BUNDLE_SIZE:
            raise SkillFileTooLargeError()
        lower = (filename or "").lower()
        if lower.endswith(_ARCHIVE_SUFFIXES):
            try:
                files = unpack_zip_bytes(data)
            except ValueError as exc:
                raise SkillValidationError(msg=str(exc))
            if sum(len(c) for c in files.values()) > MAX_BUNDLE_SIZE:
                raise SkillFileTooLargeError()
        elif lower.endswith(".md"):
            files = {SKILL_MD: data}
        else:
            raise SkillValidationError(msg="unsupported file type: expecting .md, .zip or .skill")
        name, display_name, description = self._extract_meta(files)
        return name, display_name, description, files

    def _extract_meta(self, files: dict[str, bytes]) -> tuple[str, str, str]:
        """Parse SKILL.md frontmatter from a bundle into (name, display_name, description).

        Shared by the upload and GitHub-import paths so both validate identically.
        """
        if SKILL_MD not in files:
            raise SkillValidationError(msg="SKILL.md not found")
        try:
            meta, _ = parse_skill_md(files[SKILL_MD].decode("utf-8", errors="replace"))
        except ValueError as exc:
            raise SkillValidationError(msg=str(exc))
        name = str(meta.get("name") or "").strip()
        description = str(meta.get("description") or "").strip()
        metadata = meta.get("metadata") or {}
        display_name = str(metadata.get(DISPLAY_NAME_META_KEY) or "").strip() or name
        if not description:
            raise SkillValidationError(msg="frontmatter 'description' is required")
        self._validate_fields(name, display_name, description)
        return name, display_name, description

    def _validate_fields(self, name: str, display_name: str, description: str) -> None:
        if err := validate_skill_name(name):
            raise SkillValidationError(msg=err)
        if not display_name or len(display_name) > MAX_DISPLAY_NAME_LEN:
            raise SkillValidationError(msg=f"display_name is required and must be <= {MAX_DISPLAY_NAME_LEN} chars")
        if not description or len(description) > MAX_DESCRIPTION_LEN:
            raise SkillValidationError(msg=f"description is required and must be <= {MAX_DESCRIPTION_LEN} chars")

    async def _check_duplicate(self, name: str, display_name: str, exclude_id: int | None = None) -> None:
        existing = await LinsightSkillDao.get_by_name(name)
        if existing and existing.id != exclude_id:
            raise SkillNameDuplicateError()
        existing = await LinsightSkillDao.get_by_display_name(display_name)
        if existing and existing.id != exclude_id:
            raise SkillNameDuplicateError()

    def _load_existing_bundle(self, tenant_id: int, name: str) -> dict[str, bytes]:
        base = self.store.skill_dir(tenant_id, name)
        files: dict[str, bytes] = {}
        for entry in self.store.list_files(tenant_id, name):
            files[entry["path"]] = (base / entry["path"]).read_bytes()
        return files

    async def _create(
        self,
        tenant_id: int,
        user_id: int,
        name: str,
        display_name: str,
        description: str,
        files: dict[str, bytes],
        source: str = SKILL_SOURCE_MANUAL,
    ) -> SkillDetail:
        self._validate_fields(name, display_name, description)
        await self._check_duplicate(name, display_name)
        size = self.store.write_bundle(tenant_id, name, files)
        skill = LinsightSkill(
            tenant_id=tenant_id,
            name=name,
            display_name=display_name,
            description=description,
            enabled=True,
            source=source,
            object_path=self.store.object_path(tenant_id, name),
            size=size,
            created_by=user_id,
        )
        skill = await LinsightSkillDao.create(skill)
        if source != SKILL_SOURCE_PRESET:
            try:
                # Tenant-authored Skills retain the F035 best-effort owner grant.
                # System presets are managed exclusively through the global-super
                # admin surface, so assigning them to the provisioning operator is
                # both semantically wrong and incompatible with deployments whose
                # OpenFGA model has not registered ``linsight_skill`` yet.
                await PermissionService.authorize(
                    object_type=SKILL_OBJECT_TYPE,
                    object_id=str(skill.id),
                    grants=[AuthorizeGrantItem(subject_type="user", subject_id=user_id, relation="owner")],
                )
            except Exception:
                logger.exception("skill owner tuple write failed: skill_id={}", skill.id)
        return await self.get_detail(tenant_id, name)
