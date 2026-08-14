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
 */

/**
 * Any accepted form → `+8801XXXXXXXXX`, or null if it is not a valid BD mobile number.
 *
 * Accepts `01712345678`, `+880 1712 345678`, `8801712345678`, `০১৭১২৩৪৫৬৭৮` and the
 * separator-laden shapes numbers get copied out of Facebook posts in.
 */
export function normalizeBdPhone(input: string): string | null {
  const digits = toAsciiDigits(input).replace(/\D/g, '');
  if (!digits) return null;

  const nsn = digits.startsWith('880')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits.startsWith('1')
        ? digits
        : null;

  if (nsn === null) return null;

  // `1` + one operator digit (3-9) + 8 subscriber digits.
  return /^1[3-9]\d{8}$/.test(nsn) ? `+880${nsn}` : null;
}

export function isValidBdPhone(input: string): boolean {
  return normalizeBdPhone(input) !== null;
}
