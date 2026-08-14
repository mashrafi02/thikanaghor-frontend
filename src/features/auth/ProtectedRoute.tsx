import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { OfflineState } from '@/components/ui/EmptyState';
import { useGetCsrfTokenQuery, useGetMeQuery } from './authApi';

/**
 * Gate for every authenticated route.
 *
 * There are **four** outcomes, and conflating any two of them produces a bug:
 *
 *  • *in flight* — render nothing. Redirecting here would bounce the user to /login for
 *    a frame on every refresh, a flash that reads as being randomly signed out.
 *  • *confirmed* — render the app.
 *  • *401* — genuinely signed out; go to /login.
 *  • *unreachable* — the request never got an answer. This is the one that was missing:
 *    `sessionExpired` is dispatched only on a 401, so a network failure left `status` at
 *    "unknown" **forever** and the placeholder below became a permanent blank screen.
 *    Installed as a PWA the shell loads from cache offline, so this was the state a user
 *    reached by opening the app on a train — a white page, no message, no way out.
 *
 * It deliberately does not fall through to /login. The session cookie is still valid; the
 * network is the problem, and telling someone they are signed out when they are not sends
 * them hunting for a password they do not need.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const status = useAppSelector((state) => state.auth.status);

  // Fires the session check. Its result drives `status` via onQueryStarted.
  const { isLoading, isError, error, refetch } = useGetMeQuery();

  // Primes the CSRF token for the whole session.
  //
  // Redux starts empty on every page load, and `prepareHeaders` sends no CSRF header
  // when the token is null — so without this, the *first* mutation after any reload was
  // rejected 403 and only succeeded on baseApi's retry. It worked, which is why it went
  // unnoticed: the cost was a doubled round trip on the first write and, worse, the
  // error-recovery path being exercised as the happy path.
  //
  // It belongs here rather than in a page, for the same reason `protect` sits on the
  // router and not on each route: every authenticated view inherits it and none can be
  // forgotten. Runs in parallel with `getMe` and never gates rendering — a missing token
  // still heals via the retry, this just means it rarely has to.
  useGetCsrfTokenQuery();

  // `FETCH_ERROR` is RTK Query's marker for "the request never completed" — no DNS, no
  // route, server unreachable. Distinct from any HTTP status, which is exactly the
  // distinction that matters here.
  const unreachable = isError && isNetworkFailure(error);

  if (unreachable && status === 'unknown') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
        <OfflineState onRetry={() => void refetch()} />
      </div>
    );
  }

  if (status === 'unknown' || isLoading) {
    // Deliberately blank, not a spinner: the check resolves in milliseconds against a
    // warm session, and a spinner that flashes for 80ms is worse than nothing.
    return <div className="min-h-dvh bg-canvas" aria-busy="true" />;
  }

  if (status === 'unauthenticated') {
    // Carry the attempted destination so signing in returns the user to it rather than
    // dumping them on the dashboard.
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}

/** True when the request failed without ever receiving an HTTP response. */
function isNetworkFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 'FETCH_ERROR'
  );
}
