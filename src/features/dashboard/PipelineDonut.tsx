import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { PropertyStatus } from '@/app/api/types';
import { useFormat } from '@/hooks/useFormat';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';
import { useChartColors } from './useChartColors';
import type { DistributionSlice } from './types';

/**
 * Pipeline health in four slices.
 *
 * Deliberately *not* the eight-status breakdown. Eight slices is unreadable at any size,
 * and the palette validator confirms four arbitrary categorical hues already fail the
 * all-pairs separation test that a pie demands — every slice can touch every other
 * (DESIGN.md §11.2). So the donut answers the question it can answer honestly, in the
 * four semantic status colours, and the eight-stage detail lives in the bar chart
 * beneath it where lengths are directly comparable.
 */

type Bucket = 'active' | 'won' | 'lost' | 'hold';

/** Which of the four buckets each status belongs to. `Record<PropertyStatus, …>` means
 *  a new status added to the API is a compile error here, not a silently dropped slice. */
const BUCKET_OF: Record<PropertyStatus, Bucket> = {
  NEW: 'hold',
  CONTACTED: 'active',
  VISIT_SCHEDULED: 'active',
  NEGOTIATING: 'active',
  AGREEMENT: 'active',
  CLOSED_WON: 'won',
  CLOSED_LOST: 'lost',
  ON_HOLD: 'hold',
};

const BUCKET_ORDER: Bucket[] = ['active', 'won', 'lost', 'hold'];

export const PipelineDonut = memo(function PipelineDonut({
  byStatus,
  isLoading,
}: {
  byStatus: DistributionSlice<PropertyStatus>[] | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const colors = useChartColors();

  const { slices, total } = useMemo(() => {
    const totals: Record<Bucket, number> = { active: 0, won: 0, lost: 0, hold: 0 };
    for (const slice of byStatus ?? []) totals[BUCKET_OF[slice.key]] += slice.count;

    return {
      // Zero-count buckets are dropped: a slice with no area still gets a legend entry
      // and a tooltip target, which is noise.
      slices: BUCKET_ORDER.filter((bucket) => totals[bucket] > 0).map((bucket) => ({
        bucket,
        count: totals[bucket],
        color: colors.status[bucket],
        label: t(`dashboard.bucket.${bucket}`),
      })),
      total: BUCKET_ORDER.reduce((sum, bucket) => sum + totals[bucket], 0),
    };
  }, [byStatus, colors, t]);

  return (
    <ChartCard
      title={t('dashboard.pipelineHealth')}
      subtitle={t('dashboard.pipelineHealthHint')}
      series={slices.map((slice) => ({ label: slice.label, color: slice.color }))}
      isLoading={isLoading}
      isEmpty={total === 0}
      emptyMessage={t('dashboard.noPropertiesYet')}
      height={220}
      table={
        <table>
          <caption>{t('dashboard.pipelineHealth')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('dashboard.stage')}</th>
              <th scope="col">{t('dashboard.count')}</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.bucket}>
                <th scope="row">{slice.label}</th>
                <td>{format.count(slice.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="relative h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer={false}>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              // A 2px surface-coloured gap so adjacent slices never blend into one arc.
              paddingAngle={2}
              stroke={colors.surface}
              strokeWidth={2}
              // Starting at 12 o'clock and going clockwise reads as a proportion; the
              // library's default counter-clockwise start does not.
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.bucket} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const slice = payload[0]?.payload as (typeof slices)[number];
                const share = total === 0 ? 0 : (slice.count / total) * 100;
                return (
                  <ChartTooltip
                    title={slice.label}
                    rows={[
                      {
                        label: t('dashboard.count'),
                        value: format.count(slice.count),
                        color: slice.color,
                      },
                      { label: t('dashboard.share'), value: format.percent(share, 0) },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* The hole carries the total — the number the ring is a breakdown of. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-h1 text-ink">{format.count(total)}</span>
          <span className="text-caption text-ink-muted">{t('dashboard.properties')}</span>
        </div>
      </div>
    </ChartCard>
  );
});
