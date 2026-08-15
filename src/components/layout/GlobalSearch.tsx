import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { useGetBuyersQuery } from '@/features/buyers/buyerApi';
import { DEFAULT_BUYER_FILTERS } from '@/features/buyers/useBuyerFilters';
import { useGetPropertiesQuery } from '@/features/properties/propertyApi';
import { DEFAULT_FILTERS } from '@/features/properties/usePropertyFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import { Buildings, MagnifyingGlass, Users, X } from '@/lib/icons';

/**
 * Global search across properties and buyers.
 *
 * The topbar carried a `<div>` shaped like a search field for several milestones — real
 * border, real placeholder, real magnifier — that could not be focused or typed into. It
 * looked exactly like a broken input rather than an unbuilt one, which is worse than
 * having nothing there.
 *
 * Both `/properties` and `/buyers` already accept `?q=`, so this is entirely a frontend
 * concern: two existing queries, capped at five results each.
 *
 * Note the eager imports of both feature APIs. Their pages are lazy routes, so this pulls
 * the two `injectEndpoints` calls into the startup chunk. That is deliberate — search has
 * to work before either page has ever been visited — and it is only the endpoint
 * definitions, not the page components, that come along.
 */

/** Below this, results are noise: one Bangla character matches most of the database. */
const MIN_QUERY = 2;
const RESULTS_PER_GROUP = 5;

interface Hit {
  key: string;
  to: string;
  label: string;
  detail: string;
  kind: 'property' | 'buyer';
  status?: React.ReactNode;
}

export function GlobalSearch() {
  const { t } = useTranslation(['common', 'enums']);
  const navigate = useNavigate();
  const format = useFormat();

  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const term = useDebounce(text.trim(), 300);
  const enabled = term.length >= MIN_QUERY;

  // `skip` rather than a conditional hook: RTK Query keeps the previous data around while
  // a new term is in flight, so the list does not blank out between keystrokes.
  const properties = useGetPropertiesQuery(
    { ...DEFAULT_FILTERS, q: term, limit: RESULTS_PER_GROUP },
    { skip: !enabled },
  );
  const buyers = useGetBuyersQuery(
    { ...DEFAULT_BUYER_FILTERS, q: term, limit: RESULTS_PER_GROUP },
    { skip: !enabled },
  );

  const hits = useMemo<Hit[]>(() => {
    if (!enabled) return [];

    const propertyHits: Hit[] = (properties.data?.items ?? []).map((property) => ({
      key: `property:${property.id}`,
      to: `/properties/${property.id}`,
      label: property.title,
      detail: [
        format.moneyShort(property.askingPrice),
        [property.areaName, property.district].filter(Boolean).join(', '),
      ]
        .filter(Boolean)
        .join(' · '),
      kind: 'property',
      status: <StatusPill status={property.status} size="sm" />,
    }));

    const buyerHits: Hit[] = (buyers.data?.items ?? []).map((buyer) => ({
      key: `buyer:${buyer.id}`,
      to: `/buyers/${buyer.id}`,
      label: buyer.name,
      detail: buyer.phones[0]?.display ?? '',
      kind: 'buyer',
    }));

    return [...propertyHits, ...buyerHits];
  }, [enabled, properties.data, buyers.data, format]);

  const loading = enabled && (properties.isFetching || buyers.isFetching);

  // A term change invalidates the highlight — index 2 of the old results is a different
  // record in the new ones, and Enter would open something the user never looked at.
  //
  // Adjusted during render rather than in an effect: an effect would paint one frame with
  // the stale highlight still on screen, and React flags the cascading render besides.
  // Same idiom as FilterBar's `lastSyncedQuery`.
  const [lastTerm, setLastTerm] = useState(term);
  if (lastTerm !== term) {
    setLastTerm(term);
    setActive(-1);
  }

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const go = useCallback(
    (to: string) => {
      close();
      setText('');
      void navigate(to);
    },
    [close, navigate],
  );

  /** Enter with nothing highlighted falls through to the full property list, which has
   *  the filters and pagination this five-row preview does not. */
  const seeAll = useCallback(() => {
    if (!text.trim()) return;
    go(`/properties?q=${encodeURIComponent(text.trim())}`);
  }, [go, text]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // First press closes the panel, second clears the field — pressing Escape once
      // should never lose what was typed.
      if (open && hits.length > 0) close();
      else setText('');
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (hits.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActive((previous) => {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const next = previous + step;
        // Wraps at both ends so the list is a loop rather than a dead stop.
        if (next < 0) return hits.length - 1;
        if (next >= hits.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const hit = hits[active];
      if (hit) go(hit.to);
      else seeAll();
    }
  };

  // Closes on a click anywhere else. Uses `mousedown` rather than `click` so the panel is
  // gone before a click on the page behind it lands.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, close]);

  const showPanel = open && text.trim().length > 0;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  return (
    <div
      ref={containerRef}
      className="relative ms-auto hidden min-w-0 flex-1 items-center md:flex md:max-w-[420px]"
    >
      <div
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-sm border px-3',
          'transition-colors duration-fast ease-standard',
          showPanel ? 'border-border-strong bg-surface' : 'border-border bg-surface-sunken',
        )}
      >
        <Icon icon={MagnifyingGlass} size="sm" className="shrink-0 text-ink-muted" />
        <input
          ref={inputRef}
          type="text"
          // Not type="search": WebKit adds its own clear affordance, which sits beside the
          // one below and does not follow the app's tokens.
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('common:search.placeholder')}
          aria-label={t('common:action.search')}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          className={cn(
            'min-w-0 flex-1 bg-transparent text-body-sm text-ink outline-none',
            'placeholder:text-ink-muted',
          )}
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText('');
              inputRef.current?.focus();
            }}
            aria-label={t('common:action.close')}
            className="shrink-0 rounded-sm p-1 text-ink-muted transition-colors duration-fast hover:text-ink"
          >
            <Icon icon={X} size="sm" />
          </button>
        )}
      </div>

      {/* Announced separately from the visual list: a screen reader user moving through
          options with the arrow keys hears each one, but never learns how many there are. */}
      <span className="sr-only" role="status" aria-live="polite">
        {showPanel && !loading
          ? t('common:list.resultCount', {
              count: hits.length,
              formatted: format.count(hits.length),
            })
          : ''}
      </span>

      {showPanel && (
        <div
          className={cn(
            'absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md',
            'border border-border bg-surface shadow-lg',
          )}
        >
          <ul id={listboxId} role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
            {!enabled && (
              <li className="px-3 py-6 text-center text-body-sm text-ink-muted">
                {t('common:search.hint')}
              </li>
            )}

            {enabled && hits.length === 0 && (
              <li className="px-3 py-6 text-center text-body-sm text-ink-muted">
                {loading ? t('common:state.loading') : t('common:state.noResults')}
              </li>
            )}

            {hits.map((hit, index) => {
              // The group heading precedes the first hit of each kind. Rendered inside the
              // listbox as a presentational row so the option indices stay a flat list —
              // which is what the arrow keys walk.
              const isFirstOfKind = index === 0 || hits[index - 1]?.kind !== hit.kind;

              return (
                <li key={hit.key} role="presentation">
                  {isFirstOfKind && (
                    <div
                      role="presentation"
                      className="flex items-center gap-2 px-3 pb-1 pt-2 text-caption font-medium uppercase tracking-wide text-ink-muted"
                    >
                      <Icon
                        icon={hit.kind === 'property' ? Buildings : Users}
                        size="sm"
                        className="size-3"
                      />
                      {t(hit.kind === 'property' ? 'common:nav.properties' : 'common:nav.buyers')}
                    </div>
                  )}

                  <div
                    id={optionId(index)}
                    role="option"
                    aria-selected={active === index}
                    tabIndex={-1}
                    // Pointer, not click: mousedown on the panel would otherwise blur the
                    // input and close it before the click could register.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      go(hit.to);
                    }}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 px-3 py-2',
                      active === index ? 'bg-surface-overlay' : 'bg-transparent',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body-sm font-medium text-ink">
                        {hit.label}
                      </span>
                      {hit.detail && (
                        <span className="truncate text-caption text-ink-muted">
                          {hit.detail}
                        </span>
                      )}
                    </div>
                    {hit.status}
                  </div>
                </li>
              );
            })}
          </ul>

          {enabled && hits.length > 0 && (
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                seeAll();
              }}
              className="w-full border-t border-border px-3 py-2 text-start text-caption text-accent hover:bg-surface-overlay"
            >
              {t('common:search.viewAll')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
