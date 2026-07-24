export type FontScaleLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DEFAULT_FONT_SCALE_LEVEL: FontScaleLevel = 3;
export const FONT_SCALE_CHANGE_EVENT = 'bisheng:font-scale-change';

export const FONT_SCALE_LAYOUT = {
  1: { primarySidebar: 56, secondarySidebar: 224 },
  2: { primarySidebar: 60, secondarySidebar: 232 },
  3: { primarySidebar: 64, secondarySidebar: 240 },
  4: { primarySidebar: 64, secondarySidebar: 248 },
  5: { primarySidebar: 68, secondarySidebar: 256 },
  6: { primarySidebar: 68, secondarySidebar: 264 },
  7: { primarySidebar: 72, secondarySidebar: 272 },
} satisfies Record<FontScaleLevel, { primarySidebar: number; secondarySidebar: number }>;

export function normalizeFontScaleLevel(value: unknown): FontScaleLevel {
  const level = Number(value);
  if (Number.isInteger(level) && level >= 1 && level <= 7) {
    return level as FontScaleLevel;
  }
  return DEFAULT_FONT_SCALE_LEVEL;
}

export function fontScaleStorageKey(userId: string | number): string {
  return `bisheng:font-scale:${userId}`;
}

export function applyFontScaleLevel(value: unknown, userId?: string | number): FontScaleLevel {
  const level = normalizeFontScaleLevel(value);
  document.documentElement.dataset.bishengFontScale = String(level);
  if (userId !== undefined && userId !== null && String(userId)) {
    try {
      localStorage.setItem(fontScaleStorageKey(userId), String(level));
    } catch {
      // Storage is a best-effort first-paint cache; the server remains authoritative.
    }
  }
  window.dispatchEvent(new CustomEvent(FONT_SCALE_CHANGE_EVENT, { detail: { level } }));
  return level;
}

export function readAppliedFontScaleLevel(): FontScaleLevel {
  return normalizeFontScaleLevel(document.documentElement.dataset.bishengFontScale);
}

export function getFontSizeVariant(): 'standard' | 'cofco' {
  return window.APP_CONFIG?.fontSizeVariant === 'cofco' ? 'cofco' : 'standard';
}
