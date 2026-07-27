import { readFileSync } from 'fs';
import { join } from 'path';
import {
  applyFontScaleLevel,
  normalizeFontScaleLevel,
  readAppliedFontScaleLevel,
} from './fontScale';

const clientRoot = join(__dirname, '..', '..');

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
    document.documentElement.style.removeProperty('--bisheng-display-scale');
    document.documentElement.style.removeProperty('--bisheng-display-viewport-width');
    document.documentElement.style.removeProperty('--bisheng-display-viewport-height');
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
    [1, '0.9', '111.111111vw', '111.111111dvh'],
    [3, '1', '100vw', '100dvh'],
    [5, '1.1', '90.909091vw', '90.909091dvh'],
  ] as const)('applies level %s as application scale %s', (level, scale, width, height) => {
    applyFontScaleLevel(level, 7);

    expect(document.documentElement.style.getPropertyValue('--bisheng-display-scale')).toBe(scale);
    expect(
      document.documentElement.style.getPropertyValue('--bisheng-display-viewport-width'),
    ).toBe(width);
    expect(
      document.documentElement.style.getPropertyValue('--bisheng-display-viewport-height'),
    ).toBe(height);
    expect(document.documentElement.style.getPropertyValue('--bisheng-display-zoom')).toBe('');
    expect(document.documentElement.dataset.bishengDisplayScale).toBe(String(level));
    expect(readAppliedFontScaleLevel()).toBe(level);
    expect(localStorage.getItem('bisheng:font-scale:7')).toBe(String(level));
  });

  it('removes the display layer when the edition does not enable the feature', () => {
    applyFontScaleLevel(5, 7);
    window.APP_CONFIG = { fontSizeVariant: 'disabled' };

    applyFontScaleLevel(5, 7);

    expect(document.documentElement.style.getPropertyValue('--bisheng-display-scale')).toBe('');
    expect(
      document.documentElement.style.getPropertyValue('--bisheng-display-viewport-width'),
    ).toBe('');
    expect(
      document.documentElement.style.getPropertyValue('--bisheng-display-viewport-height'),
    ).toBe('');
    expect(document.documentElement.dataset.bishengDisplayScale).toBeUndefined();
    expect(readAppliedFontScaleLevel()).toBe(3);
  });

  it('uses layout-aware zoom on a compensated body layer', () => {
    const css = readFileSync(join(clientRoot, 'src/style.css'), 'utf8');
    const bodyRule = css.match(
      /html\[data-bisheng-display-scale\]\s+body\s*\{([^}]*)\}/,
    )?.[1];

    expect(css).not.toMatch(/html\[data-bisheng-display-scale\]\s*\{\s*zoom:/);
    expect(bodyRule).toMatch(/zoom:\s*var\(--bisheng-display-scale,\s*1\)/);
    expect(bodyRule).not.toMatch(/transform:\s*scale\(/);
    expect(bodyRule).toMatch(
      /height:\s*var\(--bisheng-display-viewport-height,\s*100dvh\)\s*!important/,
    );
    expect(css).toMatch(
      /\[data-radix-popper-content-wrapper\]\s*\{\s*zoom:\s*calc\(1\s*\/\s*var\(--bisheng-display-scale,\s*1\)\)/,
    );
    expect(css).toMatch(
      /\[data-radix-popper-content-wrapper\]\s*>\s*\*\s*\{\s*zoom:\s*var\(--bisheng-display-scale,\s*1\)/,
    );
  });

  it('sizes desktop full-screen roots from the compensated application layer', () => {
    const layout = readFileSync(join(clientRoot, 'src/layouts/MainLayout.tsx'), 'utf8');
    const root = readFileSync(join(clientRoot, 'src/routes/Root.tsx'), 'utf8');

    expect(layout).toContain('bisheng-display-viewport relative flex w-full');
    expect(layout).toContain("isMobile ? 'min-h-[100dvh] overflow-x-clip' : 'h-full overflow-hidden'");
    expect(layout).toContain("isMobile ? 'h-[100dvh]' : 'h-full'");
    expect(layout).toContain(
      'h-[calc(var(--bisheng-display-viewport-height,100dvh)-16px)]',
    );
    expect(layout).not.toContain('h-[calc(100dvh-16px)]');
    expect(root).toContain(": 'h-full max-h-full'");
  });

  it('lets Radix collision handling place the rail account menu', () => {
    const menu = readFileSync(join(clientRoot, 'src/layouts/UserPopMenu.tsx'), 'utf8');

    expect(menu).toContain('sideOffset={8}');
    expect(menu).toContain('collisionPadding={8}');
    expect(menu).not.toContain('window.innerHeight - marginBottom');
  });
});
