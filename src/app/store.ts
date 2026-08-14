import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi';
import authReducer from '@/features/auth/authSlice';

/**
 * Builds a store.
 *
 * The app uses the singleton below; tests call this to get an isolated one. Without a
 * factory, every test shares the app's store, so auth status and cached queries leak from
 * one test into the next and the suite passes or fails depending on file order — the
 * worst kind of flake, because it looks like a real regression.
 */
export function createStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

export const store = createStore();

// Enables refetchOnFocus / refetchOnReconnect. Only the app's store needs them — a test
// store subscribing to window events would fire refetches between tests.
setupListeners(store.dispatch);

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
