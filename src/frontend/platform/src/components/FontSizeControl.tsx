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
    normalizeFontScaleLevel,
    readAppliedFontScaleLevel,
    type FontScaleLevel,
} from "@/utils/fontScale";

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

    const selectLevel = (next: FontScaleLevel) => {
        currentLevelRef.current = next;
        setLevel(next);
        applyFontScaleLevel(next, user?.user_id);
    };

    const commitLevel = (next: FontScaleLevel) => {
        selectLevel(next);
        saveQueueRef.current = saveQueueRef.current
            .catch(() => undefined)
            .then(async () => {
                try {
                    const response = await saveFontScalePreference(next);
                    const savedLevel = normalizeFontScaleLevel(response.font_scale_level);
                    committedLevelRef.current = savedLevel;
                    if (currentLevelRef.current === next && savedLevel !== next) {
                        selectLevel(savedLevel);
                    }
                } catch {
                    if (currentLevelRef.current === next) {
                        selectLevel(committedLevelRef.current);
                    }
                    toast({
                        title: t("prompt"),
                        description: t("menu.fontSizeSaveFailed"),
                        variant: "error",
                    });
                }
            });
    };

    return (
        <div className={cn("w-full p-1", className)}>
            <div className="space-y-1">
                {COFCO_LEVELS.map((item) => (
                    <button
                        key={item.level}
                        type="button"
                        className={cn(
                            "flex h-9 w-full items-center rounded-lg px-3 text-left text-sm",
                            "outline-none transition-colors hover:bg-[#f2f3f5] active:bg-[#e5e6eb]"
                        )}
                        onClick={() => commitLevel(item.level)}
                    >
                        <span className="flex-1">{t(item.labelKey)}</span>
                        {level === item.level ? (
                            <Check className="size-4 text-blue-500" aria-hidden />
                        ) : null}
                    </button>
                ))}
            </div>
        </div>
    );
}
