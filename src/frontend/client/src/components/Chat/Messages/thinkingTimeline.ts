import type { AgentEvent, AgentToolCall } from "~/api/chatApi";

export type ThinkingTimelineSegment =
    | {
          kind: "thinking";
          key: string;
          reasoning: string;
      }
    | {
          kind: "tool";
          key: string;
          toolCall: AgentToolCall;
      };

/**
 * Preserve AgentEvent order while folding only adjacent thinking passages.
 * A tool boundary always starts a new thinking segment after it.
 */
export function buildThinkingTimeline(events: AgentEvent[]): ThinkingTimelineSegment[] {
    const segments: ThinkingTimelineSegment[] = [];

    events.forEach((event, index) => {
        if (event.type === "text") return;

        if (event.type === "thinking") {
            const previous = segments[segments.length - 1];
            if (previous?.kind === "thinking") {
                previous.reasoning = [previous.reasoning, event.content]
                    .filter(Boolean)
                    .join("\n\n");
                return;
            }
            segments.push({
                kind: "thinking",
                key: `thinking-${index}`,
                reasoning: event.content,
            });
            return;
        }

        segments.push({
            kind: "tool",
            key: event.tool_call_id || `tool-${index}`,
            toolCall: event,
        });
    });

    return segments;
}

type ToolActivityKind = "web" | "knowledge" | "tool";

function toolActivityKind(toolCall: AgentToolCall): ToolActivityKind {
    if (toolCall.tool_type === "web") return "web";
    if (toolCall.tool_type === "knowledge") return "knowledge";

    const name = (toolCall.tool_name || "").toLowerCase();
    if (name === "web_search" || name.includes("web_search")) return "web";
    if (name.includes("knowledge") || name.includes("retrieval") || name.includes("kb")) {
        return "knowledge";
    }
    return "tool";
}

function toolActivityText(
    toolCall: AgentToolCall,
    state: "running" | "done" | "failed",
): string {
    const kind = toolActivityKind(toolCall);
    if (kind === "web") {
        if (state === "running") return "正在联网搜索";
        return state === "failed" ? "联网搜索失败" : "已完成联网搜索";
    }
    if (kind === "knowledge") {
        if (state === "running") return "正在检索知识";
        return state === "failed" ? "知识检索失败" : "已完成知识检索";
    }

    const name = toolCall.display_name || toolCall.tool_name || "工具";
    if (state === "running") return `正在调用工具：${name}`;
    return state === "failed"
        ? `工具调用失败：${name}`
        : `已完成工具调用：${name}`;
}

function completedActivitySummary(events: AgentEvent[]): string {
    const counts: Record<ToolActivityKind, number> = {
        web: 0,
        knowledge: 0,
        tool: 0,
    };

    for (const event of events) {
        if (event.type === "tool_call") counts[toolActivityKind(event)] += 1;
    }

    const parts: string[] = [];
    if (counts.web > 0) parts.push(`${counts.web} 次联网搜索`);
    if (counts.knowledge > 0) parts.push(`${counts.knowledge} 次知识检索`);
    if (counts.tool > 0) parts.push(`${counts.tool} 次工具调用`);
    return parts.length > 0 ? `已完成 ${parts.join(" · ")}` : "思考过程已完成";
}

/**
 * Return the quiet, single-line progress narration shown below the fixed
 * daily-mode header. The header never changes to a tool label; this text does.
 */
export function thinkingActivityText(
    events: AgentEvent[],
    isStreaming: boolean,
): string {
    if (!isStreaming) return completedActivitySummary(events);

    const nonTextEvents = events.filter(
        (event): event is Exclude<AgentEvent, { type: "text" }> =>
            event.type !== "text",
    );
    const inflightTool = [...nonTextEvents]
        .reverse()
        .find(
            (
                event,
            ): event is Extract<AgentEvent, { type: "tool_call" }> =>
                event.type === "tool_call" &&
                (event.inflight === true || event.ended_at == null),
        );
    if (inflightTool) return toolActivityText(inflightTool, "running");

    const latest = nonTextEvents[nonTextEvents.length - 1];
    if (!latest) return "正在准备";
    if (latest.type === "tool_call") {
        return toolActivityText(latest, latest.error ? "failed" : "done");
    }

    const previousTool = [...nonTextEvents]
        .slice(0, -1)
        .reverse()
        .find(
            (
                event,
            ): event is Extract<AgentEvent, { type: "tool_call" }> =>
                event.type === "tool_call",
        );
    if (!previousTool) return "正在分析问题";

    const previousKind = toolActivityKind(previousTool);
    if (previousKind === "web") return "正在整理搜索结果并继续思考";
    if (previousKind === "knowledge") return "正在整理知识检索结果并继续思考";
    return "正在处理工具结果并继续思考";
}
