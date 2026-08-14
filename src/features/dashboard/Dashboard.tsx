import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useApiError } from '@/hooks/useApiError';
import { ActivityLineChart } from './ActivityLineChart';
import { AttentionList } from './AttentionList';
import {
  useGetAttentionQuery,
  useGetDistributionQuery,
  useGetStatsQuery,
  useGetTimeseriesQuery,
} from './dashboardApi';
import { EarningsAreaChart } from './EarningsAreaChart';
import { EarningsHero } from './EarningsHero';
import { PipelineDonut } from './PipelineDonut';
import { StageBars } from './StageBars';
import { StatRail } from './StatRail';
import { TIMESERIES_RANGES, type TimeseriesRange } from './types';

/**
 * The dashboard.
 *
 * Ordered by what the user needs first, top to bottom: the money, the figures behind it,
 * the deals going cold, then the trends. The attention list sits *above* the charts
 * deliberately — it is the only section that asks the user to do something, and charts
 * are reference material by comparison.
 *
 * The four queries are separate rather than one combined request so a slow aggregate
 * never blocks the headline: the hero renders as soon as `stats` lands, without waiting
 * for a twelve-month series. Each section owns its own loading state for the same reason.
 */
export function Dashboard() {
  const { t } = useTranslation();
  const resolveError = useApiError();
  const [range, setRange] = useState<TimeseriesRange>(6);

  const stats = useGetStatsQuery();
  const timeseries = useGetTimeseriesQuery(range);
  const distribution = useGetDistributionQuery();
  const attention = useGetAttentionQuery(10);

  useEffect(() => {
    document.title = `${t('nav.dashboard')} · ${t('appName')}`;
  }, [t]);

  // Only the stats query blocks the page. If the charts fail the numbers are still
  // useful, so their cards handle their own failure by rendering as empty.
  if (stats.isError) {
    return (
      <ErrorState
        message={resolveError(stats.error).text}
        onRetry={() => void stats.refetch()}
      />
    );
  }

  // The shared control rather than a third hand-rolled copy of the same markup — it also
  // carries the 44px touch floor, which the inline version did not (it was 28px).
  const rangeSwitcher = (
    <SegmentedControl
      size="sm"
      label={t('dashboard.range')}
      value={String(range)}
      onChange={(value) => {
        setRange(Number(value) as TimeseriesRange);
      }}
      options={TIMESERIES_RANGES.map((months) => ({
        value: String(months),
        label: t('dashboard.monthCount', { count: months }),
      }))}
    />
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <h1 className="sr-only">{t('nav.dashboard')}</h1>

      <EarningsHero stats={stats.data} isLoading={stats.isLoading} />

      <StatRail stats={stats.data} isLoading={stats.isLoading} />

      <AttentionList items={attention.data?.items} isLoading={attention.isLoading} />

      <EarningsAreaChart
        points={timeseries.data?.points}
        isLoading={timeseries.isLoading}
        action={rangeSwitcher}
      />

      {/* Two-up from `lg`: the donut is square and short, so pairing it with the stage
          bars uses the width that a full-bleed donut would waste. */}
      <div className="grid gap-4 lg:grid-cols-2 md:gap-6">
        <PipelineDonut
          byStatus={distribution.data?.byStatus}
          isLoading={distribution.isLoading}
        />
        <StageBars byStatus={distribution.data?.byStatus} isLoading={distribution.isLoading} />
      </div>

      <ActivityLineChart points={timeseries.data?.points} isLoading={timeseries.isLoading} />
    </div>
  );
}
