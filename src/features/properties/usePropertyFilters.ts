import { useCallback } from 'react';
import {
  AREA_UNITS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type AreaUnit,
  type PropertyStatus,
  type PropertyType,
} from '@/app/api/types';
import { useUrlState } from '@/hooks/useUrlState';
import { PROPERTY_SORT_FIELDS, type PropertyFilters, type PropertySortField } from './types';

/**
 * Property list filters, held in the URL.
 *
 * Parsing is defensive on purpose: these values come from a query string, which a user
 * can edit, a stale bookmark can carry, and a link can be shared with. Anything
 * unrecognised falls back to the default rather than being forwarded to the API, where
 * an invalid `sortBy` would be a 400 and an invalid `limit` would be a hard rejection.
 */

export const DEFAULT_FILTERS: PropertyFilters = {
  q: '',
  status: [],
  type: [],
  district: '',
  priceMin: '',
  priceMax: '',
  areaMin: '',
  areaMax: '',
  areaUnit: 'KATHA',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

function parseEnumList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  const allowedSet = new Set<string>(allowed);
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is T => allowedSet.has(value));
}

function parseFilters(params: URLSearchParams): PropertyFilters {
  const page = Number(params.get('page'));
  const limit = Number(params.get('limit'));
  const sortBy = params.get('sortBy');
  const sortOrder = params.get('sortOrder');
  const areaUnit = params.get('areaUnit');

  return {
    q: params.get('q') ?? DEFAULT_FILTERS.q,
    status: parseEnumList<PropertyStatus>(params.get('status'), PROPERTY_STATUSES),
    type: parseEnumList<PropertyType>(params.get('type'), PROPERTY_TYPES),
    district: params.get('district') ?? DEFAULT_FILTERS.district,
    priceMin: params.get('priceMin') ?? DEFAULT_FILTERS.priceMin,
    priceMax: params.get('priceMax') ?? DEFAULT_FILTERS.priceMax,
    areaMin: params.get('areaMin') ?? DEFAULT_FILTERS.areaMin,
    areaMax: params.get('areaMax') ?? DEFAULT_FILTERS.areaMax,
    areaUnit: (AREA_UNITS as readonly string[]).includes(areaUnit ?? '')
      ? (areaUnit as AreaUnit)
      : DEFAULT_FILTERS.areaUnit,
    sortBy: (PROPERTY_SORT_FIELDS as readonly string[]).includes(sortBy ?? '')
      ? (sortBy as PropertySortField)
      : DEFAULT_FILTERS.sortBy,
    sortOrder: sortOrder === 'asc' ? 'asc' : DEFAULT_FILTERS.sortOrder,
    page: Number.isInteger(page) && page > 0 ? page : DEFAULT_FILTERS.page,
    // Clamped rather than forwarded: the server rejects a limit above 100 outright, and
    // a stale bookmark should still render a page.
    limit:
      Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : DEFAULT_FILTERS.limit,
  };
}

/** Only non-default values are written, so a clean list has a clean URL. */
function serializeFilters(filters: PropertyFilters): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.q) params['q'] = filters.q;
  if (filters.status.length) params['status'] = filters.status.join(',');
  if (filters.type.length) params['type'] = filters.type.join(',');
  if (filters.district) params['district'] = filters.district;
  if (filters.priceMin) params['priceMin'] = filters.priceMin;
  if (filters.priceMax) params['priceMax'] = filters.priceMax;
  if (filters.areaMin) params['areaMin'] = filters.areaMin;
  if (filters.areaMax) params['areaMax'] = filters.areaMax;
  if ((filters.areaMin || filters.areaMax) && filters.areaUnit !== DEFAULT_FILTERS.areaUnit) {
    params['areaUnit'] = filters.areaUnit;
  }
  if (filters.sortBy !== DEFAULT_FILTERS.sortBy) params['sortBy'] = filters.sortBy;
  if (filters.sortOrder !== DEFAULT_FILTERS.sortOrder) params['sortOrder'] = filters.sortOrder;
  if (filters.page !== DEFAULT_FILTERS.page) params['page'] = String(filters.page);
  if (filters.limit !== DEFAULT_FILTERS.limit) params['limit'] = String(filters.limit);

  return params;
}

/** Which fields count as "a filter" for the active-chip row and the empty-state choice. */
const FILTER_FIELDS = [
  'q',
  'status',
  'type',
  'district',
  'priceMin',
  'priceMax',
  'areaMin',
  'areaMax',
] as const;

export function countActiveFilters(filters: PropertyFilters): number {
  return FILTER_FIELDS.reduce((count, field) => {
    const value = filters[field];
    if (Array.isArray(value)) return count + (value.length > 0 ? 1 : 0);
    return count + (value ? 1 : 0);
  }, 0);
}

export function usePropertyFilters() {
  const [filters, update, reset] = useUrlState(parseFilters, serializeFilters);

  /**
   * Changing a filter resets to page 1.
   *
   * Without this, narrowing the filters while on page 3 of a wider result set lands on
   * an empty page — which looks exactly like "no matches" and is the single most
   * confusing bug in a filtered list.
   */
  const setFilters = useCallback(
    (patch: Partial<PropertyFilters>) => {
      const changesResultSet = Object.keys(patch).some(
        (key) => key !== 'page' && key !== 'limit',
      );
      update(changesResultSet ? { ...patch, page: 1 } : patch);
    },
    [update],
  );

  return {
    filters,
    setFilters,
    resetFilters: reset,
    activeFilterCount: countActiveFilters(filters),
  };
}
