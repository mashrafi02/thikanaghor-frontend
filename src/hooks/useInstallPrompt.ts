import { useCallback, useSyncExternalStore } from 'react';

/**
 * The "add to home screen" prompt.
 *
 * Chrome fires `beforeinstallprompt` **once**, early, and often before React has
 * mounted. A hook that only starts listening on mount therefore misses it on most cold
 * loads, and the install button never appears — the classic version of this bug. So the
 * listener is installed at module scope, at import time, and the captured event is held
 * here until something asks for it.
 *
 * The event is also single-use: once `prompt()` has been called it cannot be called
 * again, so it is cleared after use rather than left to fail silently on a second press.
 */

/** Not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Suppresses Chrome's own mini-infobar so the app can offer installation at a
    // moment that makes sense (Settings) rather than over the login screen.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

/** Already running as an installed app, so there is nothing to offer. */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's non-standard flag; harmless where it does not exist.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return deferred !== null;
}

export interface InstallPromptState {
  /** A prompt is available to show right now. */
  canInstall: boolean;
  /** The app is already installed and running standalone. */
  installed: boolean;
  /** Shows the browser's install dialog. Resolves to whether the user accepted. */
  promptInstall: () => Promise<boolean>;
}

export function useInstallPrompt(): InstallPromptState {
  const canInstall = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const promptInstall = useCallback(async () => {
    const event = deferred;
    if (!event) return false;

    await event.prompt();
    const { outcome } = await event.userChoice;

    // Single-use, accepted or not: a dismissed prompt cannot be re-shown from the same
    // event, and Chrome will fire a fresh one later if it decides to.
    deferred = null;
    emit();

    return outcome === 'accepted';
  }, []);

  return { canInstall, installed: isStandalone(), promptInstall };
}
