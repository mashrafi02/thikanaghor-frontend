import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Rail, RailItem } from '@/components/ui/Rail';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFormat } from '@/hooks/useFormat';
import {
  Buildings,
  ChartLineUp,
  Handshake,
  Target,
  Users,
  Warning,
  type PhosphorIcon,
} from '@/lib/icons';
import type { DashboardStats } from './types';

/**
 * The six supporting figures.
 *
 * On a phone these are a **swipe rail, not a stack** (DESIGN.md §8). Six stacked tiles
 * is roughly two and a half screens of scrolling before the first chart — which means
 * nobody ever reaches the charts. As a rail they cost one screenful and the peeking
 * seventh edge is what tells the user to swipe. From `md` up there is room for a grid,
 * and the same component becomes one.
 *
 * Every tile that can be acted on is a link. A number the user cannot drill into is a
 * poster, not a dashboard.
 */

interface Tile {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon: PhosphorIcon;
  to?: string;
  /** Draws attention when the figure is one the user should act on. */
  alert?: boolean;
}

export const StatRail = memo(function StatRail({
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
      <Rail itemClassName="md:grid md:w-full md:grid-cols-3 md:gap-4">
        {Array.from({ length: 6 }, (_, index) => (
          <RailItem key={index} className="md:max-w-none">
            {/* Built from the same structure as a real tile rather than a fixed height.
                A hard-coded 104px was 18px short of the 122px the loaded tile measures,
                so every row jumped when the data arrived — most of the dashboard's
                layout shift came from these six blocks. Mirroring the padding, gaps and
                line heights keeps the two identical by construction, so it cannot drift
                again the next time a tile gains a line. */}
            <div className="flex h-full flex-col justify-between gap-3 rounded-md border border-border bg-surface p-4 shadow-sm">
              <Skeleton className="h-5 w-24 rounded-sm" />
              <Skeleton className="h-8 w-20 rounded-sm" />
              <Skeleton className="h-4 w-24 rounded-sm" />
            </div>
          </RailItem>
        ))}
      </Rail>
    );
  }

  const { properties, buyers, pipeline, performance } = stats;

  const tiles: Tile[] = [
    {
      key: 'active',
      label: t('dashboard.activeDeals'),
      value: format.count(pipeline.activeDeals),
      hint: t('dashboard.ofTotal', { value: format.count(properties.total) }),
      icon: Buildings,
      to: '/pipeline',
    },
    {
      key: 'projected',
      label: t('dashboard.projectedCommission'),
      value: format.moneyShort(pipeline.projectedCommission),
      hint: t('dashboard.projectedHint'),
      icon: ChartLineUp,
      to: '/pipeline',
    },
    {
      key: 'won',
      label: t('dashboard.dealsWon'),
      value: format.count(properties.closedWon),
      hint: t('dashboard.lostCount', { value: format.count(properties.closedLost) }),
      icon: Handshake,
      to: '/properties?status=CLOSED_WON',
    },
    {
      key: 'buyers',
      label: t('dashboard.activeBuyers'),
      value: format.count(buyers.active),
      hint: t('dashboard.ofTotal', { value: format.count(buyers.total) }),
      icon: Users,
      to: '/buyers',
    },
    {
      key: 'conversion',
      label: t('dashboard.conversionRate'),
      // null until something has concluded — an em dash, never a misleading 0%.
      value:
        performance.conversionRate === null
          ? format.empty
          : format.percent(performance.conversionRate, 1),
      hint:
        performance.avgDaysToClose === null
          ? t('dashboard.noClosedDeals')
          : t('dashboard.avgDaysToClose', { value: format.days(performance.avgDaysToClose) }),
      icon: Target,
    },
    {
      key: 'stale',
      label: t('dashboard.staleDeals'),
      value: format.count(performance.staleDeals),
      hint: t('dashboard.staleHint'),
      icon: Warning,
      alert: performance.staleDeals > 0,
    },
  ];

  return (
    <Rail itemClassName="md:grid md:w-full md:grid-cols-3 md:gap-4">
      {tiles.map((tile) => (
        <RailItem key={tile.key} className="md:max-w-none">
          <StatTile tile={tile} />
        </RailItem>
      ))}
    </Rail>
  );
});

function StatTile({ tile }: { tile: Tile }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-sm text-ink-secondary">{tile.label}</span>
        <Icon
          icon={tile.icon}
          size="sm"
          className={tile.alert ? 'text-lost-ink' : 'text-ink-muted'}
        />
      </div>
      <span className="tabular text-h1 leading-none text-ink">{tile.value}</span>
      {tile.hint && <span className="text-caption text-ink-muted">{tile.hint}</span>}
    </>
  );

  const className = [
    'flex h-full flex-col justify-between gap-3 rounded-md border bg-surface p-4 shadow-sm',
    tile.alert ? 'border-lost' : 'border-border',
    tile.to
      ? 'transition-colors duration-fast ease-standard hover:border-border-strong hover:bg-surface-sunken'
      : '',
  ].join(' ');

  return tile.to ? (
    <Link to={tile.to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
