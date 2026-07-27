import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyFontScaleLevel,
  normalizeFontScaleLevel,
  readAppliedFontScaleLevel,
} from "@/utils/fontScale";

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
    [1, "0.9"],
    [3, "1"],
    [5, "1.1"],
  ] as const)("applies level %s as whole-page zoom %s", (level, zoom) => {
    applyFontScaleLevel(level, 7);

    expect(document.documentElement.style.getPropertyValue("--bisheng-display-zoom")).toBe(zoom);
    expect(document.documentElement.dataset.bishengDisplayScale).toBe(String(level));
    expect(readAppliedFontScaleLevel()).toBe(level);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "bisheng:font-scale:7",
      String(level),
    );
  });

  it("removes display zoom when the edition does not enable the feature", () => {
    applyFontScaleLevel(5, 7);
    window.APP_CONFIG = { fontSizeVariant: "disabled" };

    applyFontScaleLevel(5, 7);

    expect(document.documentElement.style.getPropertyValue("--bisheng-display-zoom")).toBe("");
    expect(document.documentElement.dataset.bishengDisplayScale).toBeUndefined();
    expect(readAppliedFontScaleLevel()).toBe(3);
  });
});
