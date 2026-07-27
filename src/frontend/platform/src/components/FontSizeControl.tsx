import * as SliderPrimitive from "@radix-ui/react-slider";
import { Check } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "@/components/bs-ui/toast/use-toast";
import { userContext } from "@/contexts/userContext";
import { saveFontScalePreference } from "@/controllers/API/user";
import { cn } from "@/utils";
import {
    applyFontScaleLevel,
    FONT_SCALE_CHANGE_EVENT,
    getFontSizeVariant,
    normalizeFontScaleLevel,
    readAppliedFontScaleLevel,
    type FontScaleLevel,
} from "@/utils/fontScale";

const STANDARD_LEVELS: FontScaleLevel[] = [1, 2, 3, 4, 5, 6, 7];
const COFCO_LEVELS: Array<{ level: FontScaleLevel; labelKey: string }> = [
    { level: 1, labelKey: "menu.fontSizeSmall" },
    { level: 3, labelKey: "menu.fontSizeStandard" },
    { level: 5, labelKey: "menu.fontSizeLarge" },
];

export function FontSizeControl({ className }: { className?: string }) {
    const { user } = useContext(userContext);
    const { t } = useTranslation();
    const [level, setLevel] = useState<FontScaleLevel>(() => readAppliedFontScaleLevel());
    const currentLevelRef = useRef(level);
    const committedLevelRef = useRef(level);
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const variant = getFontSizeVariant();

    useEffect(() => {
        const syncLevel = (event: Event) => {
            const next = normalizeFontScaleLevel(
                (event as CustomEvent<{ level: number }>).detail?.level
            );
            currentLevelRef.current = next;
            setLevel(next);
        };
        window.addEventListener(FONT_SCALE_CHANGE_EVENT, syncLevel);
        return () => window.removeEventListener(FONT_SCALE_CHANGE_EVENT, syncLevel);
    }, []);

    const previewLevel = (next: FontScaleLevel) => {
        currentLevelRef.current = next;
        setLevel(next);
        applyFontScaleLevel(next, user?.user_id);
    };

    const commitLevel = (next: FontScaleLevel) => {
        previewLevel(next);
        saveQueueRef.current = saveQueueRef.current
            .catch(() => undefined)
            .then(async () => {
                try {
                    const response = await saveFontScalePreference(next);
                    const savedLevel = normalizeFontScaleLevel(response.font_scale_level);
                    committedLevelRef.current = savedLevel;
                    if (currentLevelRef.current === next && savedLevel !== next) {
                        previewLevel(savedLevel);
                    }
                } catch {
                    if (currentLevelRef.current === next) {
                        previewLevel(committedLevelRef.current);
                    }
                    toast({
                        title: t("prompt"),
                        description: t("menu.fontSizeSaveFailed"),
                        variant: "error",
                    });
                }
            });
    };

    if (variant === "cofco") {
        return (
            <div className={cn("w-full p-1", className)}>
                <div className="space-y-1">
                    {COFCO_LEVELS.map((item) => (
                        <button
                            key={item.level}
                            type="button"
                            className={cn(
                                "flex min-h-[var(--bs-row-height)] w-full items-center rounded-lg px-3 text-left",
                                "text-[length:var(--bs-ui-font-size)] leading-[var(--bs-ui-line-height)]",
                                "outline-none transition-colors hover:bg-[#f2f3f5] active:bg-[#e5e6eb]"
                            )}
                            onClick={() => commitLevel(item.level)}
                        >
                            <span className="flex-1">{t(item.labelKey)}</span>
                            {level === item.level ? (
                                <Check className="bisheng-scalable-icon text-blue-500" aria-hidden />
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("w-[256px] px-3 py-3", className)}>
            <p className="mb-3 text-[length:var(--bs-ui-font-size)] font-medium leading-[var(--bs-ui-line-height)] text-[#1d2129] dark:text-gray-50">
                {t("menu.fontSizeDrag")}
            </p>
            <SliderPrimitive.Root
                className="relative flex h-8 w-full touch-none select-none items-center"
                min={1}
                max={7}
                step={1}
                value={[level]}
                aria-label={t("menu.fontSize")}
                onValueChange={([next]) => previewLevel(normalizeFontScaleLevel(next))}
                onValueCommit={([next]) => commitLevel(normalizeFontScaleLevel(next))}
            >
                <SliderPrimitive.Track className="relative h-1 grow rounded-full bg-[#e5e6eb]">
                    <SliderPrimitive.Range className="absolute h-full rounded-full bg-blue-500" />
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
                        {STANDARD_LEVELS.map((tick) => (
                            <span
                                key={tick}
                                className={cn(
                                    "h-3 w-px",
                                    tick <= level ? "bg-blue-500" : "bg-[#c9cdd4]"
                                )}
                            />
                        ))}
                    </div>
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb
                    className={cn(
                        "block size-4 rounded-full border-2 border-blue-500 bg-white shadow-sm",
                        "outline-none transition-transform duration-100 hover:scale-110",
                        "focus-visible:ring-2 focus-visible:ring-blue-200 active:scale-95"
                    )}
                />
            </SliderPrimitive.Root>
            <div className="mt-1 flex justify-between text-[length:var(--bs-aux-font-size)] leading-[var(--bs-aux-line-height)] text-[#86909c]">
                <span>{t("menu.fontSizeSmall")}</span>
                <span>{t("menu.fontSizeLarge")}</span>
            </div>
        </div>
    );
}
