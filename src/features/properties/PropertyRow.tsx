import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import {
  Buildings,
  FacebookLogo,
  MapTrifold,
  Storefront,
  TiktokLogo,
  YoutubeLogo,
} from '@/lib/icons';
import type { Property } from './types';

/**
 * One row in the property list.
 *
 * A **row**, not a card, and the same component at every width — the layout reflows
 * rather than switching to a different component. That is the answer to "don't just
 * stack things vertically on mobile" (DESIGN.md §8): a tall card fits two per screen,
 * this fits eight, so scanning a search result actually works on a phone.
 *
 * Memoised, and the parent passes no inline callbacks, so re-rendering the list on a
 * filter change does not re-render every row.
 */

const TYPE_ICONS = {
  LAND: MapTrifold,
  PLOT: MapTrifold,
  FLAT: Buildings,
  BUILDING: Buildings,
  COMMERCIAL: Storefront,
} as const;

const PROVIDER_ICONS = {
  FACEBOOK: FacebookLogo,
  TIKTOK: TiktokLogo,
  YOUTUBE: YoutubeLogo,
} as const;

export const PropertyRow = memo(function PropertyRow({ property }: { property: Property }) {
  const { t } = useTranslation();
  const format = useFormat();

  const location = [property.areaName, property.district].filter(Boolean).join(', ');
  const firstVideo = property.videos[0];

  return (
    <Link
      to={`/properties/${property.id}`}
      className={cn(
        'group flex items-center gap-3 rounded-md border border-border bg-surface p-3',
        'transition-colors duration-fast ease-standard',
        // Border darkens on hover; no shadow, no lift. A resting card with no shadow is
        // most of what keeps this from looking generated (DESIGN.md §6.3).
        'hover:border-border-strong',
        'md:gap-4 md:p-4',
      )}
    >
      {/* Video thumbnail stand-in. Provider marks are load-bearing here: they tell him
          at a glance whether a listing has a clip he can show a buyer. */}
      <div
        className={cn(
          'relative flex size-14 shrink-0 items-center justify-center rounded-sm',
          'bg-surface-sunken text-ink-muted md:size-16',
        )}
      >
        <Icon icon={TYPE_ICONS[property.type]} size="md" />
        {firstVideo && (
          <span className="absolute -bottom-1 -end-1 flex size-5 items-center justify-center rounded-full bg-surface text-ink-secondary ring-1 ring-border">
            <Icon icon={PROVIDER_ICONS[firstVideo.provider]} size="sm" className="size-3" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Line one: title, and the status pill pushed to the end. */}
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-body font-medium text-ink">
            {property.title}
          </p>
          <StatusPill status={property.status} size="sm" className="hidden sm:inline-flex" />
        </div>

        {/* Line two: price leads because it is what he is scanning for; everything
            else is supporting detail at muted weight. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
          <span className="tabular font-medium text-ink">
            {format.moneyShort(property.askingPrice)}
          </span>

          {property.area && (
            <span className="text-ink-secondary">
              {format.area(property.area, property.areaUnit)}
            </span>
          )}

          {location && <span className="truncate text-ink-muted">{location}</span>}

          <span className="text-ink-muted">{t(`enums:propertyType.${property.type}`)}</span>

          {/* The pill moves onto line two below 640px rather than being dropped —
              status is the thing he most needs to see while scanning. */}
          <StatusPill status={property.status} size="sm" className="sm:hidden" />
        </div>
      </div>

      {/* Desktop-only trailing column: commission is the number the business runs on,
          so it earns permanent space where there is room for it. */}
      <div className="hidden shrink-0 flex-col items-end gap-1 lg:flex">
        {property.commissionAmount ? (
          <span className="tabular text-body-sm font-medium text-won">
            {format.moneyShort(property.commissionAmount)}
          </span>
        ) : property.projectedCommission && property.status !== 'CLOSED_LOST' ? (
          // The "~" prefix and muted weight mark this as a projection, not income.
          // Suppressed entirely on a lost deal: the server still computes it (asking ×
          // rate is defined for any record), but showing it here would imply money that
          // is never coming.
          <span className="tabular text-body-sm text-ink-muted">
            ~{format.moneyShort(property.projectedCommission)}
          </span>
        ) : null}
        <span className="text-caption text-ink-muted">
          {format.relative(property.createdAt)}
        </span>
      </div>
    </Link>
  );
});

/** Matches the row's real height so nothing shifts when data replaces it. */
export function PropertyRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 md:gap-4 md:p-4">
      <div className="size-14 shrink-0 animate-pulse rounded-sm bg-surface-sunken md:size-16" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-4 w-2/3 animate-pulse rounded-sm bg-surface-sunken" />
        <div className="h-3 w-1/2 animate-pulse rounded-sm bg-surface-sunken" />
      </div>
    </div>
  );
}
