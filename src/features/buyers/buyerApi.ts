import { baseApi, unwrap, unwrapData } from '@/app/api/baseApi';
import type { InquiryStatus } from '@/app/api/types';
import type { Buyer, BuyerFilters, BuyerListResponse, PropertyMatch } from './types';

/**
 * Buyer and inquiry endpoints.
 *
 * The tag that is easy to miss: `createInquiry` invalidates `Buyer LIST`. Linking a
 * buyer flips their status ACTIVE → MATCHED server-side, so without it the buyer list
 * keeps showing a stale badge — a bug you only find by reading the service, not the
 * endpoint name.
 */

function toQueryParams(filters: BuyerFilters): Record<string, string> {
  const params: Record<string, string> = {
    page: String(filters.page),
    limit: String(filters.limit),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };
  if (filters.q) params['q'] = filters.q;
  if (filters.status.length) params['status'] = filters.status.join(',');
  if (filters.preferredType.length) params['preferredType'] = filters.preferredType.join(',');
  return params;
}

export const buyerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBuyers: builder.query<BuyerListResponse, BuyerFilters>({
      query: (filters) => ({ url: '/buyers', params: toQueryParams(filters) }),
      transformResponse: unwrapData<BuyerListResponse>,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Buyer' as const, id })),
              { type: 'Buyer' as const, id: 'LIST' },
            ]
          : [{ type: 'Buyer' as const, id: 'LIST' }],
    }),

    getBuyer: builder.query<Buyer, string>({
      query: (id) => `/buyers/${id}`,
      transformResponse: unwrap<Buyer, 'buyer'>('buyer'),
      providesTags: (_r, _e, id) => [{ type: 'Buyer', id }],
    }),

    getMatches: builder.query<{ matches: PropertyMatch[]; total: number }, string>({
      query: (id) => `/buyers/${id}/matches`,
      transformResponse: unwrapData<{ matches: PropertyMatch[]; total: number }>,
      // Depends on both sides: a new property, or a new inquiry, changes the result.
      providesTags: (_r, _e, id) => [
        { type: 'Buyer', id },
        { type: 'Property', id: 'LIST' },
      ],
    }),

    createBuyer: builder.mutation<Buyer, Record<string, unknown>>({
      query: (body) => ({ url: '/buyers', method: 'POST', body }),
      transformResponse: unwrap<Buyer, 'buyer'>('buyer'),
      invalidatesTags: [{ type: 'Buyer', id: 'LIST' }, 'Dashboard'],
    }),

    updateBuyer: builder.mutation<Buyer, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/buyers/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap<Buyer, 'buyer'>('buyer'),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Buyer', id }],
    }),

    deleteBuyer: builder.mutation<void, string>({
      query: (id) => ({ url: `/buyers/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Buyer', id: 'LIST' }, 'Dashboard'],
    }),

    restoreBuyer: builder.mutation<Buyer, string>({
      query: (id) => ({ url: `/buyers/${id}/restore`, method: 'POST' }),
      transformResponse: unwrap<Buyer, 'buyer'>('buyer'),
      invalidatesTags: [{ type: 'Buyer', id: 'LIST' }, 'Dashboard'],
    }),

    createInquiry: builder.mutation<
      unknown,
      { propertyId: string; buyerId: string; status?: InquiryStatus; notes?: string }
    >({
      query: (body) => ({ url: '/inquiries', method: 'POST', body }),
      // Buyer LIST because the server may flip the buyer's status — see the note above.
      invalidatesTags: (_r, _e, { propertyId, buyerId }) => [
        { type: 'Property', id: propertyId },
        { type: 'Buyer', id: buyerId },
        { type: 'Buyer', id: 'LIST' },
      ],
    }),

    updateInquiry: builder.mutation<
      unknown,
      {
        id: string;
        propertyId: string;
        buyerId: string;
        status?: InquiryStatus;
        offeredPrice?: string;
      }
    >({
      query: ({ id, status, offeredPrice }) => ({
        url: `/inquiries/${id}`,
        method: 'PATCH',
        body: { ...(status && { status }), ...(offeredPrice && { offeredPrice }) },
      }),
      invalidatesTags: (_r, _e, { propertyId, buyerId }) => [
        { type: 'Property', id: propertyId },
        { type: 'Buyer', id: buyerId },
      ],
    }),

    deleteInquiry: builder.mutation<void, { id: string; propertyId: string; buyerId: string }>(
      {
        query: ({ id }) => ({ url: `/inquiries/${id}`, method: 'DELETE' }),
        invalidatesTags: (_r, _e, { propertyId, buyerId }) => [
          { type: 'Property', id: propertyId },
          { type: 'Buyer', id: buyerId },
        ],
      },
    ),
  }),
});

export const {
  useGetBuyersQuery,
  useGetBuyerQuery,
  useGetMatchesQuery,
  useCreateBuyerMutation,
  useUpdateBuyerMutation,
  useDeleteBuyerMutation,
  useRestoreBuyerMutation,
  useCreateInquiryMutation,
  useUpdateInquiryMutation,
  useDeleteInquiryMutation,
} = buyerApi;
