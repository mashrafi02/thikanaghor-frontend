import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import {
  EmptyState,
  ErrorState,
  NoResultsState,
  OfflineState,
} from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { useApiError } from '@/hooks/useApiError';
import { useDebounce } from '@/hooks/useDebounce';
import { useFormat } from '@/hooks/useFormat';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/cn';
import { MagnifyingGlass, Plus, Users } from '@/lib/icons';
import { BuyerFormSheet } from './BuyerFormSheet';
import { useGetBuyersQuery } from './buyerApi';
import { BuyerRow } from './BuyerRow';
import { useBuyerFilters } from './useBuyerFilters';

/** Same six-state handling as the property list — see FRONTEND.md §10.5.1. */
export function BuyerList() {
  const { t } = useTranslation();
  const format = useFormat();
  const online = useOnlineStatus();
  const resolveError = useApiError();
  const { filters, setFilters, resetFilters, activeFilterCount } = useBuyerFilters();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.q);
  const debounced = useDebounce(searchText, 300);

  useEffect(() => {
    if (debounced !== filters.q) setFilters({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

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

  useEffect(() => {
    document.title = `${t('buyer.title')} · ${t('appName')}`;
  }, [t]);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetBuyersQuery(filters);

  const handlePage = useCallback(
    (page: number) => {
      setFilters({ page });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setFilters],
  );

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-h1 text-ink">{t('buyer.title')}</h1>
          {data && (
            <span className="tabular text-body-sm text-ink-muted">
              {t('list.resultCount', {
                count: data.meta.total,
                formatted: format.number(data.meta.total),
              })}
            </span>
          )}
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setSheetOpen(true);
          }}
        >
          <span className="hidden sm:inline">{t('buyer.addNew')}</span>
        </Button>
      </header>

      <div className="relative">
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
          placeholder={t('buyer.searchPlaceholder')}
          aria-label={t('action.search')}
          className="h-10 w-full rounded-sm border border-border-strong bg-surface ps-10 pe-3 text-body text-ink coarse:min-h-11 placeholder:text-ink-muted"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-md bg-surface-sunken" />
          ))}
        </div>
      ) : isError ? (
        !online ? (
          <OfflineState onRetry={() => void refetch()} />
        ) : (
          <ErrorState message={resolveError(error).text} onRetry={() => void refetch()} />
        )
      ) : items.length === 0 ? (
        activeFilterCount > 0 ? (
          <NoResultsState onClearFilters={resetFilters} />
        ) : (
          <EmptyState
            icon={Users}
            title={t('buyer.empty')}
            description={t('buyer.emptyHint')}
            action={{
              label: t('buyer.addNew'),
              onClick: () => {
                setSheetOpen(true);
              },
            }}
          />
        )
      ) : (
        <>
          <div
            className={cn(
              'flex flex-col gap-2 transition-opacity duration-base',
              isFetching && 'opacity-60',
            )}
          >
            {items.map((buyer) => (
              <BuyerRow key={buyer.id} buyer={buyer} />
            ))}
          </div>
          {data && <Pagination meta={data.meta} onPageChange={handlePage} />}
        </>
      )}

      <BuyerFormSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
