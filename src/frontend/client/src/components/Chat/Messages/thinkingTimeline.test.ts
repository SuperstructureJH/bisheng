import type { AgentEvent } from "~/api/chatApi";
import {
    buildThinkingTimeline,
    thinkingActivityText,
} from "./thinkingTimeline";

const thinking = (
    content: string,
    extra: Partial<Extract<AgentEvent, { type: "thinking" }>> = {},
): Extract<AgentEvent, { type: "thinking" }> => ({
    type: "thinking",
    content,
    ...extra,
});

const tool = (
    id: string,
    extra: Partial<Extract<AgentEvent, { type: "tool_call" }>> = {},
): Extract<AgentEvent, { type: "tool_call" }> => ({
    type: "tool_call",
    tool_call_id: id,
    tool_name: "web_search",
    tool_type: "web",
    ...extra,
});

describe("thinkingTimeline", () => {
    it("preserves thinking → tool → thinking order", () => {
        const segments = buildThinkingTimeline([
            thinking("思考 A"),
            tool("search-1"),
            thinking("思考 B"),
        ]);

        expect(segments.map((segment) => segment.kind)).toEqual([
            "thinking",
            "tool",
            "thinking",
        ]);
        expect(segments[0]).toMatchObject({ reasoning: "思考 A" });
        expect(segments[2]).toMatchObject({ reasoning: "思考 B" });
    });

    it("merges only adjacent thinking events", () => {
        const segments = buildThinkingTimeline([
            thinking("第一段"),
            thinking("第二段"),
            tool("search-1"),
            thinking("第三段"),
            thinking("第四段"),
        ]);

        expect(segments).toHaveLength(3);
        expect(segments[0]).toMatchObject({ reasoning: "第一段\n\n第二段" });
        expect(segments[2]).toMatchObject({ reasoning: "第三段\n\n第四段" });
    });

    it("shows the current inflight tool below the fixed group header", () => {
        expect(
            thinkingActivityText(
                [
                    thinking("先分析"),
                    tool("search-1", {
                        inflight: true,
                        started_at: 1200,
                    }),
                ],
                true,
            ),
        ).toBe("正在联网搜索");
    });

    it("keeps the progress running while parallel tools are still inflight", () => {
        expect(
            thinkingActivityText(
                [
                    tool("search-1", {
                        inflight: true,
                        started_at: 1200,
                    }),
                    tool("search-2", {
                        inflight: false,
                        started_at: 1200,
                        ended_at: 1400,
                    }),
                ],
                true,
            ),
        ).toBe("正在联网搜索");
    });

    it("summarises completed tool steps for collapsed history", () => {
        expect(
            thinkingActivityText(
                [
                    thinking("先分析"),
                    tool("search-1", { ended_at: 1400 }),
                    tool("search-2", { ended_at: 1500 }),
                    thinking("形成结论"),
                ],
                false,
            ),
        ).toBe("已完成 2 次联网搜索");
    });
});
