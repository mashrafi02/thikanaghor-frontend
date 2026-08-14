import { useCallback, useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker registration, and the "a new version is ready" state.
 *
 * **Registration happens at module scope, not inside the hook.** That distinction is the
 * whole reason this file is shaped like this: the update banner lives in `AppShell`,
 * which only renders for authenticated routes, so registering from a hook there meant no
 * service worker existed until *after* the first successful login. Two consequences, both
 * silent:
 *
 *  • the login screen was never cached, so a cold offline start showed the browser's
 *    error page rather than the app;
 *  • Chrome's install criteria require a registered worker, so the app was not
 *    installable until you had logged in at least once — and the install button in
 *    Settings sits behind that same login.
 *
 * So `main.tsx` calls `startServiceWorker()` on load, for every visitor. The hook is only
 * a subscription to the result.
 *
 * The plugin is configured `registerType: 'prompt'`, so nothing reloads on its own. That
 * matters here more than in most apps: the property form is long, and someone is often
 * part-way through typing a listing while on the phone to the seller. A worker that
 * decided to reload would discard that with no warning and no undo.
 */

interface UpdateState {
  needsRefresh: boolean;
  offlineReady: boolean;
}

let state: UpdateState = { needsRefresh: false, offlineReady: false };
const listeners = new Set<() => void>();

function setState(next: Partial<UpdateState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

/** Set by `registerSW`; calling it with `true` activates the waiting worker and reloads. */
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;

// Guarded so a hot reload in development cannot register twice and produce two prompts
// for one deploy.
let started = false;

export function startServiceWorker(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      setState({ needsRefresh: true });
    },
    onOfflineReady() {
      setState({ offlineReady: true });
    },
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): UpdateState {
  return state;
}

export interface AppUpdateState {
  /** A newer build is installed and waiting. */
  needsRefresh: boolean;
  /** The app has been cached and will now launch without a network. */
  offlineReady: boolean;
  /** Activates the waiting worker and reloads. */
  update: () => void;
  /** Dismisses the banner until the next build. */
  dismiss: () => void;
}

export function useAppUpdate(): AppUpdateState {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const update = useCallback(() => {
    setState({ needsRefresh: false });
    // `true` reloads once the new worker has claimed the page. Without the reload the
    // user keeps looking at the old bundle and assumes the button did nothing.
    void applyUpdate?.(true);
  }, []);

  const dismiss = useCallback(() => {
    setState({ needsRefresh: false });
  }, []);

  return { ...current, update, dismiss };
}
