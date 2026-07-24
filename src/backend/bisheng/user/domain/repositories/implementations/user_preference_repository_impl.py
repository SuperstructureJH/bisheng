from typing import Union

from sqlmodel import Session
from sqlmodel.ext.asyncio.session import AsyncSession

from bisheng.common.repositories.implementations.base_repository_impl import BaseRepositoryImpl
from bisheng.user.domain.models.user_preference import UserPreference
from bisheng.user.domain.repositories.interfaces.user_preference_repository import (
    UserPreferenceRepository,
)


class UserPreferenceRepositoryImpl(
    BaseRepositoryImpl[UserPreference, int],
    UserPreferenceRepository,
):
    def __init__(self, session: Union[AsyncSession, Session]):
        super().__init__(session, UserPreference)

    async def save_font_scale_level(
        self,
        user_id: int,
        level: int,
    ) -> UserPreference:
        preference = await self.find_by_id(user_id)
        if preference is None:
            return await self.save(
                UserPreference(
                    user_id=user_id,
                    font_scale_level=level,
                )
            )
        preference.font_scale_level = level
        return await self.update(preference)
