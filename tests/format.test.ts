import { describe, expect, it } from 'vitest';
import {
  EMPTY,
  formatArea,
  formatAreaWithSqft,
  formatDate,
  formatDelta,
  formatMoney,
  formatMoneyShort,
  formatMonth,
  formatNumber,
  formatPercent,
  formatRelative,
  normalizeNumericInput,
  toAsciiDigits,
} from '../src/lib/format';

/**
 * The formatting layer is the one place a money figure can be shown wrong, and the one
 * place Bangla can silently degrade into "English with different digits". Both are
 * covered here.
 */

describe('money', () => {
  it('groups in lakh/crore in both languages, not thousands', () => {
    // The whole reason en uses en-IN rather than en-US: a Bangladeshi reader does not
    // parse "5,000,000" as fifty lakh.
    expect(formatMoney('5000000.00', 'en')).toBe('৳ 50,00,000');
    expect(formatMoney('5000000.00', 'bn')).toBe('৳ ৫০,০০,০০০');
    expect(formatMoney('12500000', 'en')).toBe('৳ 1,25,00,000');
  });

  it('renders Bengali digits in Bangla', () => {
    expect(formatMoney('1234', 'bn')).toBe('৳ ১,২৩৪');
    expect(formatNumber(1234, 'bn')).toBe('১,২৩৪');
  });

  it('drops paisa from display without touching the data', () => {
    expect(formatMoney('4800000.00', 'en')).toBe('৳ 48,00,000');
    expect(formatMoney('120000.50', 'en')).toBe('৳ 1,20,001');
  });

  it('formats a 12-digit amount exactly, with no float damage', () => {
    // The API's ceiling is NUMERIC(14,2). Formatting via the string path means this
    // cannot lose precision on the way to the screen.
    expect(formatMoney('999999999999', 'en')).toBe('৳ 9,99,99,99,99,999');
  });

  it('renders absent values as an em dash, never as zero', () => {
    // A null from the API means "no data yet". Rendering 0 would state a fact.
    expect(formatMoney(null, 'bn')).toBe(EMPTY);
    expect(formatMoney(undefined, 'en')).toBe(EMPTY);
    expect(formatMoney('', 'en')).toBe(EMPTY);
  });
});

describe('money shorthand', () => {
  it('uses the units people actually speak', () => {
    expect(formatMoneyShort('5000000', 'en')).toBe('৳ 50 Lakh');
    expect(formatMoneyShort('5000000', 'bn')).toBe('৳ ৫০ লক্ষ');
    expect(formatMoneyShort('12000000', 'en')).toBe('৳ 1.2 Crore');
    expect(formatMoneyShort('12000000', 'bn')).toBe('৳ ১.২ কোটি');
  });

  it('switches unit at exactly one lakh and one crore', () => {
    expect(formatMoneyShort('99999', 'en')).toBe('৳ 99,999');
    expect(formatMoneyShort('100000', 'en')).toBe('৳ 1 Lakh');
    expect(formatMoneyShort('10000000', 'en')).toBe('৳ 1 Crore');
  });

  it('promotes the unit when rounding crosses its ceiling', () => {
    /**
     * This assertion previously read `'৳ 100 Lakh'` — the test locked in the bug.
     *
     * ৯৯,৯৯,৯৯৯ is a rupee short of a crore, so it took the lakh branch, and only then
     * was 99.99999 rounded to 100. The unit was chosen from the raw value but printed
     * beside the rounded one, giving a figure nobody says out loud. The fix rounds
     * first and promotes if the result no longer fits the unit.
     */
    expect(formatMoneyShort('9999999', 'en')).toBe('৳ 1 Crore');
    expect(formatMoneyShort('9999999', 'bn')).toBe('৳ ১ কোটি');

    // The boundary itself must not double-promote.
    expect(formatMoneyShort('10000000', 'bn')).toBe('৳ ১ কোটি');
    // And a genuine 99 lakh still reads as lakh.
    expect(formatMoneyShort('9900000', 'en')).toBe('৳ 99 Lakh');
    expect(formatMoneyShort('9949999', 'en')).toBe('৳ 99.5 Lakh');
  });

  it('rounds to two decimals within a unit, as any short form does', () => {
    // Not a promotion case: 9.99999 lakh rounds to 10 lakh, which is still lakh. The
    // exact figure lives in the field itself; this is a magnitude cue.
    expect(formatMoneyShort('999999', 'en')).toBe('৳ 10 Lakh');
    expect(formatMoneyShort('120000', 'bn')).toBe('৳ ১.২ লক্ষ');
    expect(formatMoneyShort('175000', 'bn')).toBe('৳ ১.৭৫ লক্ষ');
  });

  it('falls through to the full figure below a lakh', () => {
    // "৳ 45 K" is not how anyone here talks about a price.
    expect(formatMoneyShort('45000', 'en')).toBe('৳ 45,000');
    expect(formatMoneyShort('45000', 'bn')).toBe('৳ ৪৫,০০০');
  });
});

describe('percent and delta', () => {
  it('formats percentages in both scripts', () => {
    expect(formatPercent(66.7, 'en')).toBe('66.7%');
    expect(formatPercent(66.7, 'bn')).toBe('৬৬.৭%');
  });

  it('signs deltas with a true minus, not a hyphen', () => {
    expect(formatDelta(50, 'en')).toBe('+50%');
    expect(formatDelta(-12.5, 'en')).toBe('−12.5%');
    expect(formatDelta(0, 'en')).toBe('0%');
    // U+2212, not U+002D — a hyphen beside a digit reads as a range.
    expect(formatDelta(-50, 'en').startsWith('−')).toBe(true);
  });

  it('renders a null delta as an em dash', () => {
    // The API returns null for monthChangePercent when there is no baseline month.
    expect(formatDelta(null, 'bn')).toBe(EMPTY);
  });
});

describe('area', () => {
  it('labels units in both languages', () => {
    expect(formatArea(5, 'KATHA', 'en')).toBe('5 Katha');
    expect(formatArea(5, 'KATHA', 'bn')).toBe('৫ কাঠা');
    expect(formatArea(3, 'BIGHA', 'bn')).toBe('৩ বিঘা');
  });

  it('shows the normalised sqft alongside the stated unit', () => {
    expect(formatAreaWithSqft(5, 'KATHA', '3600.00', 'en')).toBe('5 Katha (3,600 sq ft)');
    expect(formatAreaWithSqft(5, 'KATHA', '3600.00', 'bn')).toBe('৫ কাঠা (৩,৬০০ বর্গফুট)');
  });

  it('does not repeat itself when the unit is already sqft', () => {
    expect(formatAreaWithSqft(1400, 'SQFT', '1400.00', 'en')).toBe('1,400 sq ft');
  });
});

describe('dates', () => {
  it('abbreviates the month in English but not in Bangla', () => {
    // Clipped month names are idiomatic in English ("Aug") and are not in Bengali.
    expect(formatDate('2026-08-13', 'en')).toBe('13 Aug 2026');
    expect(formatDate('2026-08-13', 'bn')).toContain('আগস্ট');
    expect(formatDate('2026-08-13', 'bn')).not.toContain('আগ,');
  });

  it('formats the API month bucket', () => {
    expect(formatMonth('2026-08', 'en')).toBe('Aug 2026');
    expect(formatMonth('2026-08', 'bn')).toContain('আগস্ট');
  });

  it('formats relative time in both languages', () => {
    const now = new Date('2026-08-13T12:00:00Z');
    const threeDaysAgo = new Date('2026-08-10T12:00:00Z');

    expect(formatRelative(threeDaysAgo, 'en', now)).toBe('3 days ago');
    expect(formatRelative(threeDaysAgo, 'bn', now)).toBe('৩ দিন আগে');
  });

  it('rejects an unparseable date rather than rendering "Invalid Date"', () => {
    expect(formatDate('not-a-date', 'en')).toBe(EMPTY);
    expect(formatDate(null, 'en')).toBe(EMPTY);
  });
});

describe('input normalisation', () => {
  it('converts Bengali digits to ASCII', () => {
    expect(toAsciiDigits('১২৩')).toBe('123');
    expect(toAsciiDigits('৫০০০০০০')).toBe('5000000');
  });

  it('leaves Bangla prose alone', () => {
    // The counterpart rule to the backend's: a title is text the user typed on
    // purpose, and rewriting its digits would corrupt it. Only numeric *inputs*
    // are normalised, and only by the caller choosing to.
    const title = '৫ কাঠা জমি বিক্রয় হবে';
    expect(toAsciiDigits(title)).toBe('5 কাঠা জমি বিক্রয় হবে');
    expect(title).toBe('৫ কাঠা জমি বিক্রয় হবে');
  });

  it('strips separators and whitespace for submission', () => {
    expect(normalizeNumericInput('50,00,000')).toBe('5000000');
    expect(normalizeNumericInput('৫০,০০,০০০')).toBe('5000000');
    expect(normalizeNumericInput('  1234  ')).toBe('1234');
  });

  it('emits a plain string, never a number', () => {
    // The client must never parse money into a float. This is the guard.
    expect(typeof normalizeNumericInput('৫০০০০০০')).toBe('string');
  });
});
