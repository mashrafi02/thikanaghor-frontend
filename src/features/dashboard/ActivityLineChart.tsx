import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
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
 * Records added vs deals closed, per month.
 *
 * Both are counts of the same kind of thing, so they share one axis honestly — this is
 * the chart that would be tempting to give a second y-scale, and the answer is no
 * (DESIGN.md §11.3). Added is almost always the larger line; that gap *is* the finding,
 * and a dual axis would erase it by stretching the smaller series to match.
 */

interface Row {
  month: string;
  added: number;
  closed: number;
}

export const ActivityLineChart = memo(function ActivityLineChart({
  points,
  isLoading,
}: {
  points: TimeseriesPoint[] | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const colors = useChartColors();

  const rows: Row[] = (points ?? []).map((point) => ({
    month: point.month,
    added: point.propertiesAdded,
    closed: point.dealsClosed,
  }));

  const isEmpty = rows.length === 0 || rows.every((row) => row.added + row.closed === 0);

  const series = [
    { label: t('dashboard.added'), color: colors.series[2] },
    { label: t('dashboard.closed'), color: colors.series[0] },
  ];

  return (
    <ChartCard
      title={t('dashboard.activity')}
      subtitle={t('dashboard.activityHint')}
      series={series}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage={t('dashboard.noActivityYet')}
      table={
        <table>
          <caption>{t('dashboard.activity')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('dashboard.month')}</th>
              <th scope="col">{t('dashboard.added')}</th>
              <th scope="col">{t('dashboard.closed')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <th scope="row">{format.month(row.month)}</th>
                <td>{format.count(row.added)}</td>
                <td>{format.count(row.closed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          accessibilityLayer={false}
          data={rows}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
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
            // Counts are whole things; a "2.5 properties" gridline is nonsense.
            allowDecimals={false}
            tickFormatter={(value: number) => format.count(value)}
            stroke={colors.axis}
            tick={{ fill: colors.tick, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={40}
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
                      label: t('dashboard.added'),
                      value: format.count(row.added),
                      color: colors.series[2],
                    },
                    {
                      label: t('dashboard.closed'),
                      value: format.count(row.closed),
                      color: colors.series[0],
                    },
                  ]}
                />
              );
            }}
          />

          <Line
            type="monotone"
            dataKey="added"
            stroke={colors.series[2]}
            strokeWidth={2}
            // ≥8px hover target even though the resting dot is smaller.
            dot={{ r: 3, strokeWidth: 0, fill: colors.series[2] }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface }}
          />
          <Line
            type="monotone"
            dataKey="closed"
            stroke={colors.series[0]}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: colors.series[0] }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: colors.surface }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});
