import { fireEvent, render, screen, within } from "@testing-library/react";
import { RecoilRoot } from "recoil";
import type { AgentEvent } from "~/api/chatApi";
import DeepThinkingGroup from "./DeepThinkingGroup";

const events: AgentEvent[] = [
    {
        type: "thinking",
        content: "思考 A。",
        started_at: 1000,
        ended_at: 1200,
    },
    {
        type: "tool_call",
        tool_call_id: "search-1",
        tool_name: "web_search",
        tool_type: "web",
        inflight: false,
        started_at: 1200,
        ended_at: 1400,
    },
    {
        type: "thinking",
        content: "思考 B。",
        started_at: 1400,
        ended_at: 1600,
    },
];

describe("DeepThinkingGroup", () => {
    it("starts collapsed without an outer thought summary and expands in event order", () => {
        render(
            <RecoilRoot>
                <DeepThinkingGroup events={events} isStreaming={false} />
            </RecoilRoot>,
        );

        const trigger = screen.getByRole("button", { name: /已深入思考/ });
        const group = trigger.parentElement;
        const fold = group?.lastElementChild as HTMLElement;

        expect(screen.getByText("已完成 1 次联网搜索")).toBeInTheDocument();
        expect(screen.queryByTitle("思考 B。")).not.toBeInTheDocument();
        expect(fold).toHaveStyle({ gridTemplateRows: "0fr" });

        fireEvent.click(trigger);
        expect(fold).toHaveStyle({ gridTemplateRows: "1fr" });

        const timelineText = fold.textContent || "";
        expect(timelineText.indexOf("思考 A。")).toBeLessThan(
            timelineText.indexOf("已联网搜索"),
        );
        expect(timelineText.indexOf("已联网搜索")).toBeLessThan(
            timelineText.indexOf("思考 B。"),
        );
    });

    it("keeps the main label static and puts the only spinner on the current tool", () => {
        const streamingEvents: AgentEvent[] = [
            events[0],
            {
                ...events[1],
                inflight: true,
                ended_at: undefined,
            },
        ];
        render(
            <RecoilRoot>
                <DeepThinkingGroup events={streamingEvents} isStreaming />
            </RecoilRoot>,
        );

        const trigger = screen.getByRole("button", { name: /正在深入思考/ });
        expect(screen.getByTestId("thinking-group-label")).not.toHaveTextContent(
            "正在联网搜索",
        );
        expect(within(trigger).getByText("正在联网搜索")).toBeInTheDocument();
        expect(trigger.querySelector(".animate-spin")).not.toBeInTheDocument();

        fireEvent.click(trigger);
        const group = trigger.parentElement as HTMLElement;
        expect(group.querySelectorAll(".animate-spin")).toHaveLength(1);
    });

    it("does not show a spinner while the model is only thinking", () => {
        render(
            <RecoilRoot>
                <DeepThinkingGroup
                    events={[
                        {
                            type: "thinking",
                            content: "正在分析问题。",
                            started_at: 1000,
                        },
                    ]}
                    isStreaming
                />
            </RecoilRoot>,
        );

        const trigger = screen.getByRole("button", { name: /正在深入思考/ });
        fireEvent.click(trigger);

        const group = trigger.parentElement as HTMLElement;
        expect(group.querySelector(".animate-spin")).not.toBeInTheDocument();
    });
});
