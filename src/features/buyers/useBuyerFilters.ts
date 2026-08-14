import { useCallback } from 'react';
import {
  BUYER_STATUSES,
  PROPERTY_TYPES,
  type BuyerStatus,
  type PropertyType,
} from '@/app/api/types';
import { useUrlState } from '@/hooks/useUrlState';
import { BUYER_SORT_FIELDS, type BuyerFilters, type BuyerSortField } from './types';

/** Same shape and the same defensive parsing as the property filters — these values
 *  come from an editable query string and must never be forwarded blindly to the API. */

export const DEFAULT_BUYER_FILTERS: BuyerFilters = {
  q: '',
  status: [],
  preferredType: [],
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

function parseEnumList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  const set = new Set<string>(allowed);
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v): v is T => set.has(v));
}

function parse(params: URLSearchParams): BuyerFilters {
  const page = Number(params.get('page'));
  const limit = Number(params.get('limit'));
  const sortBy = params.get('sortBy');

  return {
    q: params.get('q') ?? '',
    status: parseEnumList<BuyerStatus>(params.get('status'), BUYER_STATUSES),
    preferredType: parseEnumList<PropertyType>(params.get('preferredType'), PROPERTY_TYPES),
    sortBy: (BUYER_SORT_FIELDS as readonly string[]).includes(sortBy ?? '')
      ? (sortBy as BuyerSortField)
      : DEFAULT_BUYER_FILTERS.sortBy,
    sortOrder: params.get('sortOrder') === 'asc' ? 'asc' : 'desc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20,
  };
}

function serialize(filters: BuyerFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.q) params['q'] = filters.q;
  if (filters.status.length) params['status'] = filters.status.join(',');
  if (filters.preferredType.length) params['preferredType'] = filters.preferredType.join(',');
  if (filters.sortBy !== DEFAULT_BUYER_FILTERS.sortBy) params['sortBy'] = filters.sortBy;
  if (filters.sortOrder !== 'desc') params['sortOrder'] = filters.sortOrder;
  if (filters.page !== 1) params['page'] = String(filters.page);
  if (filters.limit !== 20) params['limit'] = String(filters.limit);
  return params;
}

export function useBuyerFilters() {
  const [filters, update, reset] = useUrlState(parse, serialize);

  // Any filter change returns to page 1 — otherwise narrowing while on page 3 lands on
  // an empty page that looks exactly like "no matches".
  const setFilters = useCallback(
    (patch: Partial<BuyerFilters>) => {
      const changesResults = Object.keys(patch).some((k) => k !== 'page' && k !== 'limit');
      update(changesResults ? { ...patch, page: 1 } : patch);
    },
    [update],
  );

  const activeFilterCount =
    (filters.q ? 1 : 0) +
    (filters.status.length ? 1 : 0) +
    (filters.preferredType.length ? 1 : 0);

  return { filters, setFilters, resetFilters: reset, activeFilterCount };
}
