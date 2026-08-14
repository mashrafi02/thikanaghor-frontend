import { baseApi, unwrap, unwrapData } from '@/app/api/baseApi';
import type { ApiSuccess, SessionSummary, User } from '@/app/api/types';
import { csrfTokenReceived, sessionConfirmed, signedIn, signedOut } from './authSlice';

/**
 * Auth endpoints.
 *
 * The `onQueryStarted` handlers are where the CSRF rotation is caught. The server issues
 * a fresh token on login and on password change; missing either leaves the app holding a
 * dead token and every subsequent mutation fails with a 403.
 */

interface LoginRequest {
  email: string;
  password: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * The session's CSRF token.
     *
     * Called by `ProtectedRoute` (every authenticated page load) and by `LoginPage`
     * (where there is no session yet). Both matter: without the former, the first
     * mutation after a reload goes out with no token at all.
     */
    getCsrfToken: builder.query<string, void>({
      query: () => '/auth/csrf',
      transformResponse: unwrap<string, 'csrfToken'>('csrfToken'),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(csrfTokenReceived(data));
        } catch {
          // Non-fatal at boot: a mutation will trigger the 403 recovery path in
          // baseApi, which fetches a token and retries.
        }
      },
    }),

    getMe: builder.query<User, void>({
      query: () => '/auth/me',
      transformResponse: unwrap<User, 'user'>('user'),
      providesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(sessionConfirmed());
        } catch {
          // A 401 here is the normal first-visit case, not an error. baseApi has
          // already dispatched sessionExpired; nothing further to do.
        }
      },
    }),

    login: builder.mutation<{ user: User; csrfToken: string }, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: unwrapData<{ user: User; csrfToken: string }>,
      // Everything the previous (anonymous) session cached is now wrong.
      invalidatesTags: ['Me', 'Session', 'Property', 'Buyer', 'Dashboard', 'Settings'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        // The rotated token, not the one fetched at boot.
        dispatch(signedIn({ csrfToken: data.csrfToken }));
      },
    }),

    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          // Clear local state even if the request failed. The alternative — staying
          // "logged in" client-side after a failed logout — is worse than a stale
          // server session the user can no longer reach.
          dispatch(signedOut());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),

    updateLocale: builder.mutation<User, { locale: 'en' | 'bn' }>({
      query: (body) => ({ url: '/auth/locale', method: 'PATCH', body }),
      transformResponse: unwrap<User, 'user'>('user'),
      invalidatesTags: ['Me'],
    }),

    changePassword: builder.mutation<
      { signedOutSessions: number; csrfToken: string },
      ChangePasswordRequest
    >({
      query: (body) => ({ url: '/auth/password', method: 'PATCH', body }),
      transformResponse: unwrapData<{ signedOutSessions: number; csrfToken: string }>,
      // The server rotates the session as part of the change, so every other device is
      // signed out and the session list is stale.
      invalidatesTags: ['Session'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(csrfTokenReceived(data.csrfToken));
      },
    }),

    getSessions: builder.query<SessionSummary[], void>({
      query: () => '/auth/sessions',
      transformResponse: unwrap<SessionSummary[], 'sessions'>('sessions'),
      providesTags: ['Session'],
    }),

    revokeSession: builder.mutation<void, string>({
      query: (id) => ({ url: `/auth/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Session'],
    }),

    revokeOtherSessions: builder.mutation<{ revokedSessions: number }, void>({
      query: () => ({ url: '/auth/sessions', method: 'DELETE' }),
      transformResponse: unwrapData<{ revokedSessions: number }>,
      invalidatesTags: ['Session'],
    }),
  }),
});

export const {
  useGetCsrfTokenQuery,
  useGetMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useUpdateLocaleMutation,
  useChangePasswordMutation,
  useGetSessionsQuery,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
} = authApi;

export type { ApiSuccess };
