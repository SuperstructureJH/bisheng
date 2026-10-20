import pytest

from bisheng.dsh.infrastructure.quota_redis import QuotaRejected
from test.dsh.test_quota_admission import quota as quota
from test.dsh.test_quota_admission import running
from test.dsh.test_quota_settlement import terminal


async def test_chat_and_work_models_consume_one_balance(quota):
    # Existing 900 tokens on model 4; a different model can spend the final 100.
    admitted = await quota.check_and_start(running(model=5), monthly_token_limit=1000)
    settled = terminal(admitted, 100)
    await quota.record_usage(settled, 1)
    for model in (4, 5, 6):
        with pytest.raises(QuotaRejected, match="quota_exceeded"):
            await quota.check_and_start(running(model=model), monthly_token_limit=1000)
    snapshot = await quota.read_usage(2, 20, "2026-09")
    assert snapshot["used"] == 1000
    assert snapshot["models"] == {"4": 900, "5": 100}


async def test_quota_edit_uses_existing_spend_and_settlement_is_idempotent(quota):
    event = await quota.check_and_start(running(model=4), monthly_token_limit=1000)
    settled = terminal(event, 50)
    await quota.record_usage(settled, 1)
    await quota.record_usage(settled, 1)
    assert (await quota.read_usage(2, 20, "2026-09"))["used"] == 950
    with pytest.raises(QuotaRejected, match="quota_exceeded"):
        await quota.check_and_start(running(model=5), monthly_token_limit=940)
    assert (await quota.check_and_start(running(model=5), monthly_token_limit=2000)).status == "RUNNING"
