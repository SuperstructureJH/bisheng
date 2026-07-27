import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyFontScaleLevel,
  normalizeFontScaleLevel,
  readAppliedFontScaleLevel,
} from "@/utils/fontScale";

const platformRoot = join(__dirname, "..", "..");

describe("COFCO display size", () => {
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    window.APP_CONFIG = { fontSizeVariant: "cofco" };
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440,
    });
    document.documentElement.removeAttribute("data-bisheng-font-scale");
    document.documentElement.removeAttribute("data-bisheng-display-scale");
    document.documentElement.style.removeProperty("--bisheng-display-zoom");
    document.documentElement.style.removeProperty("--bisheng-display-scale");
    document.documentElement.style.removeProperty("--bisheng-display-viewport-width");
    document.documentElement.style.removeProperty("--bisheng-display-viewport-height");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
    localStorage.clear();
  });

  it.each([
    [1, 1],
    [2, 1],
    [3, 3],
    [4, 3],
    [5, 5],
    [6, 5],
    [7, 5],
    [8, 3],
  ])("normalizes legacy level %s to %s", (input, expected) => {
    expect(normalizeFontScaleLevel(input)).toBe(expected);
  });

  it.each([
    [1, "0.9", "111.111111vw", "111.111111dvh"],
    [3, "1", "100vw", "100dvh"],
    [5, "1.1", "90.909091vw", "90.909091dvh"],
  ] as const)("applies level %s as application scale %s", (level, scale, width, height) => {
    applyFontScaleLevel(level, 7);

    expect(document.documentElement.style.getPropertyValue("--bisheng-display-scale")).toBe(scale);
    expect(
      document.documentElement.style.getPropertyValue("--bisheng-display-viewport-width")
    ).toBe(width);
    expect(
      document.documentElement.style.getPropertyValue("--bisheng-display-viewport-height")
    ).toBe(height);
    expect(document.documentElement.style.getPropertyValue("--bisheng-display-zoom")).toBe("");
    expect(document.documentElement.dataset.bishengDisplayScale).toBe(String(level));
    expect(readAppliedFontScaleLevel()).toBe(level);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "bisheng:font-scale:7",
      String(level),
    );
  });

  it("removes the display layer when the edition does not enable the feature", () => {
    applyFontScaleLevel(5, 7);
    window.APP_CONFIG = { fontSizeVariant: "disabled" };

    applyFontScaleLevel(5, 7);

    expect(document.documentElement.style.getPropertyValue("--bisheng-display-scale")).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--bisheng-display-viewport-width")
    ).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--bisheng-display-viewport-height")
    ).toBe("");
    expect(document.documentElement.dataset.bishengDisplayScale).toBeUndefined();
    expect(readAppliedFontScaleLevel()).toBe(3);
  });

  it("keeps the browser viewport physical and scales a compensated body layer", () => {
    const css = readFileSync(join(platformRoot, "src/style/fontScale.css"), "utf8");

    expect(css).not.toMatch(/html\[data-bisheng-display-scale\]\s*\{\s*zoom:/);
    expect(css).toMatch(
      /html\[data-bisheng-display-scale\]\s+body\s*\{[\s\S]*?transform:\s*scale\(var\(--bisheng-display-scale,\s*1\)\)/
    );
    expect(css).toMatch(
      /height:\s*var\(--bisheng-display-viewport-height,\s*100dvh\)\s*!important/
    );
  });
});
