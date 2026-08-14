import { baseApi, unwrap } from '@/app/api/baseApi';

/**
 * Application settings — a single row on the server.
 *
 * `defaultCommissionRate` is a string for the same reason every other money-adjacent
 * value is: it is a `NUMERIC(5,2)` and must not round-trip through a float.
 *
 * Changing it affects only records created afterwards. Each property freezes its own
 * rate at creation, so deals already in flight keep the terms they were entered with —
 * the settings form says so, because otherwise "default" invites the assumption that
 * editing it re-prices the pipeline.
 */

export interface AppSettings {
  defaultCommissionRate: string;
  currency: 'BDT';
  locale: 'en' | 'bn';
  updatedAt: string;
}

export type UpdateSettingsBody = Partial<
  Pick<AppSettings, 'defaultCommissionRate' | 'locale'>
>;

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<AppSettings, void>({
      query: () => '/settings',
      transformResponse: unwrap<AppSettings, 'settings'>('settings'),
      providesTags: ['Settings'],
    }),

    updateSettings: builder.mutation<AppSettings, UpdateSettingsBody>({
      query: (body) => ({ url: '/settings', method: 'PATCH', body }),
      transformResponse: unwrap<AppSettings, 'settings'>('settings'),
      invalidatesTags: ['Settings'],

      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        // Optimistic so the rate field does not visibly snap back to its old value
        // while the request is in flight.
        const undo = dispatch(
          settingsApi.util.updateQueryData('getSettings', undefined, (draft) => {
            Object.assign(draft, patch);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          undo.undo();
        }
      },
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
