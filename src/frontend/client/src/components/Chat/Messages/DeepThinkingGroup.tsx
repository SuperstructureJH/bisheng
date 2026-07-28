/**
 * DeepThinkingGroup — the single fold for one daily-mode reasoning episode.
 * The collapsed shell keeps a stable group status. Expanding reveals thinking
 * and tool events in their original order.
 */
import { Outlined } from "bisheng-icons";
import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FC,
    type MouseEvent,
} from "react";
import type { AgentEvent } from "~/api/chatApi";
import { cn, formatSeconds } from "~/utils";
import ThinkingContent from "./ThinkingContent";
import ToolCallDisplay from "./ToolCallDisplay";
import {
    buildThinkingTimeline,
    thinkingActivityText,
} from "./thinkingTimeline";

const BUTTON_STYLES = {
    base: "group flex max-w-full w-fit items-start gap-2 text-sm font-medium leading-[22px] text-[#212121]",
    icon: "shrink-0 transform-gpu text-[#999999] transition-transform duration-200",
} as const;

const ACTIVITY_TRANSITION_MS = 500;

function ActivityTicker({ text }: { text: string }) {
    const [displayed, setDisplayed] = useState(text);
    const [leaving, setLeaving] = useState("");
    const [cycle, setCycle] = useState(0);
    const previousRef = useRef(text);

    useEffect(() => {
        if (!text || text === previousRef.current) return;
        setLeaving(previousRef.current);
        previousRef.current = text;
        setDisplayed(text);
        setCycle((value) => value + 1);

        const timer = window.setTimeout(
            () => setLeaving(""),
            ACTIVITY_TRANSITION_MS,
        );
        return () => window.clearTimeout(timer);
    }, [text]);

    if (!displayed && !leaving) return null;

    return (
        <span
            className="relative block h-5 max-w-[520px] overflow-hidden text-left text-xs font-normal leading-5 text-[#999999]"
            aria-live="polite"
        >
            {leaving && (
                <span
                    key={`out-${cycle}`}
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 block animate-narration-out truncate motion-reduce:animate-none"
                >
                    {leaving}
                </span>
            )}
            <span
                key={`in-${cycle}`}
                className="block animate-narration-in truncate motion-reduce:animate-none"
            >
                {displayed}
            </span>
        </span>
    );
}

export interface DeepThinkingGroupProps {
    /** Ordered events in this group — only thinking + tool_call entries. */
    events: AgentEvent[];
    /** True if this group is the currently-open trailing run. */
    isStreaming: boolean;
}

/** Pick the earliest started_at across events; fall back to undefined. */
function groupStart(events: AgentEvent[]): number | undefined {
    let earliest: number | undefined;
    for (const ev of events) {
        if (ev.type === "thinking" || ev.type === "tool_call") {
            if (ev.started_at != null && (earliest == null || ev.started_at < earliest)) {
                earliest = ev.started_at;
            }
        }
    }
    return earliest;
}

/** Pick the latest ended_at across events. */
function groupEnd(events: AgentEvent[]): number | undefined {
    let latest: number | undefined;
    for (const ev of events) {
        if (ev.type === "thinking" || ev.type === "tool_call") {
            if (ev.ended_at != null && (latest == null || ev.ended_at > latest)) {
                latest = ev.ended_at;
            }
        }
    }
    return latest;
}

/** Fallback: sum duration_ms when wall-clock fields aren't on legacy rows. */
function durationFallback(events: AgentEvent[]): number {
    let sum = 0;
    for (const ev of events) {
        if (ev.type === "thinking" || ev.type === "tool_call") {
            sum += ev.duration_ms ?? 0;
        }
    }
    return sum;
}

const DeepThinkingGroup: FC<DeepThinkingGroupProps> = memo(
    ({ events, isStreaming }) => {
        // Daily mode follows the same quiet entry as task mode: the complete
        // process starts collapsed while the group status remains visible.
        const [isExpanded, setIsExpanded] = useState(false);

        const start = groupStart(events);
        const end = groupEnd(events);

        // Live-tick while streaming so the header counter advances every 100ms.
        const [tick, setTick] = useState(0);
        useEffect(() => {
            if (!isStreaming) return;
            const id = window.setInterval(() => setTick((t) => t + 1), 100);
            return () => window.clearInterval(id);
        }, [isStreaming]);

        const elapsedMs = (() => {
            if (start == null) return durationFallback(events);
            // For closed groups with no end_at, fall back to the per-event sum
            // so the label doesn't creep upward against Date.now().
            if (!isStreaming && end == null) return durationFallback(events);
            const stop = isStreaming ? Date.now() : end!;
            return Math.max(0, stop - start);
        })();
        // `tick` is read here so the IIFE re-runs on every interval render.
        void tick;

        const label = (() => {
            // Hide the duration entirely when it's 0 — happens on legacy
            // history rows (no started_at/ended_at/duration_ms) and the
            // brief moment before any tick lands.
            const showDuration = elapsedMs > 0;
            if (isStreaming) {
                return showDuration
                    ? `正在深入思考（已用 ${formatSeconds(elapsedMs)} 秒）...`
                    : "正在深入思考...";
            }
            return showDuration
                ? `已深入思考（用时 ${formatSeconds(elapsedMs)} 秒）`
                : "已深入思考";
        })();

        const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
        }, []);

        const timeline = useMemo(() => buildThinkingTimeline(events), [events]);
        const activityText = useMemo(
            () => thinkingActivityText(events, isStreaming),
            [events, isStreaming],
        );

        return (
            <div className="flex w-full min-w-0 flex-col gap-3">
                <button
                    type="button"
                    onClick={handleClick}
                    aria-expanded={isExpanded}
                    className={cn(BUTTON_STYLES.base, isStreaming && "animate-pulse")}
                >
                    <span className="mt-[3px] flex size-4 shrink-0 items-center justify-center">
                        {isStreaming ? (
                            <Outlined.Loading
                                size={16}
                                className="animate-spin text-primary"
                            />
                        ) : (
                            <Outlined.Bulb size={16} className="text-[#999999]" />
                        )}
                    </span>
                    <span className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1">
                            <span data-testid="thinking-group-label">{label}</span>
                            <Outlined.Down
                                size={16}
                                className={cn(
                                    BUTTON_STYLES.icon,
                                    !isExpanded && "-rotate-90",
                                )}
                            />
                        </span>
                        <ActivityTicker text={activityText} />
                    </span>
                </button>
                <div
                    className="grid transition-all duration-300 ease-out"
                    style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                >
                    <div className="overflow-hidden flex flex-col gap-2">
                        {timeline.map((segment, index) => {
                            const showConnector = index < timeline.length - 1;
                            if (segment.kind === "thinking") {
                                return (
                                    <ThinkingContent
                                        key={segment.key}
                                        reasoning={segment.reasoning}
                                        showConnector={showConnector}
                                        timeline
                                        active={
                                            isStreaming &&
                                            index === timeline.length - 1
                                        }
                                    />
                                );
                            }
                            return (
                                <ToolCallDisplay
                                    key={segment.key}
                                    toolCall={segment.toolCall}
                                    showConnector={showConnector}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    },
);

DeepThinkingGroup.displayName = "DeepThinkingGroup";

export default DeepThinkingGroup;
