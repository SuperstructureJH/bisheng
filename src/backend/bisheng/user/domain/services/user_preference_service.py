from bisheng.user.domain.models.user_preference import (
    DEFAULT_FONT_SCALE_LEVEL,
    MAX_FONT_SCALE_LEVEL,
    MIN_FONT_SCALE_LEVEL,
    FontScalePreferenceRead,
)
from bisheng.user.domain.repositories.interfaces.user_preference_repository import (
    UserPreferenceRepository,
)


class UserPreferenceService:
    def __init__(self, repository: UserPreferenceRepository):
        self.repository = repository

    async def get_font_scale_level(self, user_id: int) -> int:
        preference = await self.repository.find_by_id(user_id)
        if preference is None:
            return DEFAULT_FONT_SCALE_LEVEL
        level = preference.font_scale_level
        if level < MIN_FONT_SCALE_LEVEL or level > MAX_FONT_SCALE_LEVEL:
            return DEFAULT_FONT_SCALE_LEVEL
        return level

    async def update_font_scale_level(
        self,
        user_id: int,
        level: int,
    ) -> FontScalePreferenceRead:
        if level < MIN_FONT_SCALE_LEVEL or level > MAX_FONT_SCALE_LEVEL:
            raise ValueError("font scale level must be between 1 and 7")
        preference = await self.repository.save_font_scale_level(user_id, level)
        return FontScalePreferenceRead(
            font_scale_level=preference.font_scale_level,
        )
