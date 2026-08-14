import { describe, expect, it } from 'vitest';
import { adjustMoney, sumMoney } from '../src/features/pipeline/money';

/**
 * The board's optimistic money arithmetic.
 *
 * This is the only place the client adds up money, so it is the only place a float could
 * creep back into a stack that is otherwise Decimal end to end. These tests are the
 * guard: they use the values that actually break naive addition, so a rewrite that
 * "simplifies" the paisa conversion away fails immediately rather than quietly showing
 * ৳30,00,000.0000000004 in a column header.
 */

describe('adjustMoney', () => {
  it('adds and subtracts whole amounts', () => {
    expect(adjustMoney('5000000.00', '2500000.00', 1)).toBe('7500000.00');
    expect(adjustMoney('7500000.00', '2500000.00', -1)).toBe('5000000.00');
  });

  it('survives the values plain float addition gets wrong', () => {
    // 0.1 + 0.2 === 0.30000000000000004 as doubles.
    expect(adjustMoney('0.10', '0.20', 1)).toBe('0.30');
    expect(adjustMoney('1000000.10', '2000000.20', 1)).toBe('3000000.30');
  });

  it('round-trips: adding then removing a card restores the original total', () => {
    // The exact sequence a rejected drag produces — optimistic add, then rollback.
    const start = '12345678.91';
    const card = '987654.32';
    expect(adjustMoney(adjustMoney(start, card, 1), card, -1)).toBe(start);
  });

  it('treats a missing amount as zero', () => {
    // askingPrice is nullable, and a card without one must not blank the column total.
    expect(adjustMoney('5000000.00', null, 1)).toBe('5000000.00');
    expect(adjustMoney('5000000.00', undefined, -1)).toBe('5000000.00');
  });

  it('ignores an unparseable amount rather than producing NaN', () => {
    // A NaN here would render as "৳ NaN" in the column header, which is worse than
    // being silently short by one card until the next fetch corrects it.
    expect(adjustMoney('5000000.00', 'not-a-number', 1)).toBe('5000000.00');
  });

  it('can go negative without corrupting the string', () => {
    // Should not happen, but a stale board could subtract a card twice; the result must
    // still be a parseable money string, not "-0.00" garbage.
    expect(adjustMoney('100.00', '250.00', -1)).toBe('-150.00');
  });
});

describe('sumMoney', () => {
  it('sums the five column totals exactly', () => {
    expect(sumMoney(['1000000.10', '2000000.20', '3000000.30', '0.00', '0.00'])).toBe(
      '6000000.60',
    );
  });

  it('returns a zero string for an empty board', () => {
    expect(sumMoney([])).toBe('0.00');
  });

  it('skips nulls', () => {
    expect(sumMoney(['100.50', null, '200.25', undefined])).toBe('300.75');
  });

  it('always returns two decimal places', () => {
    // The formatters take a decimal string; "300" and "300.7" would both render, but
    // inconsistently across a row of columns.
    for (const value of [sumMoney(['300']), sumMoney(['300.7']), sumMoney(['0'])]) {
      expect(value).toMatch(/^-?\d+\.\d{2}$/);
    }
  });
});
