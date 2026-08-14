import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PROPERTY_STATUSES, PROPERTY_TYPES } from '@/app/api/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/cn';
import { FunnelSimple, MagnifyingGlass, X } from '@/lib/icons';
import { PROPERTY_SORT_FIELDS, type PropertyFilters } from './types';

/**
 * Search, sort and filters for the property list.
 *
 * The advanced filters collapse behind a toggle rather than occupying the top of the
 * screen permanently. Search and sort are used constantly; a price range is used
 * occasionally, and on a phone a permanently-expanded filter panel costs the first
 * screenful of results.
 */
export const FilterBar = memo(function FilterBar({
  filters,
  onChange,
  onReset,
  activeCount,
}: {
  filters: PropertyFilters;
  onChange: (patch: Partial<PropertyFilters>) => void;
  onReset: () => void;
  activeCount: number;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Local state so typing is instant; the debounced value is what reaches the URL and
  // the API. Without this, every keystroke would be a request and a history write.
  const [searchText, setSearchText] = useState(filters.q);
  const debouncedSearch = useDebounce(searchText, 300);

  useEffect(() => {
    if (debouncedSearch !== filters.q) onChange({ q: debouncedSearch });
    // `filters.q` is deliberately excluded: including it would re-fire this effect when
    // the URL updates and fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Adjusting state during render, not in an effect.
  //
  // The box needs local state so typing is instant, but it must also follow the URL when
  // that changes from elsewhere — a cleared filter, the back button. Doing that in an
  // effect means an extra render pass every time and triggers a cascading-render warning;
  // React documents this comparison-during-render pattern for exactly this case.
  const [lastSyncedQuery, setLastSyncedQuery] = useState(filters.q);
  if (lastSyncedQuery !== filters.q) {
    setLastSyncedQuery(filters.q);
    setSearchText(filters.q);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon
            icon={MagnifyingGlass}
            size="sm"
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
            placeholder={t('property.searchPlaceholder')}
            aria-label={t('action.search')}
            className={cn(
              'h-10 coarse:min-h-11 w-full rounded-sm border border-border-strong bg-surface ps-10 pe-3',
              'text-body text-ink placeholder:text-ink-muted',
              'transition-colors duration-fast ease-standard hover:border-ink-muted',
            )}
          />
        </div>

        <Button
          variant={expanded || activeCount > 0 ? 'primary' : 'secondary'}
          icon={FunnelSimple}
          onClick={() => {
            setExpanded((value) => !value);
          }}
          aria-expanded={expanded}
        >
          <span className="hidden sm:inline">{t('list.filters')}</span>
          {activeCount > 0 && <span className="tabular">{activeCount}</span>}
        </Button>
      </div>

      {expanded && (
        <div className="grid gap-3 rounded-md border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label={t('enums:propertyStatus.NEW') && t('list.filters')}
            placeholder={t('property.anyStatus')}
            value={filters.status[0] ?? ''}
            onChange={(event) => {
              onChange({
                status: event.target.value
                  ? [event.target.value as PropertyFilters['status'][number]]
                  : [],
              });
            }}
            options={PROPERTY_STATUSES.map((status) => ({
              value: status,
              label: t(`enums:propertyStatus.${status}`),
            }))}
          />

          <Select
            label={t('property.anyType')}
            placeholder={t('property.anyType')}
            value={filters.type[0] ?? ''}
            onChange={(event) => {
              onChange({
                type: event.target.value
                  ? [event.target.value as PropertyFilters['type'][number]]
                  : [],
              });
            }}
            options={PROPERTY_TYPES.map((type) => ({
              value: type,
              label: t(`enums:propertyType.${type}`),
            }))}
          />

          <div className="flex flex-col gap-1">
            <span className="text-body-sm font-medium text-ink-secondary">
              {t('property.priceRange')}
            </span>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={filters.priceMin}
                onChange={(event) => {
                  onChange({ priceMin: event.target.value });
                }}
                placeholder={t('property.min')}
                aria-label={`${t('property.priceRange')} ${t('property.min')}`}
                className="tabular h-10 w-full coarse:min-h-11 rounded-sm border border-border-strong bg-surface px-3 text-body-sm text-ink"
              />
              <span className="text-ink-muted">–</span>
              <input
                inputMode="numeric"
                value={filters.priceMax}
                onChange={(event) => {
                  onChange({ priceMax: event.target.value });
                }}
                placeholder={t('property.max')}
                aria-label={`${t('property.priceRange')} ${t('property.max')}`}
                className="tabular h-10 w-full coarse:min-h-11 rounded-sm border border-border-strong bg-surface px-3 text-body-sm text-ink"
              />
            </div>
          </div>

          <Select
            label={t('list.sortBy')}
            value={filters.sortBy}
            onChange={(event) => {
              onChange({ sortBy: event.target.value as PropertyFilters['sortBy'] });
            }}
            options={PROPERTY_SORT_FIELDS.map((field) => ({
              value: field,
              label: t(`property.sort.${field}`),
            }))}
          />

          {activeCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-4">
              <Button variant="ghost" size="sm" icon={X} onClick={onReset}>
                {t('action.clearFilters')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
