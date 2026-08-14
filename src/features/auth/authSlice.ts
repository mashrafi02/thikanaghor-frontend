import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Auth state.
 *
 * Holds only what the server cannot be asked for on every render: the CSRF token, and
 * a tri-state flag for whether we know yet whether there is a session. The user object
 * itself is owned by RTK Query's `getMe` cache — duplicating it here would create two
 * sources of truth that drift.
 *
 * The CSRF token lives in memory rather than being read from its cookie. The cookie is
 * non-httpOnly by necessity (double-submit needs JS to read it), but taking the value
 * from the response body avoids coupling to the cookie's name, which differs between
 * deployments — `tg_csrf` locally, `__Host-tg_csrf` in production.
 */

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  csrfToken: string | null;
}

const initialState: AuthState = {
  // "unknown" until getMe resolves. Rendering the login page during that window causes
  // a visible flash on every refresh, so ProtectedRoute waits on this instead.
  status: 'unknown',
  csrfToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    csrfTokenReceived(state, action: PayloadAction<string>) {
      state.csrfToken = action.payload;
    },
    signedIn(state, action: PayloadAction<{ csrfToken?: string }>) {
      state.status = 'authenticated';
      if (action.payload.csrfToken) state.csrfToken = action.payload.csrfToken;
    },
    signedOut(state) {
      state.status = 'unauthenticated';
      state.csrfToken = null;
    },
    /** Dispatched by baseApi on any 401 — including the expected one from `getMe` on a
     *  first visit, which is why it must stay silent rather than raising an error. */
    sessionExpired(state) {
      state.status = 'unauthenticated';
      state.csrfToken = null;
    },
    sessionConfirmed(state) {
      state.status = 'authenticated';
    },
  },
});

export const { csrfTokenReceived, signedIn, signedOut, sessionExpired, sessionConfirmed } =
  authSlice.actions;

export default authSlice.reducer;
