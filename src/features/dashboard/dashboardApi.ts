import { baseApi, unwrap, unwrapData } from '@/app/api/baseApi';
import type {
  AttentionResponse,
  DashboardStats,
  DistributionResponse,
  TimeseriesRange,
  TimeseriesResponse,
} from './types';

/**
 * Dashboard endpoints.
 *
 * All four are read-only and all four are invalidated by the same thing — any mutation
 * that moves money or status. Rather than give each a tag of its own, they share the
 * `Dashboard/SUMMARY` tag: there is no case where the stats are stale but the charts are
 * fresh, and four separate tags would mean four places to remember on every new mutation.
 *
 * They are separate *endpoints* rather than one combined call because they have
 * different shapes and the period switcher refetches only the timeseries. Fetching a
 * 12-month series again should not also refetch the attention list.
 */
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStats: builder.query<DashboardStats, void>({
      query: () => ({ url: '/dashboard/stats' }),
      // Nests one level deeper than the others: `{ data: { stats } }`.
      transformResponse: unwrap<DashboardStats, 'stats'>('stats'),
      providesTags: [{ type: 'Dashboard', id: 'SUMMARY' }],
    }),

    getTimeseries: builder.query<TimeseriesResponse, TimeseriesRange>({
      // `months` is part of the cache key, so switching 6 ↔ 12 keeps both cached and
      // flipping back is instant rather than a refetch.
      query: (months) => ({
        url: '/dashboard/timeseries',
        params: { months: String(months) },
      }),
      transformResponse: unwrapData<TimeseriesResponse>,
      providesTags: [{ type: 'Dashboard', id: 'SUMMARY' }],
    }),

    getDistribution: builder.query<DistributionResponse, void>({
      query: () => ({ url: '/dashboard/distribution' }),
      transformResponse: unwrapData<DistributionResponse>,
      providesTags: [{ type: 'Dashboard', id: 'SUMMARY' }],
    }),

    getAttention: builder.query<AttentionResponse, number | void>({
      query: (limit) => ({
        url: '/dashboard/attention',
        params: { limit: String(limit ?? 10) },
      }),
      transformResponse: unwrapData<AttentionResponse>,
      // Also tagged `Property/LIST`: acting on a stale deal from this list changes its
      // status, which is exactly what removes it from the list.
      providesTags: [
        { type: 'Dashboard', id: 'SUMMARY' },
        { type: 'Property', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetStatsQuery,
  useGetTimeseriesQuery,
  useGetDistributionQuery,
  useGetAttentionQuery,
} = dashboardApi;
