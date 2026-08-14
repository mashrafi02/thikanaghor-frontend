import { describe, expect, it } from 'vitest';
import { isValidBdPhone, normalizeBdPhone } from '../src/lib/phone';

/**
 * The client-side phone normaliser.
 *
 * It mirrors the server's rule, and the point of these tests is that the mirror stays
 * accurate: if the two disagree, the form either rejects a number the server would have
 * accepted, or accepts one it will reject after a round trip.
 */

describe('normalizeBdPhone', () => {
  it.each([
    ['01712345678'],
    ['+8801712345678'],
    ['8801712345678'],
    ['1712345678'],
    ['01712-345678'],
    ['+880 1712 345678'],
    ['(017) 1234 5678'],
    ['  01712345678  '],
  ])('normalises %s', (input) => {
    expect(normalizeBdPhone(input)).toBe('+8801712345678');
  });

  it('accepts Bengali digits — the default keyboard produces them', () => {
    expect(normalizeBdPhone('০১৭১২৩৪৫৬৭৮')).toBe('+8801712345678');
    expect(normalizeBdPhone('+৮৮০১৭১২৩৪৫৬৭৮')).toBe('+8801712345678');
  });

  it('makes every written form of one number collapse to the same value', () => {
    // The reason the server normalises at all: otherwise the same person does not
    // match themselves in a search.
    const forms = ['01712345678', '+8801712345678', '০১৭১২৩৪৫৬৭৮', '01712-345678'];
    expect(new Set(forms.map(normalizeBdPhone)).size).toBe(1);
  });

  it('accepts every assigned operator digit', () => {
    for (const operator of ['3', '4', '5', '6', '7', '8', '9']) {
      expect(normalizeBdPhone(`01${operator}12345678`)).toBe(`+8801${operator}12345678`);
    }
  });

  it.each([
    ['01012345678', 'operator digit 0 is not assigned'],
    ['01112345678', 'operator digit 1 is not assigned'],
    ['01212345678', 'operator digit 2 is not assigned'],
    ['0171234567', 'one digit short'],
    ['017123456789', 'one digit long'],
    ['+1234567890', 'not a Bangladeshi number'],
    ['abcdefghijk', 'no digits at all'],
    ['', 'empty'],
  ])('rejects %s (%s)', (input) => {
    expect(normalizeBdPhone(input)).toBeNull();
    expect(isValidBdPhone(input)).toBe(false);
  });
});
