import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type AreaUnit,
  EMPTY,
  formatArea,
  formatAreaWithSqft,
  formatCount,
  formatDate,
  formatDateTime,
  formatDayCount,
  formatDelta,
  formatMoney,
  formatMoneyShort,
  formatMonth,
  formatNumber,
  formatPercent,
  formatRelative,
  type Locale,
} from '@/lib/format';

/**
 * Every number, amount and date in the UI goes through this hook.
 *
 * The rule it exists to enforce: no component calls `.toLocaleString()` or does its own
 * date maths. One binding point means switching language reformats the entire app, and
 * there is exactly one place to fix a formatting bug.
 *
 * Memoised on the active language, so the returned object is stable between renders and
 * safe to put in a dependency array.
 */
export function useFormat() {
  const { i18n } = useTranslation();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'bn';

  return useMemo(
    () => ({
      locale,
      /** The em dash every formatter returns for an absent value. */
      empty: EMPTY,

      money: (value: string | number | null | undefined) => formatMoney(value, locale),
      moneyShort: (value: string | number | null | undefined) =>
        formatMoneyShort(value, locale),
      number: (value: string | number | null | undefined) => formatNumber(value, locale),
      count: (value: string | number | null | undefined) => formatCount(value, locale),
      percent: (value: string | number | null | undefined, digits?: number) =>
        formatPercent(value, locale, digits),
      delta: (value: string | number | null | undefined, digits?: number) =>
        formatDelta(value, locale, digits),

      area: (value: string | number | null | undefined, unit: AreaUnit) =>
        formatArea(value, unit, locale),
      areaWithSqft: (
        value: string | number | null | undefined,
        unit: AreaUnit,
        sqft: string | number | null | undefined,
      ) => formatAreaWithSqft(value, unit, sqft, locale),

      date: (value: string | Date | null | undefined) => formatDate(value, locale),
      dateTime: (value: string | Date | null | undefined) => formatDateTime(value, locale),
      month: (value: string) => formatMonth(value, locale),
      relative: (value: string | Date | null | undefined) => formatRelative(value, locale),
      days: (value: number | null | undefined) => formatDayCount(value, locale),
    }),
    [locale],
  );
}
