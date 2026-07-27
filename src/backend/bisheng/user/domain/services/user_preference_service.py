from bisheng.user.domain.models.user_preference import (
    DEFAULT_FONT_SCALE_LEVEL,
    SUPPORTED_FONT_SCALE_LEVELS,
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
        if not isinstance(level, int) or level < 1 or level > 7:
            return DEFAULT_FONT_SCALE_LEVEL
        if level <= 2:
            return 1
        if level <= 4:
            return 3
        return 5

    async def update_font_scale_level(
        self,
        user_id: int,
        level: int,
    ) -> FontScalePreferenceRead:
        if level not in SUPPORTED_FONT_SCALE_LEVELS:
            raise ValueError("font scale level must be one of 1, 3, 5")
        preference = await self.repository.save_font_scale_level(user_id, level)
        return FontScalePreferenceRead(
            font_scale_level=preference.font_scale_level,
        )
