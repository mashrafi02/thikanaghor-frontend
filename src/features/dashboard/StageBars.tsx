import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PROPERTY_STATUSES, type PropertyStatus } from '@/app/api/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFormat } from '@/hooks/useFormat';
import { PROPERTY_STATUS_META } from '@/lib/statusMeta';
import type { DistributionSlice } from './types';

/**
 * The full eight-stage breakdown, as a horizontal bar per stage.
 *
 * Built from plain markup rather than a charting library. A single-series horizontal bar
 * is a `<div>` with a width — pulling in a chart component for it would cost a render
 * tree and gain nothing, and it would make the rows *not* links, which is the feature
 * that matters most here: every bar goes to the property list filtered to that stage, so
 * the chart is a navigation surface rather than a picture.
 *
 * Stages sit in pipeline order, not sorted by size. A funnel that reorders itself as the
 * numbers change is impossible to read across two visits.
 */
export const StageBars = memo(function StageBars({
  byStatus,
  isLoading,
}: {
  byStatus: DistributionSlice<PropertyStatus>[] | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormat();

  const counts = new Map((byStatus ?? []).map((slice) => [slice.key, slice.count]));
  // Bars are scaled against the largest stage, not the total. Against the total, a
  // healthy pipeline's stages would all render as slivers.
  const max = Math.max(1, ...PROPERTY_STATUSES.map((status) => counts.get(status) ?? 0));
  const total = PROPERTY_STATUSES.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0);

  if (isLoading) {
    return (
      <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 shadow-sm md:p-5">
        <Skeleton className="h-6 w-40" />
        <div className="flex flex-col gap-2">
          {PROPERTY_STATUSES.map((status) => (
            <Skeleton key={status} className="h-8 w-full" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="stage-bars-title"
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 shadow-sm md:p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="stage-bars-title" className="text-h3 text-ink">
          {t('dashboard.stageBreakdown')}
        </h2>
        <p className="text-body-sm text-ink-secondary">{t('dashboard.stageBreakdownHint')}</p>
      </div>

      {total === 0 ? (
        <p className="rounded-sm border border-dashed border-border p-6 text-center text-body-sm text-ink-muted">
          {t('dashboard.noPropertiesYet')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {PROPERTY_STATUSES.map((status) => {
            const count = counts.get(status) ?? 0;
            const meta = PROPERTY_STATUS_META[status];

            return (
              <li key={status}>
                <Link
                  to={`/properties?status=${status}`}
                  className="group grid grid-cols-[minmax(6rem,9rem)_1fr_auto] items-center gap-3 rounded-sm px-2 py-2 coarse:min-h-11 transition-colors duration-fast hover:bg-surface-sunken focus-visible:bg-surface-sunken"
                >
                  <span className="truncate text-body-sm text-ink-secondary group-hover:text-ink">
                    {t(meta.labelKey)}
                  </span>

                  {/* The track is always full width so the bars share a baseline and
                      lengths compare; only the fill varies. */}
                  <span className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <span
                      className="block h-full rounded-full transition-[width] duration-slow ease-standard"
                      style={{
                        width: `${String(Math.max(count === 0 ? 0 : 3, (count / max) * 100))}%`,
                        backgroundColor: `rgb(var(--${meta.tone}))`,
                      }}
                    />
                  </span>

                  <span className="tabular w-10 text-end text-body-sm font-medium text-ink">
                    {format.count(count)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
});
