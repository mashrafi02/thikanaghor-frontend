/**
 * Number, money, date and area formatting.
 *
 * Pure functions taking an explicit locale, so they are testable without React.
 * `useFormat()` binds them to the active language — components use that, never these
 * directly.
 *
 * Two rules this module exists to enforce:
 *
 *  1. **Never do arithmetic on money.** Amounts arrive from the API as exact decimal
 *     strings ("5000000.00") and are formatted as strings. `Intl.NumberFormat.format`
 *     accepts a string and formats it exactly, with no float round-trip — that path is
 *     used wherever possible.
 *  2. **Bangla is not "English with different digits."** `bn-BD` supplies Bengali
 *     numerals *and* Indian lakh/crore grouping. `en-IN` gives the same grouping with
 *     Latin digits, which is what a Bangladeshi reader expects even in English.
 *     Plain `en-US` would render ৫০ লক্ষ as "5,000,000" — grouped in a way nobody here
 *     reads prices in.
 */

export type Locale = 'en' | 'bn';

/** What every formatter renders when a value is absent. Never "0" — see §3.6 of
 *  FRONTEND.md: the API's nulls mean "no data yet", and 0 would read as a real figure. */
export const EMPTY = '—';

const CURRENCY_SYMBOL = '৳';

/** en-IN, not en-US: Indian grouping is what prices are read in here, in both languages. */
function intlLocale(locale: Locale): string {
  return locale === 'bn' ? 'bn-BD' : 'en-IN';
}

type Numeric = string | number | null | undefined;

function isBlank(value: Numeric): value is null | undefined | '' {
  return value === null || value === undefined || value === '';
}

/**
 * Formats without converting to a JS number where the input is already a string.
 * `Intl.NumberFormat.format` has accepted strings since ES2023 and formats them
 * exactly — no float round-trip, so a 12-digit Taka amount cannot lose a paisa.
 */
function formatNumeric(
  value: string | number,
  locale: Locale,
  options: Intl.NumberFormatOptions,
): string {
  const formatter = new Intl.NumberFormat(intlLocale(locale), options);
  return formatter.format(value as number);
}

// ── numbers ──────────────────────────────────────────────────────────────────

export function formatNumber(value: Numeric, locale: Locale): string {
  if (isBlank(value)) return EMPTY;
  return formatNumeric(value, locale, { maximumFractionDigits: 2 });
}

/** Bare integer with no grouping — counts, ids, "3 of 12". */
export function formatCount(value: Numeric, locale: Locale): string {
  if (isBlank(value)) return EMPTY;
  return formatNumeric(value, locale, { useGrouping: false, maximumFractionDigits: 0 });
}

export function formatPercent(value: Numeric, locale: Locale, digits = 1): string {
  if (isBlank(value)) return EMPTY;
  return `${formatNumeric(value, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}%`;
}

/** Signed, for month-on-month deltas: +50%, −12.5%. Uses a true minus sign (U+2212),
 *  not a hyphen — a hyphen next to a digit reads as a range. */
export function formatDelta(value: Numeric, locale: Locale, digits = 1): string {
  if (isBlank(value)) return EMPTY;
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return EMPTY;

  const magnitude = formatNumeric(Math.abs(numeric), locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
  const sign = numeric > 0 ? '+' : numeric < 0 ? '−' : '';
  return `${sign}${magnitude}%`;
}

// ── money ────────────────────────────────────────────────────────────────────

/** Full precision: ৳ ৫০,০০,০০০ — for detail pages, tables and inputs. */
export function formatMoney(value: Numeric, locale: Locale): string {
  if (isBlank(value)) return EMPTY;
  // Paisa are dropped: no property in this business is priced to the paisa, and two
  // trailing zeros on every figure is noise. `.00` is preserved in the data, not the UI.
  return `${CURRENCY_SYMBOL} ${formatNumeric(value, locale, { maximumFractionDigits: 0 })}`;
}

const LAKH = 100_000;
const CRORE = 10_000_000;

const UNIT_LABELS: Record<Locale, { lakh: string; crore: string; thousand: string }> = {
  en: { lakh: 'Lakh', crore: 'Crore', thousand: 'K' },
  bn: { lakh: 'লক্ষ', crore: 'কোটি', thousand: 'হাজার' },
};

/**
 * Spoken shorthand: ৳ ৫০ লক্ষ, ৳ 1.2 Crore.
 *
 * This is how prices are actually said out loud in Bangladesh, and it is far easier to
 * compare at a glance in a list than a row of full figures. Below one lakh it falls
 * through to the full form, because "৳ 45 K" is not how anyone talks.
 */
export function formatMoneyShort(value: Numeric, locale: Locale): string {
  if (isBlank(value)) return EMPTY;

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return EMPTY;

  const absolute = Math.abs(numeric);
  const labels = UNIT_LABELS[locale];

  /**
   * Rounding is applied *before* the unit is chosen, not after.
   *
   * Picking the unit from the raw value and then rounding the scaled figure lets the
   * rounded number cross into the next unit while the label stays behind:
   * ৯৯,৯৯,৯৯৯ is just under a crore, so it took the lakh branch, and 99.99999 rounded
   * to 100 — printing "১০০ লক্ষ", which nobody says. The same fault turned
   * ৯,৯৯,৯৯,৯৯৯ into "১০ কোটি".
   *
   * So each candidate unit is rounded first and only accepted if the result still
   * belongs to that unit; otherwise it promotes to the next one.
   */
  if (absolute >= CRORE) {
    return withUnit(numeric / CRORE, labels.crore, locale);
  }

  if (absolute >= LAKH) {
    const scaled = round2(numeric / LAKH);
    // 100 lakh *is* a crore. Promote rather than print a figure no one uses.
    if (Math.abs(scaled) >= 100) return withUnit(numeric / CRORE, labels.crore, locale);
    return withUnit(numeric / LAKH, labels.lakh, locale);
  }

  return formatMoney(value, locale);
}

/** `৳ ১.২ লক্ষ` — the scaled figure rounded to 2dp, with its unit. */
function withUnit(scaled: number, unit: string, locale: Locale): string {
  return `${CURRENCY_SYMBOL} ${formatNumeric(round2(scaled), locale, {
    maximumFractionDigits: 2,
  })} ${unit}`;
}

/** Scaling for display only — the exact value is never derived from this. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── area ─────────────────────────────────────────────────────────────────────

export type AreaUnit = 'KATHA' | 'BIGHA' | 'DECIMAL' | 'SQFT' | 'SQ_YARD' | 'ACRE';

export const AREA_UNIT_LABELS: Record<AreaUnit, Record<Locale, string>> = {
  KATHA: { en: 'Katha', bn: 'কাঠা' },
  BIGHA: { en: 'Bigha', bn: 'বিঘা' },
  DECIMAL: { en: 'Decimal', bn: 'শতাংশ' },
  SQFT: { en: 'sq ft', bn: 'বর্গফুট' },
  SQ_YARD: { en: 'sq yd', bn: 'বর্গগজ' },
  ACRE: { en: 'Acre', bn: 'একর' },
};

/** "5 Katha" / "৫ কাঠা". */
export function formatArea(value: Numeric, unit: AreaUnit, locale: Locale): string {
  if (isBlank(value)) return EMPTY;
  const amount = formatNumeric(value, locale, { maximumFractionDigits: 3 });
  return `${amount} ${AREA_UNIT_LABELS[unit][locale]}`;
}

/** "5 Katha (3,600 sq ft)" — the stated unit plus the normalised one, so sizes quoted
 *  in different units stay comparable without the reader converting in their head. */
export function formatAreaWithSqft(
  value: Numeric,
  unit: AreaUnit,
  sqft: Numeric,
  locale: Locale,
): string {
  const primary = formatArea(value, unit, locale);
  if (primary === EMPTY) return EMPTY;
  if (unit === 'SQFT' || isBlank(sqft)) return primary;

  const secondary = formatNumeric(sqft, locale, { maximumFractionDigits: 0 });
  return `${primary} (${secondary} ${AREA_UNIT_LABELS.SQFT[locale]})`;
}

// ── dates ────────────────────────────────────────────────────────────────────

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Month length differs by language on purpose.
 *
 * English abbreviates ("13 Aug 2026") because it saves width in table cells and reads
 * naturally. Bangla does not: the abbreviated form is "১৩ আগ, ২০২৬", and clipped month
 * names are not idiomatic in Bengali the way "Aug" is in English. So Bangla uses the
 * full name — "১৩ আগস্ট, ২০২৬".
 */
const MONTH_STYLE: Record<Locale, 'short' | 'long'> = { en: 'short', bn: 'long' };

/** 13 Aug 2026 / ১৩ আগস্ট, ২০২৬ */
export function formatDate(value: string | Date | null | undefined, locale: Locale): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: MONTH_STYLE[locale],
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(
  value: string | Date | null | undefined,
  locale: Locale,
): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: MONTH_STYLE[locale],
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** 2026-08 → August 2026 / আগস্ট ২০২৬. The dashboard timeseries returns this shape. */
export function formatMonth(value: string, locale: Locale): string {
  const [year, month] = value.split('-');
  if (!year || !month) return value;

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: MONTH_STYLE[locale],
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "3 days ago" / "৩ দিন আগে". Used for timeline entries and "last touched". */
export function formatRelative(
  value: string | Date | null | undefined,
  locale: Locale,
  now: Date = new Date(),
): string {
  const date = toDate(value);
  if (!date) return EMPTY;

  const elapsed = date.getTime() - now.getTime();
  const magnitude = Math.abs(elapsed);
  const formatter = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' });

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (magnitude >= ms) {
      return formatter.format(Math.round(elapsed / ms), unit);
    }
  }

  return formatter.format(0, 'second');
}

/** Plain day count for stale-deal badges: "12 days". */
export function formatDayCount(days: number | null | undefined, locale: Locale): string {
  if (days === null || days === undefined) return EMPTY;
  return formatNumeric(days, locale, { maximumFractionDigits: 0 });
}

// ── input normalisation ──────────────────────────────────────────────────────

const BENGALI_ZERO = 0x09e6;

/**
 * "১২৩" → "123".
 *
 * Applied to numeric *input* only, never to stored text. A property title like
 * "৫ কাঠা জমি" is prose the user typed on purpose, and converting its digits would
 * corrupt it. The backend takes the same position — see backend/src/utils/bengali.ts.
 */
export function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (digit) => String(digit.codePointAt(0)! - BENGALI_ZERO));
}

/**
 * Prepares typed input for the API: Bengali digits to ASCII, grouping separators
 * stripped, whitespace removed. Returns a plain string — the client never parses it
 * into a number, so nothing can be lost on the way.
 */
export function normalizeNumericInput(input: string): string {
  return toAsciiDigits(input)
    .replace(/[,৷\s]/g, '')
    .trim();
}
