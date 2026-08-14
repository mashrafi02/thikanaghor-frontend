import { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * The chart palette, as literal colour strings.
 *
 * Recharts writes `fill` and `stroke` as SVG attributes, so it needs a real colour —
 * a Tailwind class does nothing there, and `var(--chart-1)` breaks the moment a value
 * has to be manipulated (gradient stops, blends). So the tokens are read out of the
 * cascade and handed over as `rgb()` strings, which keeps `tokens.css` the single source
 * of truth (DESIGN.md §11.1) instead of duplicating five hex values into a chart file
 * where they would quietly drift from the validated palette.
 *
 * Recomputed on theme change: dark mode is a *selected* palette, not a filter over the
 * light one, so the values genuinely differ and the charts must repaint.
 */

export interface ChartColors {
  series: [string, string, string, string, string];
  grid: string;
  axis: string;
  tick: string;
  /** The chart's own background — used for the 2px separator between stacked segments
   *  and the ring around overlapping marks (DESIGN.md §11.4). */
  surface: string;
  status: Record<'won' | 'active' | 'pending' | 'lost' | 'hold', string>;
}

/**
 * `--chart-1: 28 122 82` → `rgb(28 122 82)`. Tokens are stored space-separated so
 * Tailwind can inject an alpha channel; here the raw triple is enough.
 *
 * A missing token falls back to `currentColor`, never `transparent`. That distinction
 * cost a debugging session: a mistyped name painted every axis label transparent, so the
 * ticks were laid out, measured and positioned correctly — and simply invisible, which
 * looks like a layout bug rather than a typo. A wrong-but-visible colour shows up the
 * moment you look at the chart.
 */
function token(styles: CSSStyleDeclaration, name: string): string {
  const raw = styles.getPropertyValue(name).trim();
  if (raw) return `rgb(${raw})`;

  if (import.meta.env.DEV) {
    console.warn(`[charts] CSS custom property "${name}" is not defined in tokens.css`);
  }
  return 'currentColor';
}

function readPalette(): ChartColors {
  const styles = getComputedStyle(document.documentElement);

  return {
    series: [
      token(styles, '--chart-1'),
      token(styles, '--chart-2'),
      token(styles, '--chart-3'),
      token(styles, '--chart-4'),
      token(styles, '--chart-5'),
    ],
    grid: token(styles, '--chart-grid'),
    axis: token(styles, '--chart-axis'),
    tick: token(styles, '--text-muted'),
    surface: token(styles, '--surface'),
    status: {
      won: token(styles, '--won'),
      active: token(styles, '--active'),
      pending: token(styles, '--pending'),
      lost: token(styles, '--lost'),
      hold: token(styles, '--hold'),
    },
  };
}

export function useChartColors(): ChartColors {
  // The *resolved* theme, so this covers all three preference states — including
  // "system" flipping at sunset while the app is open. `useTheme` has already applied
  // the class by the time this memo re-runs, so the read sees the new values.
  const { resolved } = useTheme();

  // `resolved` is not read inside the callback, so the rule flags it as unnecessary —
  // but it is the only correct dependency here. `readPalette` reads the *DOM*, which the
  // linter cannot see, and the value it returns changes precisely when the theme does.
  // Dropping it would freeze the charts on whichever palette loaded first.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => readPalette(), [resolved]);
}
