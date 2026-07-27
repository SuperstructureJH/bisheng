from datetime import datetime
from typing import Literal

from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Integer, text
from sqlmodel import Field

from bisheng.common.models.base import SQLModelSerializable
from bisheng.core.database.dialect_helpers import UPDATE_TIME_SERVER_DEFAULT


DEFAULT_FONT_SCALE_LEVEL = 3
SUPPORTED_FONT_SCALE_LEVELS = (1, 3, 5)


class UserPreference(SQLModelSerializable, table=True):
    user_id: int = Field(primary_key=True, foreign_key="user.user_id")
    font_scale_level: int = Field(
        default=DEFAULT_FONT_SCALE_LEVEL,
        sa_column=Column(
            Integer,
            nullable=False,
            server_default=text(str(DEFAULT_FONT_SCALE_LEVEL)),
        ),
    )
    create_time: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime,
            nullable=False,
            server_default=text("CURRENT_TIMESTAMP"),
        ),
    )
    update_time: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime,
            nullable=False,
            server_default=UPDATE_TIME_SERVER_DEFAULT,
        ),
    )

    __tablename__ = "user_preference"


class FontScalePreferenceUpdate(BaseModel):
    level: Literal[1, 3, 5]


class FontScalePreferenceRead(BaseModel):
    font_scale_level: int
