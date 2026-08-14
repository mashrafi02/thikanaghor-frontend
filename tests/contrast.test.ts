import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contrast is computable, so it is computed rather than eyeballed.
 *
 * This exists because the failure it covers is invisible in a screenshot: white text on
 * the light-mode amber measured 3.59:1 and on the dark-mode blue 3.40:1 — both below the
 * WCAG AA floor, and both looked perfectly readable to me. Six of eight solid fills were
 * failing before this was measured.
 *
 * Values are parsed from tokens.css rather than duplicated here, so the test checks what
 * actually ships. Changing a colour without checking its contrast fails the build.
 */

// cwd-relative rather than import.meta.url: under the jsdom environment that URL is
// not a file: URL, and readFileSync rejects it.
const css = readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

/** Pulls the `--name: r g b;` declarations out of a `:root` or `.dark` block. */
function readTokens(scope: 'light' | 'dark'): Record<string, string> {
  const start = css.indexOf(scope === 'light' ? ':root {' : '.dark {');
  const end = css.indexOf('}', start);
  const block = css.slice(start, end);

  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/--([\w-]+):\s*([\d]+\s+[\d]+\s+[\d]+)\s*;/g)) {
    const [, name, channels] = match;
    if (name && channels) tokens[name] = channels;
  }
  return tokens;
}

function relativeLuminance(channels: string): number {
  const [r, g, b] = channels.split(/\s+/).map((value) => {
    const channel = Number(value) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

const MODES = ['light', 'dark'] as const;

describe.each(MODES)('%s mode', (mode) => {
  const tokens = readTokens(mode);

  const ratio = (foreground: string, background: string) => {
    const fg = tokens[foreground];
    const bg = tokens[background];
    if (!fg || !bg) throw new Error(`Missing token: ${foreground} or ${background}`);
    return contrast(fg, bg);
  };

  describe('text on surfaces', () => {
    it('primary text reaches AAA (7:1)', () => {
      expect(ratio('text-primary', 'surface')).toBeGreaterThanOrEqual(7);
      expect(ratio('text-primary', 'canvas')).toBeGreaterThanOrEqual(7);
    });

    /**
     * Every text tone, against every surface it can land on.
     *
     * Two holes this closes, both found by running axe over the real pages rather than
     * reasoning about the palette:
     *
     *  • `text-muted` was held to a 3:1 "incidental text" floor on the assumption that it
     *    only carried axis ticks and placeholders. It does not — it carries "of 5 total",
     *    "vs ৳0 last month" and the login page's explanatory line, all of which are
     *    normal-size body copy needing 4.5:1.
     *  • Only `surface` was checked. The app has five surfaces, and muted measured 3.24:1
     *    on `surface-overlay` — the hover state every row in every list uses.
     */
    const SURFACES = [
      'surface',
      'surface-raised',
      'surface-sunken',
      'surface-overlay',
      'canvas',
    ] as const;

    for (const tone of ['text-primary', 'text-secondary', 'text-muted'] as const) {
      for (const surface of SURFACES) {
        it(`${tone} reaches AA on ${surface}`, () => {
          expect(ratio(tone, surface)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    it('keeps the three text tones visibly distinct', () => {
      // All three clearing AA is not enough — if they converge, the hierarchy they exist
      // to express disappears and everything reads as one weight of grey.
      expect(ratio('text-primary', 'surface')).toBeGreaterThan(
        ratio('text-secondary', 'surface') + 1,
      );
      expect(ratio('text-secondary', 'surface')).toBeGreaterThan(
        ratio('text-muted', 'surface') + 0.5,
      );
    });
  });

  describe('semantic colours as text', () => {
    // `-ink`, not the bare tone. The mark colour and the text colour are separate
    // values: the light amber measures 3.59:1 on white and can never be AA text.
    it.each(['won', 'active', 'pending', 'lost'])(
      '%s-ink reaches AA on its subtle wash',
      (tone) => {
        expect(ratio(`${tone}-ink`, `${tone}-subtle`)).toBeGreaterThanOrEqual(4.5);
      },
    );

    it.each(['won', 'active', 'pending', 'lost'])(
      '%s-ink reaches AA on the card surface',
      (tone) => {
        expect(ratio(`${tone}-ink`, 'surface')).toBeGreaterThanOrEqual(4.5);
      },
    );
  });

  describe('labels on solid fills', () => {
    // The check that caught the real bug. `-fg` is not white everywhere, and assuming
    // it is fails in six of eight cases.
    it.each(['accent', 'won', 'active', 'pending', 'lost', 'hold'])(
      '%s-fg reaches AA on the %s fill',
      (tone) => {
        expect(ratio(`${tone}-fg`, tone)).toBeGreaterThanOrEqual(4.5);
      },
    );
  });

  describe('chart series against the chart surface', () => {
    it.each(['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'])(
      '%s clears the 3:1 mark floor',
      (series) => {
        // Marks are shapes, not text — 3:1 is the applicable threshold.
        expect(ratio(series, 'surface')).toBeGreaterThanOrEqual(3);
      },
    );
  });
});
