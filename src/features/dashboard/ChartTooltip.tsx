import type { ReactNode } from 'react';

/**
 * The tooltip body shared by the area, line and donut charts.
 *
 * Recharts' default tooltip is a white box with inline styles — it ignores the theme and
 * is unreadable in dark mode. This one is plain markup using the app's own tokens, and
 * it renders values already formatted by the caller, so Bangla numerals appear here too
 * rather than the raw `1200000` Recharts would otherwise print.
 */

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export function ChartTooltip({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: TooltipRow[];
  footer?: ReactNode;
}) {
  return (
    <div className="pointer-events-none rounded-sm border border-border bg-surface-overlay px-3 py-2 shadow-md">
      <p className="mb-1 text-caption text-ink-secondary">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-body-sm">
            <span className="flex items-center gap-2 text-ink-secondary">
              {row.color && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              )}
              {row.label}
            </span>
            <span className="tabular font-medium text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-1 border-t border-border pt-1 text-body-sm">{footer}</div>}
    </div>
  );
}
