import { describe, expect, it } from 'vitest';
import bnErrors from '../src/i18n/locales/bn/errors.json';
import enErrors from '../src/i18n/locales/en/errors.json';
import bnEnums from '../src/i18n/locales/bn/enums.json';
import enEnums from '../src/i18n/locales/en/enums.json';
import { ALL_ERROR_CODES } from '../src/lib/errorCodes';

/**
 * The contract that makes translated errors actually hold.
 *
 * Without this, adding an error code to the backend and forgetting the strings shows the
 * user a raw `PROPERTY_STATUS_TERMINAL` — and nothing would catch it, because there is no
 * type relationship between a JSON file and a string union. This turns that into a build
 * failure.
 */

const bn = bnErrors as Record<string, string>;
const en = enErrors as Record<string, string>;

describe('every error code is translated', () => {
  it.each(ALL_ERROR_CODES)('%s has a Bangla message', (code) => {
    expect(bn[code], `Missing bn translation for ${code}`).toBeTruthy();
  });

  it.each(ALL_ERROR_CODES)('%s has an English message', (code) => {
    expect(en[code], `Missing en translation for ${code}`).toBeTruthy();
  });

  it('has no orphan translations for codes that no longer exist', () => {
    const known = new Set<string>(ALL_ERROR_CODES);
    expect(Object.keys(bn).filter((k) => !known.has(k))).toEqual([]);
    expect(Object.keys(en).filter((k) => !known.has(k))).toEqual([]);
  });
});

describe('interpolation placeholders match between languages', () => {
  const placeholders = (text: string) =>
    [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

  it.each(ALL_ERROR_CODES)('%s uses the same params in both languages', (code) => {
    // A placeholder present in one language and missing in the other renders a
    // sentence with a hole in it — for exactly one of the two audiences, which is
    // precisely the bug nobody notices.
    expect(placeholders(en[code] ?? '')).toEqual(placeholders(bn[code] ?? ''));
  });

  it('interpolates the params the backend actually sends', () => {
    // Mirrors backend/src/utils/errorCodes.ts. If a code's params change there, the
    // matching assertion here fails rather than the sentence silently losing a value.
    const expected: Record<string, string[]> = {
      AUTH_ACCOUNT_LOCKED: ['minutes'],
      RATE_LIMITED: ['minutes'],
      PROPERTY_STATUS_UNCHANGED: ['status'],
      PROPERTY_STATUS_TRANSITION_INVALID: ['allowed', 'from', 'to'],
      PROPERTY_STATUS_TERMINAL: ['from'],
      INQUIRY_DUPLICATE: ['buyerName'],
      VIDEO_ID_NOT_FOUND: ['provider'],
    };

    for (const [code, params] of Object.entries(expected)) {
      expect(placeholders(bn[code] ?? ''), `bn ${code}`).toEqual(params);
      expect(placeholders(en[code] ?? ''), `en ${code}`).toEqual(params);
    }
  });
});

describe('enum labels used inside error messages exist', () => {
  it('every property status has a label in both languages', () => {
    // PROPERTY_STATUS_* messages interpolate translated status names. A missing label
    // would put a raw enum value into an otherwise Bangla sentence.
    const statuses = Object.keys(
      (enEnums as { propertyStatus: Record<string, string> }).propertyStatus,
    );
    const bnStatuses = (bnEnums as { propertyStatus: Record<string, string> }).propertyStatus;

    expect(statuses.length).toBe(8);
    for (const status of statuses) {
      expect(bnStatuses[status], `Missing bn label for status ${status}`).toBeTruthy();
    }
  });
});

describe('Bangla messages are actually Bangla', () => {
  it.each(ALL_ERROR_CODES)('%s is not left as English text', (code) => {
    const text = bn[code] ?? '';
    // Catches a copy-paste of the English string into the bn file — the most likely
    // way a translation goes missing without the key being absent.
    const hasBengaliScript = /[ঀ-৿]/.test(text);
    expect(hasBengaliScript, `bn.${code} contains no Bengali characters: "${text}"`).toBe(
      true,
    );
  });
});
