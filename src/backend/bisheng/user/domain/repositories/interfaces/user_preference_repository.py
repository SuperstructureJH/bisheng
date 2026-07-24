from abc import ABC, abstractmethod

from bisheng.common.repositories.interfaces.base_repository import BaseRepository
from bisheng.user.domain.models.user_preference import UserPreference


class UserPreferenceRepository(BaseRepository[UserPreference, int], ABC):
    @abstractmethod
    async def save_font_scale_level(
        self,
        user_id: int,
        level: int,
    ) -> UserPreference:
        pass
