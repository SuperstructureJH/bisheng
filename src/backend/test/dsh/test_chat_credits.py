from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult

from bisheng.dsh.domain.schemas.contracts import DshTokenUsage
from bisheng.dsh.domain.services import chat_credits


@pytest.fixture
def accounting(monkeypatch):
    execution = SimpleNamespace(usage=DshTokenUsage(), provider_request_id=None)
    state = (None, None, execution)
    start = AsyncMock(return_value=state)
    finish = AsyncMock()
    monkeypatch.setattr(chat_credits, "governed", lambda model: True)
    monkeypatch.setattr(chat_credits, "start", start)
    monkeypatch.setattr(chat_credits, "finish", finish)
    return start, finish, execution


async def test_normal_generation_settles_once_with_exact_usage(accounting):
    start, finish, execution = accounting

    @chat_credits.account_async
    async def generate(model):
        return ChatResult(
            generations=[
                ChatGeneration(
                    message=AIMessage(
                        content="ok",
                        usage_metadata={
                            "input_tokens": 12,
                            "output_tokens": 7,
                            "total_tokens": 19,
                        },
                    )
                )
            ]
        )

    await generate(object())
    start.assert_awaited_once()
    finish.assert_awaited_once()
    assert finish.await_args.args[1] is True
    assert execution.usage.total_tokens == 19


async def test_stream_consumes_final_usage_and_closes_on_cancel(accounting):
    _start, finish, execution = accounting
    closed = []

    @chat_credits.account_async_stream
    async def stream(model):
        try:
            yield ChatGenerationChunk(message=AIMessageChunk(content="first"))
            yield ChatGenerationChunk(
                message=AIMessageChunk(
                    content="",
                    usage_metadata={
                        "input_tokens": 12,
                        "output_tokens": 7,
                        "total_tokens": 19,
                    },
                )
            )
        finally:
            closed.append(True)

    assert len([part async for part in stream(object())]) == 2
    assert execution.usage.total_tokens == 19
    finish.assert_awaited_once()
    finish.reset_mock()
    iterator = stream(object())
    await anext(iterator)
    await iterator.aclose()
    assert len(closed) == 2
    finish.assert_awaited_once()
    assert finish.await_args.args[1] is False


async def test_upstream_failure_is_settled_and_admission_failure_skips_provider(accounting):
    start, finish, execution = accounting
    calls = []

    @chat_credits.account_async
    async def generate(model):
        calls.append(True)
        raise RuntimeError("provider failed")

    with pytest.raises(RuntimeError, match="provider failed"):
        await generate(object())
    assert execution.usage.total_tokens is None
    finish.assert_awaited_once()
    start.side_effect = ValueError("quota exhausted")
    finish.reset_mock()
    with pytest.raises(ValueError, match="quota exhausted"):
        await generate(object())
    assert calls == [True]
    finish.assert_not_awaited()


def test_streaming_usage_accumulates_input_and_output_chunks():
    from bisheng.dsh.infrastructure.chat_adapter import accumulate_usage

    first = AIMessageChunk(content="", usage_metadata={"input_tokens": 120, "output_tokens": 0, "total_tokens": 120})
    last = AIMessageChunk(content="", usage_metadata={"input_tokens": 0, "output_tokens": 19, "total_tokens": 19})
    usage = accumulate_usage(accumulate_usage(DshTokenUsage(), first), last)
    assert (usage.input_tokens, usage.output_tokens, usage.total_tokens) == (120, 19, 139)
