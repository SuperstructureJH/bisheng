import pytest

from bisheng.user.domain.models.user_preference import UserPreference
from bisheng.user.domain.services.user_preference_service import (
    UserPreferenceService,
)


class FakeUserPreferenceRepository:
    def __init__(self, preference: UserPreference | None = None):
        self.preference = preference

    async def find_by_id(self, user_id: int) -> UserPreference | None:
        if self.preference and self.preference.user_id == user_id:
            return self.preference
        return None

    async def save_font_scale_level(
        self,
        user_id: int,
        level: int,
    ) -> UserPreference:
        self.preference = UserPreference(
            user_id=user_id,
            font_scale_level=level,
        )
        return self.preference


async def test_get_font_scale_level_defaults_to_standard():
    service = UserPreferenceService(FakeUserPreferenceRepository())

    assert await service.get_font_scale_level(7) == 3


async def test_get_font_scale_level_returns_saved_value():
    repository = FakeUserPreferenceRepository(
        UserPreference(user_id=7, font_scale_level=6)
    )
    service = UserPreferenceService(repository)

    assert await service.get_font_scale_level(7) == 6


async def test_update_font_scale_level_persists_value():
    repository = FakeUserPreferenceRepository()
    service = UserPreferenceService(repository)

    result = await service.update_font_scale_level(7, 5)

    assert result.font_scale_level == 5
    assert repository.preference is not None
    assert repository.preference.font_scale_level == 5


@pytest.mark.parametrize("level", [0, 8])
async def test_update_font_scale_level_rejects_out_of_range(level: int):
    service = UserPreferenceService(FakeUserPreferenceRepository())

    with pytest.raises(ValueError):
        await service.update_font_scale_level(7, level)
