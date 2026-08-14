import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  EmptyState,
  ErrorState,
  NoResultsState,
  OfflineState,
} from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { useApiError } from '@/hooks/useApiError';
import { useFormat } from '@/hooks/useFormat';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Buildings, Plus } from '@/lib/icons';
import { FilterBar } from './FilterBar';
import { PropertyFormSheet } from './PropertyFormSheet';
import { useGetPropertiesQuery, useGetPropertyQuery } from './propertyApi';
import { PropertyRow, PropertyRowSkeleton } from './PropertyRow';
import { usePropertyFilters } from './usePropertyFilters';

/**
 * The property list.
 *
 * Most of the work here is choosing between the six states in FRONTEND.md §10.5.1 —
 * getting that wrong is what makes a list confusing. Specifically:
 *
 *  • A failed request renders an **error**, never an empty state. "No properties yet"
 *    over a network failure reads as *your records are gone*.
 *  • Zero rows with filters active renders **no results** with a way out, not the
 *    first-run invitation to add one.
 *  • A background refetch keeps the rows on screen; only a cold load shows skeletons.
 */
export function PropertyList() {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const format = useFormat();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const resolveError = useApiError();

  const { filters, setFilters, resetFilters, activeFilterCount } = usePropertyFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetPropertiesQuery(filters);

  useEffect(() => {
    document.title = `${t('property.title')} · ${t('appName')}`;
  }, [t]);

  const handlePageChange = useCallback(
    (page: number) => {
      setFilters({ page });
      // A new page starts at the top; keeping the scroll position lands the user in the
      // middle of a fresh list with no idea it changed.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setFilters],
  );

  const goToNew = useCallback(() => {
    void navigate('/properties/new');
  }, [navigate]);

  const items = data?.items ?? [];
  const hasFilters = activeFilterCount > 0;

  // The form is a route, not local state: /properties/new and /properties/:id/edit
  // render the sheet over this list. That keeps it linkable and makes the back button
  // close it, which is what a user expects from a panel that changed the URL.
  const isCreating = location.pathname === '/properties/new';
  const editingId = params['id'];
  const isEditing = Boolean(editingId);

  // Only fetched when actually editing; `skip` keeps the create path from requesting.
  const { data: editTarget } = useGetPropertyQuery(editingId ?? '', { skip: !isEditing });

  const closeSheet = useCallback(() => {
    void navigate('/properties');
  }, [navigate]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-h1 text-ink">{t('property.title')}</h1>
          {data && (
            <span className="tabular text-body-sm text-ink-muted">
              {t('list.resultCount', {
                count: data.meta.total,
                formatted: format.number(data.meta.total),
              })}
            </span>
          )}
        </div>

        <Button variant="primary" icon={Plus} onClick={goToNew}>
          <span className="hidden sm:inline">{t('property.addNew')}</span>
        </Button>
      </header>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        activeCount={activeFilterCount}
      />

      {/* Cold load only. A refetch (page change, focus return) keeps the existing rows
          visible rather than replacing them with skeletons — swapping content the user
          is reading for placeholders is worse than a brief staleness. */}
      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <PropertyRowSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        !online ? (
          <OfflineState onRetry={() => void refetch()} />
        ) : (
          <ErrorState
            message={resolveError(error).text}
            onRetry={() => void refetch()}
            {...(resolveError(error).requestId
              ? { requestId: resolveError(error).requestId }
              : {})}
          />
        )
      ) : items.length === 0 ? (
        hasFilters ? (
          <NoResultsState onClearFilters={resetFilters} />
        ) : (
          <EmptyState
            icon={Buildings}
            title={t('property.empty')}
            description={t('property.emptyHint')}
            action={{ label: t('property.addNew'), onClick: goToNew }}
          />
        )
      ) : (
        <>
          {/* Dimmed rather than replaced while refetching: the content stays readable
              and the change is still visible. */}
          <div className={cnFetching(isFetching)} aria-busy={isFetching || undefined}>
            {items.map((property) => (
              <PropertyRow key={property.id} property={property} />
            ))}
          </div>

          {data && <Pagination meta={data.meta} onPageChange={handlePageChange} />}
        </>
      )}

      <PropertyFormSheet
        open={isCreating || (isEditing && Boolean(editTarget))}
        onClose={closeSheet}
        {...(editTarget ? { property: editTarget } : {})}
      />
    </div>
  );
}

/** Kept out of the JSX so the class string is a literal Tailwind can see. */
function cnFetching(isFetching: boolean): string {
  return isFetching
    ? 'flex flex-col gap-2 opacity-60 transition-opacity duration-base'
    : 'flex flex-col gap-2 transition-opacity duration-base';
}
