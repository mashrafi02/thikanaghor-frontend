import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every CSS custom property the chart palette reads must actually exist.
 *
 * This exists because of a specific bug: `useChartColors` asked for `--ink-muted`, which
 * is not a token — the name in tokens.css is `--text-muted`. The lookup returned nothing
 * and the axis labels were painted `transparent`, so all 22 ticks were laid out, sized
 * and positioned correctly and were completely invisible. Nothing failed; the chart just
 * quietly had no labels.
 *
 * Neither the type checker nor the linter can catch a bad CSS variable name — the string
 * is only resolved by the browser at runtime, and an unknown property is legal CSS. So
 * the two files are cross-checked here instead.
 */

const root = process.cwd();
const css = readFileSync(path.resolve(root, 'src/styles/tokens.css'), 'utf8');
const hook = readFileSync(
  path.resolve(root, 'src/features/dashboard/useChartColors.ts'),
  'utf8',
);

/** Every `--name:` declared anywhere in tokens.css. */
function declaredTokens(): Set<string> {
  const names = new Set<string>();
  for (const match of css.matchAll(/(--[\w-]+)\s*:/g)) {
    if (match[1]) names.add(match[1]);
  }
  return names;
}

/** Every `token(styles, '--name')` the hook asks for. */
function requestedTokens(): string[] {
  return [...hook.matchAll(/token\(styles,\s*'(--[\w-]+)'\)/g)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined);
}

describe('chart palette tokens', () => {
  const declared = declaredTokens();
  const requested = requestedTokens();

  it('finds the token reads in the hook', () => {
    // A guard on the regex itself: if the hook is refactored so this stops matching, the
    // test would silently pass while checking nothing.
    expect(requested.length).toBeGreaterThanOrEqual(12);
  });

  it.each([...new Set(requestedTokens())])('%s is defined in tokens.css', (name) => {
    expect(declared.has(name)).toBe(true);
  });

  it('defines every requested token in dark mode too', () => {
    // The dark block overrides a subset; a chart colour must be in that subset, or the
    // charts keep their light values on a dark surface.
    const darkStart = css.indexOf('.dark {');
    const darkBlock = css.slice(darkStart, css.indexOf('}', darkStart));

    for (const name of new Set(requested)) {
      expect(darkBlock, `${name} has no dark-mode value`).toContain(`${name}:`);
    }
  });
});
