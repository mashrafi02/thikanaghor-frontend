import { useSyncExternalStore } from 'react';

/**
 * Whether the browser thinks it has a network.
 *
 * `navigator.onLine` is optimistic — it reports true for a connected wifi with no
 * route to the internet — so this is used to *explain* a failure that already happened,
 * never to pre-emptively block an action that might have worked.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    // Server snapshot: assume online, so nothing renders an offline banner during SSR
    // or the first hydration frame.
    () => true,
  );
}
