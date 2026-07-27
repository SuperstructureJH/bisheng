import {
  applyFontScaleLevel,
  normalizeFontScaleLevel,
  readAppliedFontScaleLevel,
} from './fontScale';

describe('COFCO display size', () => {
  beforeEach(() => {
    window.APP_CONFIG = { fontSizeVariant: 'cofco' };
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
    });
    document.documentElement.removeAttribute('data-bisheng-font-scale');
    document.documentElement.removeAttribute('data-bisheng-display-scale');
    document.documentElement.style.removeProperty('--bisheng-display-zoom');
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
  ])('normalizes legacy level %s to %s', (input, expected) => {
    expect(normalizeFontScaleLevel(input)).toBe(expected);
  });

  it.each([
    [1, '0.9'],
    [3, '1'],
    [5, '1.1'],
  ] as const)('applies level %s as whole-page zoom %s', (level, zoom) => {
    applyFontScaleLevel(level, 7);

    expect(document.documentElement.style.getPropertyValue('--bisheng-display-zoom')).toBe(zoom);
    expect(document.documentElement.dataset.bishengDisplayScale).toBe(String(level));
    expect(readAppliedFontScaleLevel()).toBe(level);
    expect(localStorage.getItem('bisheng:font-scale:7')).toBe(String(level));
  });

  it('removes display zoom when the edition does not enable the feature', () => {
    applyFontScaleLevel(5, 7);
    window.APP_CONFIG = { fontSizeVariant: 'disabled' };

    applyFontScaleLevel(5, 7);

    expect(document.documentElement.style.getPropertyValue('--bisheng-display-zoom')).toBe('');
    expect(document.documentElement.dataset.bishengDisplayScale).toBeUndefined();
    expect(readAppliedFontScaleLevel()).toBe(3);
  });
});
