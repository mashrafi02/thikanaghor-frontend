import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/app/store';
import { csrfTokenReceived, sessionExpired } from '@/features/auth/authSlice';
import type { ServerErrorCode } from '@/lib/errorCodes';
import type { ApiErrorBody, ApiSuccess } from './types';

/**
 * The single RTK Query API. Feature endpoints are injected into it.
 *
 * Two behaviours live here rather than in each endpoint, because getting either wrong
 * breaks the whole app in a way that is hard to trace from a component:
 *
 *  1. **CSRF.** The server rotates the token on login and on password change. Capturing
 *     only the boot token is the bug that makes every action fail immediately after
 *     signing in.
 *  2. **A stale token heals itself.** A 403 for a bad token refetches and retries once,
 *     so leaving the tab open overnight is an invisible hiccup rather than a dead end.
 */

const rawBaseQuery = fetchBaseQuery({
  // Relative, so it goes through the Vite proxy in dev and the Vercel rewrite in
  // production — same-origin in both, which is what keeps the session cookie working.
  baseUrl: '/api',
  // Without this the session cookie is neither sent nor stored. Nothing works.
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.csrfToken;
    // Attached to every request rather than only mutations. It is ignored on GET, and
    // a blanket rule cannot miss a case the way an inferred one can.
    if (token) headers.set('X-CSRF-Token', token);
    return headers;
  },
});

/**
 * A token problem specifically — not every 403.
 *
 * Keyed off the stable error code rather than matching the English message. The message
 * is user-facing copy and can be reworded; the code is a contract.
 */
function isCsrfFailure(error: FetchBaseQueryError): boolean {
  if (error.status !== 403) return false;
  const body = error.data as ApiErrorBody | undefined;
  return body?.code === 'CSRF_TOKEN_MISSING' || body?.code === 'CSRF_TOKEN_INVALID';
}

const baseQueryWithRecovery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && isCsrfFailure(result.error)) {
    const refreshed = await rawBaseQuery(
      { url: '/auth/csrf', method: 'GET' },
      api,
      extraOptions,
    );

    const body = refreshed.data as ApiSuccess<{ csrfToken: string }> | undefined;
    const token = body?.data?.csrfToken;

    if (token) {
      api.dispatch(csrfTokenReceived(token));
      // Exactly one retry. A second failure is a real refusal, not a stale token, and
      // retrying again would loop.
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  if (result.error?.status === 401) {
    // Clears auth state; ProtectedRoute reacts by redirecting to /login. Deliberately
    // silent — the redirect is the message, and a toast on top of it is noise.
    api.dispatch(sessionExpired());
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRecovery,
  tagTypes: ['Property', 'Buyer', 'Inquiry', 'Dashboard', 'Settings', 'Session', 'Me'],
  // Refetch when the user comes back to the tab or the network returns — cheap, and it
  // means stale figures do not sit on screen after a phone has been in a pocket.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});

/** `{ status, data: { property } }` → `property`. Used as every endpoint's
 *  `transformResponse`, so components never unwrap the envelope themselves. */
export function unwrap<T, K extends string>(key: K) {
  return (response: ApiSuccess<Record<K, T>>): T => {
    const value = response.data?.[key];
    if (value === undefined) {
      throw new Error(`Expected "${key}" in the API response but it was absent`);
    }
    return value;
  };
}

/** For endpoints whose `data` is the payload itself, with no wrapper key. */
export function unwrapData<T>(response: ApiSuccess<T>): T {
  if (response.data === undefined) {
    throw new Error('Expected a data payload in the API response but it was absent');
  }
  return response.data;
}

/**
 * Pulls a usable message and field errors out of whatever RTK Query hands back.
 *
 * Callers get one shape regardless of whether the failure was an HTTP error, a network
 * drop or a parse failure — which is what lets the error-routing rules in FRONTEND.md
 * §10.5.4 be written once instead of per component.
 */
export interface NormalizedApiError {
  statusCode: number | null;
  /** The backend's stable error code. Absent on network failures, which never
   *  reached a server to be named. */
  code?: ServerErrorCode;
  /** Interpolation values for the translated message. */
  params?: Record<string, unknown>;
  /** The server's English message — a fallback for codes without a translation. */
  message: string;
  details?: Record<string, string[]>;
  requestId?: string;
  isOffline: boolean;
}

export function normalizeError(error: unknown): NormalizedApiError {
  const fetchError = error as FetchBaseQueryError | undefined;

  if (fetchError && 'status' in fetchError) {
    if (fetchError.status === 'FETCH_ERROR') {
      return {
        statusCode: null,
        // Distinguished from a server error on purpose: "offline" and "the server is
        // down" are different problems with different fixes for the user.
        message: navigator.onLine ? 'Cannot reach the server' : 'You are offline',
        isOffline: !navigator.onLine,
      };
    }

    if (typeof fetchError.status === 'number') {
      const body = fetchError.data as ApiErrorBody | undefined;
      return {
        statusCode: fetchError.status,
        ...(body?.code && { code: body.code }),
        ...(body?.params && { params: body.params }),
        message: body?.message ?? 'Something went wrong',
        ...(body?.details && { details: body.details }),
        ...(body?.requestId && { requestId: body.requestId }),
        isOffline: false,
      };
    }
  }

  return { statusCode: null, message: 'Something went wrong', isOffline: false };
}
