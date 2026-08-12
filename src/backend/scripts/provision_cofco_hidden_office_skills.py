#!/usr/bin/env python3
"""Provision the COFCO deployment's hidden Office preset Skills (F056).

The operation is tenant-scoped and idempotent.  It creates or refreshes the
``docx``, ``pptx`` and ``xlsx`` bundles, keeps them enabled, marks their source
as ``preset``, and enables the super-admin-only ``frontend_hidden`` policy.
Existing non-preset Skills with one of those IDs are never overwritten.

Dry-run is the default.  Run from ``src/backend``:

    PYTHONPATH=./ python scripts/provision_cofco_hidden_office_skills.py --tenant-id 1
    PYTHONPATH=./ python scripts/provision_cofco_hidden_office_skills.py --tenant-id 1 --operator-id 1 --apply
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from dataclasses import dataclass

_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from bisheng.common.services.config_service import settings  # noqa: E402
from bisheng.core.context.manager import close_app_context, initialize_app_context  # noqa: E402
from bisheng.core.context.tenant import DEFAULT_TENANT_ID, set_current_tenant_id  # noqa: E402
from bisheng.linsight.domain.models.linsight_skill import (  # noqa: E402
    LinsightSkillDao,
    LinsightSkillPolicyDao,
)
from bisheng.linsight.domain.schemas.skill_schema import SkillCreateForm  # noqa: E402
from bisheng.linsight.domain.services.skill_service import SkillService  # noqa: E402


@dataclass(frozen=True)
class PresetSkill:
    name: str
    display_name: str
    description: str
    body: str


OFFICE_PRESETS = (
    PresetSkill(
        name="docx",
        display_name="Word 文档处理",
        description="创建、读取、编辑和检查 DOCX 文档，并保留可编辑结构。",
        body="""# Word 文档处理

## 何时使用

当任务涉及读取、创建、修改或检查 `.docx` 文件时使用本能力。

## 执行规则

1. 使用系统提供的代码执行环境处理文件；优先采用 `python-docx`。
2. 保留标题、段落、表格、列表、页眉页脚等可编辑结构，不把整页栅格化为图片。
3. 修改既有文件前先识别原有结构；除用户明确要求外，不改写无关内容。
4. 输出文件必须保存到任务输出目录，并在回复中说明生成的文件名。
5. 对版式敏感的任务应执行渲染或结构复核，并明确仍需人工确认的视觉项。
6. 不向业务用户提及 `docx` Skill ID、来源或技术执行过程；统一称为“Office 文档处理”。
""",
    ),
    PresetSkill(
        name="pptx",
        display_name="PPT 文档处理",
        description="创建、读取、编辑和检查 PPTX 演示文稿，并保留原生可编辑对象。",
        body="""# PPT 文档处理

## 何时使用

当任务涉及读取、创建、修改或检查 `.pptx` 演示文稿时使用本能力。

## 执行规则

1. 使用系统提供的代码执行环境处理文件；优先采用 `python-pptx`。
2. 文本、形状、表格和图表应保持为原生可编辑对象，避免把整页作为一张图片交付。
3. 尊重原文件的母版、比例、字体和版式；除用户明确要求外，不改写无关页面。
4. 输出文件必须保存到任务输出目录，并在回复中说明生成的文件名。
5. 完成后检查页面尺寸、文字溢出、对象遮挡和空白页；视觉结论以实际渲染为准。
6. 不向业务用户提及 `pptx` Skill ID、来源或技术执行过程；统一称为“Office 文档处理”。
""",
    ),
    PresetSkill(
        name="xlsx",
        display_name="Excel 文档处理",
        description="创建、读取、编辑和检查 XLSX 工作簿，并保留公式、样式与工作表结构。",
        body="""# Excel 文档处理

## 何时使用

当任务涉及读取、创建、修改、计算或检查 `.xlsx` 工作簿时使用本能力。

## 执行规则

1. 使用系统提供的代码执行环境处理文件；优先采用 `openpyxl`。
2. 保留工作表、公式、单元格格式、批注、合并区域与冻结窗格等既有结构。
3. 修改既有工作簿前先读取表结构和关键公式；除用户明确要求外，不覆盖无关区域。
4. 输出文件必须保存到任务输出目录，并在回复中说明生成的文件名。
5. 完成后重新打开工作簿核对公式引用、数据类型、日期格式和关键汇总结果。
6. 不向业务用户提及 `xlsx` Skill ID、来源或技术执行过程；统一称为“Office 文档处理”。
""",
    ),
)


async def _run(apply: bool, tenant_id: int, operator_id: int) -> int:
    await initialize_app_context(config=settings)
    try:
        set_current_tenant_id(tenant_id)
        service = SkillService()
        print(f"[scope] tenant_id={tenant_id} operator_id={operator_id}")
        for preset in OFFICE_PRESETS:
            existing = await LinsightSkillDao.get_by_name(preset.name)
            policy = await LinsightSkillPolicyDao.get_by_skill_name(preset.name)
            current = "absent" if existing is None else f"source={existing.source} enabled={bool(existing.enabled)}"
            hidden = bool(policy and policy.frontend_hidden)
            print(f"[plan] {preset.name}: {current} frontend_hidden={hidden} -> preset enabled hidden")
            if apply:
                _, operation = await service.provision_preset(
                    tenant_id=tenant_id,
                    operator_id=operator_id,
                    form=SkillCreateForm(
                        name=preset.name,
                        display_name=preset.display_name,
                        description=preset.description,
                        content=preset.body,
                    ),
                )
                print(f"[apply] {preset.name}: {operation}; enabled=true frontend_hidden=true")
        if not apply:
            print("[dry-run] no data written; pass --apply to provision")
        else:
            print("[done] provisioned docx, pptx and xlsx for the selected tenant only")
        return 0
    finally:
        await close_app_context()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="persist changes (default: dry-run)")
    parser.add_argument("--tenant-id", type=int, default=DEFAULT_TENANT_ID, help="target COFCO tenant")
    parser.add_argument("--operator-id", type=int, default=1, help="operator recorded in audit log")
    args = parser.parse_args()
    if args.tenant_id <= 0 or args.operator_id <= 0:
        parser.error("--tenant-id and --operator-id must be positive integers")
    return asyncio.run(_run(args.apply, args.tenant_id, args.operator_id))


if __name__ == "__main__":
    raise SystemExit(main())
