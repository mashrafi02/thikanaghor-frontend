import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

/**
 * The frame every chart sits in.
 *
 * It exists so three things are impossible to forget rather than remembered four times:
 *
 *  • **A legend for two or more series**, so identity is never carried by colour alone.
 *  • **A table equivalent**, visually hidden but read by a screen reader — an `<svg>` of
 *    paths is otherwise completely opaque to one.
 *  • **Loading and empty states**, which are the states a new user actually sees first.
 *    A chart with no data must say so, not render empty axes that look broken.
 */

export interface ChartSeries {
  label: string;
  color: string;
}

export function ChartCard({
  title,
  subtitle,
  series,
  action,
  isLoading,
  isEmpty,
  emptyMessage,
  table,
  height = 240,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  /** Rendered as the legend. One series needs none — the title names it. */
  series?: ChartSeries[];
  action?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  /** The same numbers as a table, for assistive tech. */
  table?: ReactNode;
  height?: number;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const showLegend = series !== undefined && series.length >= 2;

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col gap-4 rounded-md border border-border bg-surface p-4 shadow-sm md:p-5',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="text-h3 text-ink">
            {title}
          </h2>
          {subtitle && <p className="text-body-sm text-ink-secondary">{subtitle}</p>}
        </div>
        {action}
      </header>

      {showLegend && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {series.map((entry) => (
            <li
              key={entry.label}
              className="flex items-center gap-2 text-body-sm text-ink-secondary"
            >
              {/* A mark beside text ink, never the label painted in the series colour —
                  coloured text is the thing that fails contrast (DESIGN.md §11). */}
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.label}
            </li>
          ))}
        </ul>
      )}

      {isLoading ? (
        <div style={{ height }}>
          <Skeleton className="h-full w-full rounded-sm" />
        </div>
      ) : isEmpty ? (
        <div
          className="flex items-center justify-center rounded-sm border border-dashed border-border px-4 text-center text-body-sm text-ink-muted"
          style={{ height }}
        >
          {emptyMessage ?? t('dashboard.noData')}
        </div>
      ) : (
        <>
          {/* `aria-hidden` on the visual chart, with the table below carrying the data:
              a screen reader announcing 40 unlabelled SVG paths is worse than silence.

              `inert` is what makes that stick. Recharts puts `tabindex="0"` on its own
              elements — the `<svg>` for cartesian charts, and the `<g class="recharts-pie">`
              for the donut, which ignores the `tabIndex` prop entirely. Either way a
              focusable element ends up *inside* an aria-hidden subtree, which is an axe
              violation and a real defect: keyboard focus enters a region screen readers
              are told does not exist. `inert` removes the whole subtree from the focus
              order rather than fighting the library element by element. */}
          <div aria-hidden="true" inert style={{ height }}>
            {children}
          </div>
          {table && <div className="sr-only">{table}</div>}
        </>
      )}
    </section>
  );
}
