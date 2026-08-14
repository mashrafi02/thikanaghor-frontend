import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import { TrendDown, TrendUp } from '@/lib/icons';
import type { DashboardStats } from './types';

/**
 * The one number the business runs on: commission earned.
 *
 * It gets the largest type on the page and its own surface because everything else on
 * the dashboard is context for it. The received/pending split sits directly underneath,
 * because "earned" and "actually in hand" are different numbers and a referral business
 * lives in the gap between them.
 */
export const EarningsHero = memo(function EarningsHero({
  stats,
  isLoading,
}: {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormat();

  if (isLoading || !stats) {
    return (
      // Mirrors the loaded hero's structure — label, figure, the two-column split, and
      // the month row — rather than three arbitrary bars. The old version was ~160px
      // against a real 268px, so the whole dashboard below it jumped ~100px the moment
      // the stats landed. Matching the shape keeps the two heights in step even if a
      // row is added later.
      <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32 rounded-sm" />
          <Skeleton className="h-12 w-56 rounded-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          {[0, 1].map((index) => (
            <div key={index} className="flex flex-col gap-1">
              <Skeleton className="h-5 w-24 rounded-sm" />
              <Skeleton className="h-8 w-32 rounded-sm" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Skeleton className="h-5 w-20 rounded-sm" />
          <Skeleton className="h-6 w-24 rounded-sm" />
        </div>
      </section>
    );
  }

  const { earnings } = stats;
  const change = earnings.monthChangePercent;

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-body-sm font-medium text-ink-secondary">
          {t('dashboard.totalEarnings')}
        </h2>
        <p className="tabular text-display leading-none text-ink">
          {format.money(earnings.total)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <dt className="flex items-center gap-2 text-body-sm text-ink-secondary">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-won" />
            {t('dashboard.received')}
          </dt>
          <dd className="tabular text-h2 text-ink">{format.money(earnings.received)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="flex items-center gap-2 text-body-sm text-ink-secondary">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-pending" />
            {t('dashboard.pending')}
          </dt>
          <dd className="tabular text-h2 text-ink">{format.money(earnings.pending)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border pt-4">
        <span className="text-body-sm text-ink-secondary">{t('dashboard.thisMonth')}</span>
        <span className="tabular text-h3 text-ink">{format.money(earnings.thisMonth)}</span>

        {/* Suppressed rather than shown as 0% or ∞ when last month was zero: a change
            from nothing is undefined, and "+100%" from a single first sale is noise. */}
        {change !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-body-sm font-medium',
              change >= 0 ? 'bg-won-subtle text-won-ink' : 'bg-lost-subtle text-lost-ink',
            )}
          >
            <Icon icon={change >= 0 ? TrendUp : TrendDown} size="sm" />
            <span className="tabular">{format.delta(change, 1)}</span>
          </span>
        )}
        <span className="text-body-sm text-ink-muted">
          {t('dashboard.vsLastMonth', { value: format.money(earnings.lastMonth) })}
        </span>
      </div>
    </section>
  );
});
