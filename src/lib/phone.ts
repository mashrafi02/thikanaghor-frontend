import { toAsciiDigits } from './format';

/**
 * Display-side mirror of the server's phone normaliser.
 *
 * The server remains the authority — it normalises on save and rejects anything
 * invalid. This exists so the form can show what will be stored *as it is typed*, and
 * so a bad number is caught before a round trip.
 *
 * Kept in one place because it was briefly duplicated between the input and the form
 * schema, which is precisely how the two drift into disagreeing about what is valid.
 *
 * The rules below must stay in step with `backend/src/utils/phone.ts`. They are
 * deliberately the same two regexes: a client that accepted a number the server rejects
 * produces a form that looks fine and then fails on submit.
 */

export type PhoneKind = 'MOBILE' | 'LANDLINE';

/** `1` + one operator digit (3-9) + 8 subscriber digits. */
const MOBILE_NSN = /^1[3-9]\d{8}$/;

/**
 * Area code + subscriber number. A shape rule rather than a list of area codes — see the
 * server's copy for why enumerating them would reject real numbers.
 */
const LANDLINE_NSN = /^[2-9]\d{6,9}$/;

function toNsn(input: string): string | null {
  const digits = toAsciiDigits(input).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('880')) return digits.slice(3);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/**
 * Any accepted form → `{ number, kind }`, or null if it is not a valid BD number.
 *
 * Accepts `01712345678`, `+880 1712 345678`, `8801712345678`, `০১৭১২৩৪৫৬৭৮`, `02-9123456`
 * and the separator-laden shapes numbers get copied out of Facebook posts in.
 */
export function parseBdPhone(input: string): { number: string; kind: PhoneKind } | null {
  const nsn = toNsn(input);
  if (nsn === null) return null;

  if (MOBILE_NSN.test(nsn)) return { number: `+880${nsn}`, kind: 'MOBILE' };
  if (LANDLINE_NSN.test(nsn)) return { number: `+880${nsn}`, kind: 'LANDLINE' };
  return null;
}

export function normalizeBdPhone(input: string): string | null {
  return parseBdPhone(input)?.number ?? null;
}

export function isValidBdPhone(input: string): boolean {
  return parseBdPhone(input) !== null;
}
