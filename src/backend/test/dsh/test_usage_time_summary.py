"""Time-range DSH usage aggregation and management authorization."""

from datetime import UTC, datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI
from sqlmodel import Session

from bisheng.common.errcode.dsh import DshInvalidRequestError
from bisheng.dsh.domain.models.model_call import DshModelCall
from bisheng.dsh.domain.services.admin import DshManagementService
from bisheng.dsh.domain.services.profile import profile_scope
from test.dsh.test_usage_repository import usage_db  # noqa: F401


def call(request_id, *, tenant=2, user=20, started_at, status, usage=None):
    input_tokens, output_tokens = usage or (None, None)
    return DshModelCall(
        request_id=request_id,
        tenant_id=tenant,
        user_id=user,
        seat_id="seat",
        session_id="session",
        grant_version=1,
        model_id=4,
        usage_month="2026-09",
        policy_version=1,
        event_version=2,
        quota_epoch=1,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=None if usage is None else input_tokens + output_tokens,
        status=status,
        usage_source=None if usage is None else "PROVIDER",
        started_at=started_at,
        ended_at=None if status in {"RUNNING", "USAGE_UNKNOWN"} else started_at + timedelta(seconds=2),
    )


def test_usage_summary_counts_requests_and_preserves_unknown_tokens(usage_db):  # noqa: F811
    with Session(usage_db) as session, session.begin():
        with profile_scope(2):
            session.add_all(
                [
                    call(
                        "successful",
                        started_at=datetime(2026, 9, 9, 0, 15),
                        status="SUCCEEDED",
                        usage=(10, 5),
                    ),
                    call(
                        "failed",
                        started_at=datetime(2026, 9, 9, 1, 10),
                        status="FAILED",
                        usage=(2, 3),
                    ),
                    call(
                        "usage-unknown",
                        started_at=datetime(2026, 9, 9, 1, 20),
                        status="USAGE_UNKNOWN",
                    ),
                    call(
                        "other-user",
                        user=21,
                        started_at=datetime(2026, 9, 9, 1, 30),
                        status="USAGE_UNKNOWN",
                    ),
                ]
            )
        with profile_scope(3):
            session.add(
                call(
                    "foreign-tenant",
                    tenant=3,
                    started_at=datetime(2026, 9, 9, 1, 40),
                    status="SUCCEEDED",
                    usage=(100, 100),
                )
            )

    from bisheng.dsh.domain.repositories.admin_queries import DshAdminQueryRepository

    start = datetime(2026, 9, 9, tzinfo=UTC)
    end = start + timedelta(hours=3)
    with Session(usage_db) as session, profile_scope(2):
        summary = DshAdminQueryRepository(session).usage_time_summary(
            20,
            start_at=start,
            end_at=end,
            granularity="hour",
        )
        unknown_only = DshAdminQueryRepository(session).usage_time_summary(
            21,
            start_at=start,
            end_at=end,
            granularity="hour",
        )
        empty = DshAdminQueryRepository(session).usage_time_summary(
            99,
            start_at=start,
            end_at=end,
            granularity="hour",
        )

    assert summary["timezone"] == "Asia/Shanghai" and summary["granularity"] == "hour"
    assert summary["totals"] == {
        "message_count": 3,
        "qa_count": 1,
        "failed_count": 1,
        "cancelled_count": 0,
        "running_count": 0,
        "usage_unknown_count": 1,
        "recorded_usage_count": 2,
        "missing_usage_count": 1,
        "input_tokens": 12,
        "output_tokens": 8,
        "total_tokens": 20,
    }
    assert [point["message_count"] for point in summary["points"]] == [1, 2, 0]
    assert summary["points"][0]["start_at"] == "2026-09-09T08:00:00+08:00"
    assert summary["points"][1]["total_tokens"] == 5
    assert summary["points"][2]["total_tokens"] == 0
    assert unknown_only["totals"]["message_count"] == 1
    assert unknown_only["totals"]["total_tokens"] is None
    assert empty["totals"]["message_count"] == 0 and empty["totals"]["total_tokens"] == 0


async def test_usage_summary_service_authorizes_target_and_selects_granularity():
    authorize = AsyncMock(return_value=({}, 2))
    reader = AsyncMock(return_value={"message_count": 0})
    service = DshManagementService(
        repository_scope=None,
        gateway=None,
        authorize=authorize,
        profiles=None,
        policy=None,
        policy_view=None,
        now=None,
        usage_summary_view=reader,
    )
    start = datetime(2026, 9, 1, tzinfo=UTC)
    end = start + timedelta(hours=48)

    with profile_scope(1):
        assert await service.usage_summary(90, 20, start_at=start, end_at=end, tenant_id=2) == {"message_count": 0}
    authorize.assert_awaited_once_with(90, 2, 20)
    reader.assert_awaited_once_with(20, start, end, "hour")

    await service.usage_summary(90, 20, start_at=start, end_at=end + timedelta(seconds=1), tenant_id=2)
    assert reader.await_args.args[-1] == "day"
    for invalid_start, invalid_end in [
        (start.replace(tzinfo=None), end),
        (end, start),
        (start, start + timedelta(days=366, seconds=1)),
    ]:
        with pytest.raises(DshInvalidRequestError):
            await service.usage_summary(90, 20, start_at=invalid_start, end_at=invalid_end, tenant_id=2)
    assert authorize.await_count == 2


async def test_usage_summary_route_passes_required_offset_timestamps():
    from bisheng.dsh.api.endpoints import admin

    app = FastAPI()
    app.include_router(admin.router, prefix="/api/v1")
    service = SimpleNamespace(usage_summary=AsyncMock(return_value={"message_count": 3}))
    app.dependency_overrides[admin.admin_user] = lambda: SimpleNamespace(user_id=90)
    app.dependency_overrides[admin.get_management] = lambda: service
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/dsh/admin/users/20/usage-summary",
            params={
                "tenant_id": 2,
                "start_at": "2026-09-01T00:00:00+08:00",
                "end_at": "2026-09-08T00:00:00+08:00",
            },
        )
        assert response.status_code == 200 and response.json()["data"] == {"message_count": 3}
        assert (await client.get("/api/v1/dsh/admin/users/20/usage-summary")).status_code == 422
    service.usage_summary.assert_awaited_once_with(
        90,
        20,
        start_at=datetime(2026, 9, 1, tzinfo=timezone(timedelta(hours=8))),
        end_at=datetime(2026, 9, 8, tzinfo=timezone(timedelta(hours=8))),
        tenant_id=2,
    )
