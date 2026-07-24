from fastapi import Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from bisheng.common.dependencies.core_deps import get_db_session
from bisheng.user.domain.repositories.implementations.user_preference_repository_impl import (
    UserPreferenceRepositoryImpl,
)
from bisheng.user.domain.repositories.interfaces.user_preference_repository import (
    UserPreferenceRepository,
)
from bisheng.user.domain.services.user_preference_service import (
    UserPreferenceService,
)


async def get_user_preference_repository(
    session: AsyncSession = Depends(get_db_session),
) -> UserPreferenceRepository:
    return UserPreferenceRepositoryImpl(session)


async def get_user_preference_service(
    repository: UserPreferenceRepository = Depends(
        get_user_preference_repository
    ),
) -> UserPreferenceService:
    return UserPreferenceService(repository)
