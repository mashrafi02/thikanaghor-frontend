import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type AppStore } from '../src/app/store';
import { sessionConfirmed, sessionExpired } from '../src/features/auth/authSlice';
import '../src/i18n';

/**
 * The auth gate's four outcomes.
 *
 * The case that matters is *unreachable*. `sessionExpired` is dispatched only on a 401,
 * so a network failure used to leave the auth status at "unknown" forever and the gate
 * rendered its blank placeholder permanently. Installed as a PWA the shell loads from
 * cache offline, so the way a real user met this was: open the app on a train, get a
 * white screen, no message, no way out.
 *
 * **What this covers, and what it does not.** It drives the gate's decision — the branch
 * that was wrong — by controlling the query result and the auth status directly. It does
 * *not* exercise the real network layer: RTK Query builds a `Request` from the relative
 * `/api` base URL, and under Node's undici that throws "Failed to parse URL" before any
 * fetch happens. That is a harness limitation, not app behaviour, and bending the app's
 * deliberately same-origin base URL to satisfy it would be testing a fiction. The
 * FETCH_ERROR mapping itself is verified against a real browser and a real dead network
 * in the F10 offline check.
 */

const useGetMeQuery = vi.hoisted(() => vi.fn());
const useGetCsrfTokenQuery = vi.hoisted(() => vi.fn());

vi.mock('../src/features/auth/authApi', () => ({ useGetMeQuery, useGetCsrfTokenQuery }));

// Imported after the mock is registered.
const { ProtectedRoute } = await import('../src/features/auth/ProtectedRoute');

function renderGate(store: AppStore) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p>protected content</p>} />
          </Route>
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

/** RTK Query's shape for "the request never completed" — no HTTP response at all. */
const FETCH_ERROR = { status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' };

// A fresh store per test, so auth status never leaks between cases.
let store: AppStore;

beforeEach(() => {
  vi.clearAllMocks();
  useGetCsrfTokenQuery.mockReturnValue({});
  store = createStore();
});

describe('ProtectedRoute', () => {
  it('shows an offline state — not a blank screen — when the API is unreachable', () => {
    // The exact combination that used to hang: an error with no HTTP status, and an auth
    // status still "unknown" because nothing dispatched sessionExpired.
    useGetMeQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      error: FETCH_ERROR,
      refetch: vi.fn(),
    });

    renderGate(store);

    expect(screen.getByRole('button', { name: /চেষ্টা|try|retry/i })).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    // The critical half: it must not conclude the user is signed out. Telling someone to
    // log in when their session is fine sends them hunting for a password.
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });

  it('offers a retry that re-runs the session check', () => {
    const refetch = vi.fn();
    useGetMeQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      error: FETCH_ERROR,
      refetch,
    });

    renderGate(store);
    screen.getByRole('button', { name: /চেষ্টা|try|retry/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('sends a genuinely signed-out user to the login page', () => {
    store.dispatch(sessionExpired());
    useGetMeQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      // A 401 *is* an answer, so it resolves to "signed out" rather than "unreachable".
      error: { status: 401, data: {} },
      refetch: vi.fn(),
    });

    renderGate(store);

    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders the app once the session is confirmed', () => {
    store.dispatch(sessionConfirmed());
    useGetMeQuery.mockReturnValue({ isLoading: false, isError: false, refetch: vi.fn() });

    renderGate(store);

    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('renders neither content nor a redirect while the check is in flight', () => {
    useGetMeQuery.mockReturnValue({ isLoading: true, isError: false, refetch: vi.fn() });

    const { container } = renderGate(store);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    // Redirecting here is the bug this placeholder exists to prevent: it would flash
    // "signed out" on every refresh.
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
