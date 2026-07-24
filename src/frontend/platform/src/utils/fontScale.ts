export type FontScaleLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DEFAULT_FONT_SCALE_LEVEL: FontScaleLevel = 3;

function normalizeFontScaleLevel(value: unknown): FontScaleLevel {
    const level = Number(value);
    if (Number.isInteger(level) && level >= 1 && level <= 7) {
        return level as FontScaleLevel;
    }
    return DEFAULT_FONT_SCALE_LEVEL;
}

export function applyFontScaleLevel(value: unknown, userId?: string | number): FontScaleLevel {
    const level = normalizeFontScaleLevel(value);
    document.documentElement.dataset.bishengFontScale = String(level);
    if (userId !== undefined && userId !== null && String(userId)) {
        try {
            localStorage.setItem(`bisheng:font-scale:${userId}`, String(level));
        } catch {
            // Storage is only a first-paint cache; the server remains authoritative.
        }
    }
    window.dispatchEvent(new CustomEvent('bisheng:font-scale-change', { detail: { level } }));
    return level;
}
