import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFormat } from '@/hooks/useFormat';
import { ChartCard } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';
import { useChartColors } from './useChartColors';
import type { TimeseriesPoint } from './types';

/**
 * Commission by month, received stacked on pending.
 *
 * Stacked rather than side-by-side because the two parts sum to something meaningful —
 * total commission earned that month — and the stack shows that total as the silhouette
 * while still splitting it. Side-by-side bars would show the same two numbers but hide
 * the total, which is the number the user cares about most.
 *
 * The values are strings from the API and are only converted to numbers *here*, for the
 * geometry. Every number the user reads goes back through the formatter.
 */

interface Row {
  month: string;
  received: number;
  pending: number;
  receivedRaw: string;
  pendingRaw: string;
  totalRaw: string;
}

export const EarningsAreaChart = memo(function EarningsAreaChart({
  points,
  isLoading,
  action,
}: {
  points: TimeseriesPoint[] | undefined;
  isLoading: boolean;
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const colors = useChartColors();

  const rows: Row[] = (points ?? []).map((point) => ({
    month: point.month,
    received: Number(point.received),
    pending: Number(point.pending),
    receivedRaw: point.received,
    pendingRaw: point.pending,
    totalRaw: point.total,
  }));

  // Empty means "no money in any month", not "no rows" — the server always returns a row
  // per month, so a new user gets twelve zeroes rather than an empty array.
  const isEmpty = rows.length === 0 || rows.every((row) => row.received + row.pending === 0);

  const series = [
    { label: t('dashboard.received'), color: colors.series[0] },
    { label: t('dashboard.pending'), color: colors.series[1] },
  ];

  return (
    <ChartCard
      title={t('dashboard.earningsByMonth')}
      subtitle={t('dashboard.earningsByMonthHint')}
      series={series}
      action={action}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage={t('dashboard.noEarningsYet')}
      table={
        <table>
          <caption>{t('dashboard.earningsByMonth')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('dashboard.month')}</th>
              <th scope="col">{t('dashboard.received')}</th>
              <th scope="col">{t('dashboard.pending')}</th>
              <th scope="col">{t('dashboard.total')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <th scope="row">{format.month(row.month)}</th>
                <td>{format.money(row.receivedRaw)}</td>
                <td>{format.money(row.pendingRaw)}</td>
                <td>{format.money(row.totalRaw)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          accessibilityLayer={false}
          data={rows}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <defs>
            {/* 14% at the top fading to 2%: enough to read as an area, faint enough that
                the stacked boundary stays the strongest line in the chart. */}
            {[0, 1].map((index) => (
              <linearGradient
                key={index}
                id={`earnings-fill-${String(index)}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={colors.series[index]} stopOpacity={0.14} />
                <stop offset="100%" stopColor={colors.series[index]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(value: string) => format.month(value)}
            stroke={colors.axis}
            tick={{ fill: colors.tick, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: colors.axis }}
            minTickGap={8}
          />
          <YAxis
            // Short form on the axis — "৳ ১২ লক্ষ" fits where the full figure would not,
            // and the tooltip carries the exact number.
            tickFormatter={(value: number) => format.moneyShort(value)}
            stroke={colors.axis}
            tick={{ fill: colors.tick, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            cursor={{ stroke: colors.axis, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as Row;
              return (
                <ChartTooltip
                  title={format.month(row.month)}
                  rows={[
                    {
                      label: t('dashboard.received'),
                      value: format.money(row.receivedRaw),
                      color: colors.series[0],
                    },
                    {
                      label: t('dashboard.pending'),
                      value: format.money(row.pendingRaw),
                      color: colors.series[1],
                    },
                  ]}
                  footer={
                    <span className="flex items-center justify-between gap-4">
                      <span className="text-ink-secondary">{t('dashboard.total')}</span>
                      <span className="tabular font-medium text-ink">
                        {format.money(row.totalRaw)}
                      </span>
                    </span>
                  }
                />
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="received"
            stackId="earnings"
            stroke={colors.series[0]}
            strokeWidth={2}
            fill="url(#earnings-fill-0)"
            // The 2px surface-coloured separator between stacked segments (DESIGN.md
            // §11.4) — without it the two fills touch and the boundary disappears.
            activeDot={{ r: 4, strokeWidth: 2, stroke: colors.surface }}
          />
          <Area
            type="monotone"
            dataKey="pending"
            stackId="earnings"
            stroke={colors.series[1]}
            strokeWidth={2}
            fill="url(#earnings-fill-1)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: colors.surface }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
