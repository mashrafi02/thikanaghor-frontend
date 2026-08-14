import { baseApi, unwrap, unwrapData } from '@/app/api/baseApi';
import type { PropertyStatus } from '@/app/api/types';
import type { PropertyDetail, PropertyFilters, PropertyListResponse } from './types';

/**
 * Property endpoints.
 *
 * The tag strategy is the point of this file. Two rules it follows:
 *
 *  • **Editing one record must not refetch the list.** `updateProperty` invalidates only
 *    that record's tag; the row in any cached page is patched in place. A 20-row refetch
 *    on every field edit is the most common RTK Query mistake.
 *  • **`closeDeal` invalidates broadly, and that is correct.** Status, money, the buyer's
 *    status and every dashboard figure change at once — this is the one mutation where a
 *    wide refresh is right rather than lazy.
 */

/** Turns the filter object into the query string the API expects. */
function toQueryParams(filters: PropertyFilters): Record<string, string> {
  const params: Record<string, string> = {
    page: String(filters.page),
    limit: String(filters.limit),
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  if (filters.q) params['q'] = filters.q;
  // Comma-separated rather than repeated keys — shorter in the URL bar, and the server
  // accepts both.
  if (filters.status.length) params['status'] = filters.status.join(',');
  if (filters.type.length) params['type'] = filters.type.join(',');
  if (filters.district) params['district'] = filters.district;
  if (filters.priceMin) params['priceMin'] = filters.priceMin;
  if (filters.priceMax) params['priceMax'] = filters.priceMax;

  // areaUnit only matters alongside a bound; sending it alone is noise in the URL.
  if (filters.areaMin || filters.areaMax) {
    params['areaUnit'] = filters.areaUnit;
    if (filters.areaMin) params['areaMin'] = filters.areaMin;
    if (filters.areaMax) params['areaMax'] = filters.areaMax;
  }

  return params;
}

export const propertyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProperties: builder.query<PropertyListResponse, PropertyFilters>({
      query: (filters) => ({ url: '/properties', params: toQueryParams(filters) }),
      transformResponse: unwrapData<PropertyListResponse>,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Property' as const, id })),
              { type: 'Property' as const, id: 'LIST' },
            ]
          : [{ type: 'Property' as const, id: 'LIST' }],
    }),

    getProperty: builder.query<PropertyDetail, string>({
      query: (id) => `/properties/${id}`,
      transformResponse: unwrap<PropertyDetail, 'property'>('property'),
      providesTags: (_result, _error, id) => [{ type: 'Property', id }],
    }),

    createProperty: builder.mutation<PropertyDetail, Record<string, unknown>>({
      query: (body) => ({ url: '/properties', method: 'POST', body }),
      transformResponse: unwrap<PropertyDetail, 'property'>('property'),
      invalidatesTags: [{ type: 'Property', id: 'LIST' }, 'Dashboard'],
    }),

    updateProperty: builder.mutation<
      PropertyDetail,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({ url: `/properties/${id}`, method: 'PATCH', body }),
      transformResponse: unwrap<PropertyDetail, 'property'>('property'),
      // Only the record itself — deliberately not the LIST tag. See the note above.
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Property', id }],
    }),

    changeStatus: builder.mutation<
      PropertyDetail,
      { id: string; status: PropertyStatus; note?: string; filters?: PropertyFilters }
    >({
      query: ({ id, status, note }) => ({
        url: `/properties/${id}/status`,
        method: 'PATCH',
        body: { status, ...(note && { note }) },
      }),
      transformResponse: unwrap<PropertyDetail, 'property'>('property'),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Property', id }, 'Dashboard'],
      async onQueryStarted({ id, status, filters }, { dispatch, queryFulfilled }) {
        // Optimistic: the pill changes the instant it is tapped. The result is entirely
        // predictable — the server either accepts the transition or rejects it.
        const patches = [
          dispatch(
            propertyApi.util.updateQueryData('getProperty', id, (draft) => {
              draft.status = status;
            }),
          ),
        ];

        if (filters) {
          patches.push(
            dispatch(
              propertyApi.util.updateQueryData('getProperties', filters, (draft) => {
                const row = draft.items.find((item) => item.id === id);
                if (row) row.status = status;
              }),
            ),
          );
        }

        try {
          await queryFulfilled;
        } catch {
          // Roll back on rejection — an illegal transition must not leave the UI
          // showing a status the server never accepted.
          patches.forEach((patch) => {
            patch.undo();
          });
        }
      },
    }),

    closeDeal: builder.mutation<
      PropertyDetail,
      {
        id: string;
        finalSalePrice: string;
        commissionRate?: string;
        buyerId?: string;
        note?: string;
      }
    >({
      query: ({ id, ...body }) => ({ url: `/properties/${id}/close`, method: 'POST', body }),
      transformResponse: unwrap<PropertyDetail, 'property'>('property'),
      // Not optimistic: the server computes the commission, and inventing that figure
      // client-side would flash a number that might not match what gets stored.
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Property', id },
        { type: 'Property', id: 'LIST' },
        { type: 'Buyer', id: 'LIST' },
        'Dashboard',
      ],
    }),

    setCommissionReceived: builder.mutation<PropertyDetail, { id: string; received: boolean }>(
      {
        query: ({ id, received }) => ({
          url: `/properties/${id}/commission-received`,
          method: 'PATCH',
          body: { received },
        }),
        transformResponse: unwrap<PropertyDetail, 'property'>('property'),
        invalidatesTags: (_result, _error, { id }) => [{ type: 'Property', id }, 'Dashboard'],
        async onQueryStarted({ id, received }, { dispatch, queryFulfilled }) {
          const patch = dispatch(
            propertyApi.util.updateQueryData('getProperty', id, (draft) => {
              draft.commissionReceived = received;
            }),
          );
          try {
            await queryFulfilled;
          } catch {
            patch.undo();
          }
        },
      },
    ),

    deleteProperty: builder.mutation<void, string>({
      query: (id) => ({ url: `/properties/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Property', id: 'LIST' }, 'Dashboard'],
    }),

    /** The other half of the undo pattern — the toast's action calls this. */
    restoreProperty: builder.mutation<PropertyDetail, string>({
      query: (id) => ({ url: `/properties/${id}/restore`, method: 'POST' }),
      transformResponse: unwrap<PropertyDetail, 'property'>('property'),
      invalidatesTags: [{ type: 'Property', id: 'LIST' }, 'Dashboard'],
    }),
  }),
});

export const {
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useCreatePropertyMutation,
  useUpdatePropertyMutation,
  useChangeStatusMutation,
  useCloseDealMutation,
  useSetCommissionReceivedMutation,
  useDeletePropertyMutation,
  useRestorePropertyMutation,
} = propertyApi;
