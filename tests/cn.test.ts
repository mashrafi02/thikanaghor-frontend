import { describe, expect, it } from 'vitest';
import { cn } from '../src/lib/cn';

/**
 * Regression tests for the tailwind-merge configuration.
 *
 * These exist because the failure they cover is invisible: with the custom type scale
 * unregistered, tailwind-merge classified `text-body-sm` as a colour and dropped it when
 * a colour followed. Nothing errored — text simply rendered at the inherited size, in
 * every component that combined a size and a colour through `cn()`.
 */

describe('font-size and text-colour must not be confused', () => {
  it('keeps both when a size is followed by a colour', () => {
    const result = cn('text-body-sm', 'text-ink-secondary');
    expect(result).toContain('text-body-sm');
    expect(result).toContain('text-ink-secondary');
  });

  it('keeps both in the other order too', () => {
    const result = cn('text-ink', 'text-h1');
    expect(result).toContain('text-h1');
    expect(result).toContain('text-ink');
  });

  it.each([['caption'], ['body-sm'], ['body'], ['h3'], ['h2'], ['h1'], ['display']])(
    'survives a following colour at every step of the scale: text-%s',
    (size) => {
      expect(cn(`text-${size}`, 'text-ink-muted')).toContain(`text-${size}`);
    },
  );
});

describe('genuine conflicts still resolve', () => {
  it('lets a later size replace an earlier one', () => {
    expect(cn('text-body', 'text-h2')).toBe('text-h2');
  });

  it('lets a later colour replace an earlier one', () => {
    expect(cn('text-ink-muted', 'text-lost')).toBe('text-lost');
  });

  it('still merges non-text utilities normally', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6');
    expect(cn('rounded-sm', 'rounded-lg')).toBe('rounded-lg');
  });

  it('handles conditional and falsy inputs', () => {
    expect(cn('p-4', false, undefined, null, 'text-ink')).toBe('p-4 text-ink');
  });
});
