export type FontScaleLevel = 1 | 3 | 5;

export const DEFAULT_FONT_SCALE_LEVEL: FontScaleLevel = 3;
export const FONT_SCALE_CHANGE_EVENT = 'bisheng:font-scale-change';
export const DISPLAY_SCALE_BY_LEVEL: Record<FontScaleLevel, number> = {
    1: 0.9,
    3: 1,
    5: 1.1,
};

export function normalizeFontScaleLevel(value: unknown): FontScaleLevel {
    const level = Number(value);
    if (!Number.isInteger(level) || level < 1 || level > 7) {
        return DEFAULT_FONT_SCALE_LEVEL;
    }
    if (level <= 2) return 1;
    if (level <= 4) return 3;
    return 5;
}

export function applyFontScaleLevel(value: unknown, userId?: string | number): FontScaleLevel {
    if (!isFontSizeEnabled()) {
        document.documentElement.removeAttribute("data-bisheng-font-scale");
        document.documentElement.removeAttribute("data-bisheng-display-scale");
        document.documentElement.style.removeProperty("--bisheng-display-zoom");
        return DEFAULT_FONT_SCALE_LEVEL;
    }

    const level = normalizeFontScaleLevel(value);
    document.documentElement.removeAttribute("data-bisheng-font-scale");
    document.documentElement.dataset.bishengDisplayScale = String(level);
    document.documentElement.style.setProperty(
        "--bisheng-display-zoom",
        String(DISPLAY_SCALE_BY_LEVEL[level])
    );
    if (userId !== undefined && userId !== null && String(userId)) {
        try {
            localStorage.setItem(`bisheng:font-scale:${userId}`, String(level));
        } catch {
            // Storage is only a first-paint cache; the server remains authoritative.
        }
    }
    window.dispatchEvent(new CustomEvent(FONT_SCALE_CHANGE_EVENT, { detail: { level } }));
    return level;
}

export function readAppliedFontScaleLevel(): FontScaleLevel {
    return normalizeFontScaleLevel(document.documentElement.dataset.bishengDisplayScale);
}

export function getFontSizeVariant(): "disabled" | "cofco" {
    return window.APP_CONFIG?.fontSizeVariant === "cofco" ? "cofco" : "disabled";
}

export function isFontSizeEnabled(): boolean {
    return (
        getFontSizeVariant() === "cofco" &&
        (typeof window === "undefined" || window.innerWidth >= 768)
    );
}
