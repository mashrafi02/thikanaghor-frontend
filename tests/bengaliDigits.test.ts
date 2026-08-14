import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Bengali-digit face override, and the two ways it has already been got wrong.
 *
 * Hind Siliguri ships two different ১ (U+09E7) outlines. Weights 300 and 700 draw it
 * full height, level with the other digits. Weights 400, 500 and 600 draw a deformed one
 * that reaches neither the cap line nor the baseline — it floats mid-line at 60–78% size
 * and reads as a comma. Those three are exactly the weights this app uses, and
 * `text-caption` is 12px/500, the worst of them.
 *
 * `index.css` therefore points U+09E6–U+09EF at the 700 file. Two traps are baked into
 * these assertions because both were hit while getting here:
 *
 *  1. **Not the 600 file.** 600 is also a deformed outline, so substituting it produced a
 *     bolder blob rather than a correct glyph — visibly worse than the sliver.
 *  2. **Never a `font-weight: 400 600` range.** A range face matches the requested weight
 *     first; when the character turns out to be outside its `unicode-range`, the browser
 *     abandons the whole family rather than trying its other faces, and every Bengali
 *     *letter* silently dropped to a system font. `unicode-range` only partitions faces of
 *     the same weight, so each weight needs its own rule.
 *
 * The rendering itself is not asserted here — jsdom has no font engine. It was measured in
 * Chrome: ১'s top gap against ২ went from 6/14/9 (at 400/500/600) to 0, and its height
 * ratio from 0.78/0.62/0.73 to 0.92.
 */

const raw = readFileSync(path.resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

/**
 * Comments stripped before anything is measured.
 *
 * The block documenting these rules mentions both `@import` and `unicode-range` in prose,
 * so matching against the raw file measures the commentary rather than the stylesheet —
 * which is exactly how the ordering assertion below first failed.
 */
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

const WEIGHTS = [400, 500, 600] as const;

/** Every `@font-face` block scoped to the Bengali digit range. */
function digitFaces(): string[] {
  return [...css.matchAll(/@font-face\s*\{[^}]*\}/g)]
    .map((match) => match[0])
    .filter((block) => /unicode-range:\s*U\+0?9E6-0?9EF/i.test(block));
}

describe('Bengali digit face override', () => {
  it('declares one face per weight in the scale', () => {
    const faces = digitFaces();
    expect(faces).toHaveLength(WEIGHTS.length);

    for (const weight of WEIGHTS) {
      expect(
        faces.some((block) =>
          new RegExp(`font-weight:\\s*${String(weight)}\\s*;`).test(block),
        ),
        `no digit face declared for weight ${String(weight)}`,
      ).toBe(true);
    }
  });

  it('never uses a weight range, which breaks Bengali text', () => {
    // The regression this prevents is invisible in the digits — it shows up as every
    // Bengali *letter* rendering in a system font instead of Hind Siliguri.
    for (const block of digitFaces()) {
      expect(block, 'a digit face uses a font-weight range').not.toMatch(
        /font-weight:\s*\d+\s+\d+/,
      );
    }
  });

  it('sources the 700 file, not 600', () => {
    for (const block of digitFaces()) {
      expect(block).toMatch(/hind-siliguri-bengali-700-normal\.woff2/);
      expect(block).not.toMatch(/hind-siliguri-bengali-600-normal\.woff2/);
    }
  });

  it('covers only the ten digits, so letters and Latin are untouched', () => {
    for (const block of digitFaces()) {
      expect(block).toMatch(/unicode-range:\s*U\+0?9E6-0?9EF\s*;/i);
    }
  });

  it('still imports the three normal Bengali weights', () => {
    // The override is a patch on top of the real faces, not a replacement — without them
    // there is nothing to render Bengali letters with.
    for (const weight of WEIGHTS) {
      expect(css).toContain(`@fontsource/hind-siliguri/bengali-${String(weight)}.css`);
    }
  });

  it('sits after the last @import', () => {
    // CSS requires every @import to precede other rules; an @font-face above them makes
    // the browser drop the imports that follow, silently losing the design tokens.
    expect(css.indexOf('unicode-range')).toBeGreaterThan(css.lastIndexOf('@import'));
  });
});
