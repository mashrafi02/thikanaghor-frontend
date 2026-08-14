import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * No component may use a scale step the config does not define.
 *
 * `tailwind.config.js` **replaces** `spacing` rather than extending it, and Tailwind does
 * not warn about an unknown step — it simply generates no class, so the element gets
 * `height: auto` or no padding and the failure is completely silent.
 *
 * That was not hypothetical. Twenty-one classes across the app were dead:
 *
 *  • `h-2.5` gave every stage bar a computed height of **0** — correct colours, correct
 *    widths, correct labels, and an invisible chart.
 *  • `min-h-14` was not enforcing the 44px touch minimum its own comment promised.
 *  • `h-14` was setting neither the topbar nor the sidebar height.
 *  • `bottom-14` was not lifting the mobile action bar above the tab bar.
 *  • Every `h-32`/`h-40` loading skeleton had zero height.
 *
 * The config now separates the two concerns, and so does this test:
 *
 *  • **rhythm** (`spacing`) — padding, margin, gap. Closed at 96px, no half-steps.
 *  • **dimensions** (`DIMENSIONS`) — width, height, size, inset. Still 4px multiples,
 *    but the sizes components actually are: a 44px target, a 56px bar, a 160px skeleton.
 *
 * Both scales are parsed from the config, so this cannot drift from what ships.
 */

const root = process.cwd();
const config = readFileSync(path.resolve(root, 'tailwind.config.js'), 'utf8');

/** The keys of an object literal starting at `label` in the config source. */
function stepsOf(label: string): Set<string> {
  const start = config.indexOf(label);
  expect(start, `${label} not found in tailwind.config.js`).toBeGreaterThan(-1);
  const block = config.slice(
    start,
    config.indexOf('};', start) + 1 || config.indexOf('},', start),
  );

  const steps = new Set<string>();
  for (const match of block.matchAll(/^\s*(?:'([^']+)'|([\w.]+)):\s*'/gm)) {
    const name = match[1] ?? match[2];
    if (name) steps.add(name);
  }
  return steps;
}

const rhythm = stepsOf('spacing: {');
const dimensions = stepsOf('const DIMENSIONS = {');

/** Utilities whose value comes from `spacing` alone. */
const RHYTHM_PREFIXES = [
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'ps',
  'pe',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'ms',
  'me',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
];

/** Utilities that also accept a dimension step. */
const DIMENSION_PREFIXES = [
  'w',
  'h',
  'size',
  'min-w',
  'min-h',
  'max-w',
  'max-h',
  'top',
  'bottom',
  'left',
  'right',
  'inset',
  'inset-x',
  'inset-y',
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** `\b` would split `min-h-14` into a bare `h-14`, so prefixes are anchored on a
 *  boundary that treats `-` as part of the name. */
function findUsages(prefixes: string[]): { file: string; cls: string; step: string }[] {
  const pattern = new RegExp(
    String.raw`(?<![\w-])(?:[a-z]+:)*-?(${prefixes.join('|')})-(\d+(?:\.\d+)?)(?![\w.-])`,
    'g',
  );

  const found: { file: string; cls: string; step: string }[] = [];
  for (const file of sourceFiles(path.resolve(root, 'src'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
      const [cls, , step] = match;
      if (cls && step) found.push({ file: path.relative(root, file), cls, step });
    }
  }
  return found;
}

describe('tailwind scales', () => {
  it('parses both scales out of the config', () => {
    // Guards the parsers: if either silently matched nothing, every check below would
    // pass while testing nothing at all.
    expect(rhythm.has('4')).toBe(true);
    expect(rhythm.has('2.5')).toBe(false);
    expect(rhythm.has('14')).toBe(false);
    expect(dimensions.has('14')).toBe(true);
    expect(dimensions.has('11')).toBe(true);
  });

  it('uses only defined rhythm steps for padding, margin and gap', () => {
    const offenders = findUsages(RHYTHM_PREFIXES)
      .filter((usage) => !rhythm.has(usage.step))
      .map((usage) => `${usage.file}: ${usage.cls}`);

    expect([...new Set(offenders)]).toEqual([]);
  });

  it('uses only defined steps for width, height and inset', () => {
    const offenders = findUsages(DIMENSION_PREFIXES)
      .filter((usage) => !rhythm.has(usage.step) && !dimensions.has(usage.step))
      .map((usage) => `${usage.file}: ${usage.cls}`);

    expect([...new Set(offenders)]).toEqual([]);
  });
});
