import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Bengali-digit weight override must stay in place.
 *
 * Hind Siliguri's Medium (500) ships a defective ১ (U+09E7): the counter collapses and
 * the glyph renders as a thin sliver with no loop, reading as an apostrophe. Measured in
 * a real browser, its ink box is **0.62** of ২'s height at weight 500, against 0.78 at
 * 400 and 0.73 at 600 — both of which draw the loop properly.
 *
 * It matters because `text-caption` is 12px/**500**, so the broken weight was exactly the
 * one used for every money shorthand under an input (৳ ১.২ লক্ষ), every stat hint and
 * every chip. A price that says "one point two lakh" rendered the one as punctuation.
 *
 * `index.css` therefore redirects U+09E6–U+09EF at weight 500 to the 600 file. This test
 * guards that block: it looks like a redundant duplicate `@font-face` to anyone tidying
 * the stylesheet, and deleting it silently reintroduces the bug — silently, because
 * nothing fails, the digit just goes back to being unreadable.
 *
 * The rendering itself cannot be asserted here (jsdom has no font engine); it was
 * verified in Chrome by measuring the glyph's ink box before and after.
 */

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

/** The `@font-face` block covering the Bengali digit range, if there is one. */
function digitOverride(): string | null {
  for (const match of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    const block = match[0];
    if (/unicode-range:\s*U\+0?9E6-0?9EF/i.test(block)) return block;
  }
  return null;
}

describe('Bengali digit rendering', () => {
  it('overrides the digit range at weight 500', () => {
    const block = digitOverride();
    expect(block, 'the U+09E6–U+09EF @font-face is missing from index.css').not.toBeNull();
    expect(block).toMatch(/font-weight:\s*500/);
    expect(block).toMatch(/font-family:\s*'Hind Siliguri'/);
  });

  it('points that range at the 600 file, which draws the loop', () => {
    // Pointing it back at the 500 file would satisfy the test above while changing
    // nothing, so the source weight is asserted explicitly.
    expect(digitOverride()).toMatch(/hind-siliguri-bengali-600-normal\.woff2/);
  });

  it('still loads the three weights the design system uses', () => {
    // The override is a patch on top of the normal faces, not a replacement for them.
    for (const weight of [400, 500, 600]) {
      expect(css).toContain(`@fontsource/hind-siliguri/bengali-${String(weight)}.css`);
    }
  });

  it('keeps the override after the last @import', () => {
    // CSS requires every @import to precede other rules; an @font-face placed above them
    // makes the browser drop the imports that follow it.
    const lastImport = css.lastIndexOf('@import');
    const override = css.indexOf('unicode-range');
    expect(override).toBeGreaterThan(lastImport);
  });
});
