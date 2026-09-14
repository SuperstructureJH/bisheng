"""Bounded, tenant-scoped projections for DSH administration."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from bisheng.core.context.tenant import strict_tenant_filter
from bisheng.dsh.domain.models.model_call import DshModelCall
from bisheng.dsh.domain.repositories.admin_operation import require_tenant
from bisheng.dsh.domain.schemas.admin import LastCallSnapshot, UsageTimeSummary

BEIJING_TIMEZONE = "Asia/Shanghai"
MESSAGE_STATUSES = ("SUCCEEDED", "FAILED", "CANCELLED", "RUNNING", "USAGE_UNKNOWN")


class DshAdminQueryRepository:
    def __init__(self, session: Session):
        self.session = session

    def last_call(self, user_id: int) -> dict | None:
        tenant_id = require_tenant()
        with strict_tenant_filter():
            row = self.session.exec(
                select(DshModelCall)
                .where(DshModelCall.tenant_id == tenant_id, DshModelCall.user_id == user_id)
                .order_by(DshModelCall.started_at.desc(), DshModelCall.request_id.desc())
                .limit(1)
            ).one_or_none()
        if row is None:
            return None

        def utc(value):
            if value is None:
                return None
            value = value.replace(tzinfo=UTC) if value.tzinfo is None else value
            return value.astimezone(UTC).isoformat().replace("+00:00", "Z")

        return LastCallSnapshot(
            request_id=row.request_id,
            model_id=row.model_id,
            status=row.status,
            started_at=utc(row.started_at),
            finished_at=utc(row.ended_at),
            total_tokens=row.total_tokens,
            projected_at=utc(row.update_time),
        ).model_dump()

    def usage_time_summary(
        self,
        user_id: int,
        *,
        start_at: datetime,
        end_at: datetime,
        granularity: str,
    ) -> dict:
        """Aggregate one request row as one message using UTC storage and Beijing buckets."""
        tenant_id = require_tenant()
        start_utc = start_at.astimezone(UTC)
        end_utc = end_at.astimezone(UTC)
        start_naive = start_utc.replace(tzinfo=None)
        end_naive = end_utc.replace(tzinfo=None)
        timezone = ZoneInfo(BEIJING_TIMEZONE)
        start_local = start_utc.astimezone(timezone)
        end_local = end_utc.astimezone(timezone)
        step = timedelta(hours=1) if granularity == "hour" else timedelta(days=1)
        anchor = (
            start_local.replace(minute=0, second=0, microsecond=0)
            if granularity == "hour"
            else start_local.replace(hour=0, minute=0, second=0, microsecond=0)
        )

        def empty_metrics():
            return {
                "message_count": 0,
                "qa_count": 0,
                "failed_count": 0,
                "cancelled_count": 0,
                "running_count": 0,
                "usage_unknown_count": 0,
                "recorded_usage_count": 0,
                "missing_usage_count": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
            }

        buckets = []
        by_anchor = {}
        while anchor < end_local:
            following = anchor + step
            point = {
                "start_at": max(anchor, start_local).isoformat(),
                "end_at": min(following, end_local).isoformat(),
                **empty_metrics(),
            }
            buckets.append(point)
            by_anchor[anchor.isoformat()] = point
            anchor = following

        totals = empty_metrics()

        def add(metrics, status, input_tokens, output_tokens, total_tokens):
            metrics["message_count"] += 1
            metrics[
                {
                    "SUCCEEDED": "qa_count",
                    "FAILED": "failed_count",
                    "CANCELLED": "cancelled_count",
                    "RUNNING": "running_count",
                    "USAGE_UNKNOWN": "usage_unknown_count",
                }[status]
            ] += 1
            if total_tokens is None:
                metrics["missing_usage_count"] += 1
                return
            if input_tokens is None or output_tokens is None:
                raise ValueError("Recorded DSH token usage must be complete")
            metrics["recorded_usage_count"] += 1
            metrics["input_tokens"] += input_tokens
            metrics["output_tokens"] += output_tokens
            metrics["total_tokens"] += total_tokens

        with strict_tenant_filter():
            rows = self.session.exec(
                select(
                    DshModelCall.started_at,
                    DshModelCall.status,
                    DshModelCall.input_tokens,
                    DshModelCall.output_tokens,
                    DshModelCall.total_tokens,
                )
                .where(
                    DshModelCall.tenant_id == tenant_id,
                    DshModelCall.user_id == user_id,
                    DshModelCall.started_at >= start_naive,
                    DshModelCall.started_at < end_naive,
                )
                .order_by(DshModelCall.started_at, DshModelCall.request_id)
            ).yield_per(1000)
            for started_at, status, input_tokens, output_tokens, total_tokens in rows:
                if started_at is None or status not in MESSAGE_STATUSES:
                    raise ValueError("Stored DSH call is outside the usage aggregation contract")
                recorded_at = (
                    started_at.replace(tzinfo=UTC) if started_at.tzinfo is None else started_at.astimezone(UTC)
                )
                local = recorded_at.astimezone(timezone)
                row_anchor = (
                    local.replace(minute=0, second=0, microsecond=0)
                    if granularity == "hour"
                    else local.replace(hour=0, minute=0, second=0, microsecond=0)
                )
                point = by_anchor.get(row_anchor.isoformat())
                if point is None:
                    raise ValueError("Stored DSH call is outside the requested buckets")
                add(point, status, input_tokens, output_tokens, total_tokens)
                add(totals, status, input_tokens, output_tokens, total_tokens)

        def preserve_unknown(metrics):
            if metrics["message_count"] > 0 and metrics["recorded_usage_count"] == 0:
                metrics["input_tokens"] = None
                metrics["output_tokens"] = None
                metrics["total_tokens"] = None
            return metrics

        return UsageTimeSummary.model_validate(
            {
                "start_at": start_local.isoformat(),
                "end_at": end_local.isoformat(),
                "timezone": BEIJING_TIMEZONE,
                "granularity": granularity,
                "totals": preserve_unknown(totals),
                "points": [preserve_unknown(point) for point in buckets],
            }
        ).model_dump()
