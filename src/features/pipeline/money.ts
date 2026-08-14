/**
 * The only money arithmetic the client does, and why it is allowed here.
 *
 * Every amount in this app is a decimal string, summed on the server with Decimal, so
 * that no total ever passes through a float. The board breaks that rule in exactly two
 * places, both provisional:
 *
 *  • the optimistic patch, which adjusts a column total before the server answers;
 *  • the board header, which adds the five column totals the server already computed.
 *
 * Both are replaced by server figures on the next fetch. They still must not drift
 * visibly, so the arithmetic happens in **integer paisa** rather than on the decimals:
 * `Number('1000000.10') * 100` rounds to exactly 100000010, and integers below 2^53 add
 * without error. Adding the decimal strings directly would produce the classic
 * `0.1 + 0.2 = 0.30000000000000004`, and a column header that wobbled by a paisa on
 * every drag would look broken even though the stored value was right.
 */

/** A money string as an integer number of paisa. */
function toPaisa(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

/** Integer paisa back to the 2-decimal string the formatters expect. */
function fromPaisa(paisa: number): string {
  return (paisa / 100).toFixed(2);
}

/** `total ± delta`, both money strings. */
export function adjustMoney(
  total: string,
  delta: string | null | undefined,
  direction: 1 | -1,
): string {
  return fromPaisa(toPaisa(total) + direction * toPaisa(delta));
}

/** Sums money strings — for the handful of already-server-computed subtotals only. */
export function sumMoney(values: (string | null | undefined)[]): string {
  return fromPaisa(values.reduce<number>((total, value) => total + toPaisa(value), 0));
}
