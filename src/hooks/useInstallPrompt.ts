import { useCallback, useSyncExternalStore } from 'react';

/**
 * The "add to home screen" prompt.
 *
 * Chrome fires `beforeinstallprompt` **once**, early, and often before React has mounted.
 * A listener that starts on mount misses it on most cold loads and the install button
 * never appears.
 *
 * Module scope alone is not enough to fix that, which is how this shipped broken: the
 * only importer was the Settings page, which is a lazy route, so the module did not load
 * until the user navigated there — long after the event had fired. `main.tsx` therefore
 * calls `startInstallPromptCapture()` on startup, the same way it starts the service
 * worker, and for the same reason.
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

/** Set once the app has been installed in this browser, so the offer can be withdrawn
 *  even when the current tab is not the installed one. */
let installedHere = false;

const INSTALLED_KEY = 'tg.installed';

let started = false;

/**
 * Begins listening. Called from `main.tsx` at startup — never lazily.
 *
 * Idempotent, so a hot reload in development cannot attach two listeners and capture the
 * event twice.
 */
export function startInstallPromptCapture(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  try {
    installedHere = localStorage.getItem(INSTALLED_KEY) === 'true';
  } catch {
    // Private browsing can throw on localStorage access; the offer simply stays visible.
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    // Suppresses Chrome's own mini-infobar so the app can offer installation at a
    // moment that makes sense (Settings) rather than over the login screen.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedHere = true;
    try {
      localStorage.setItem(INSTALLED_KEY, 'true');
    } catch {
      // Non-fatal: the offer reappears next session, which is wrong but harmless.
    }
    emit();
  });
}

/**
 * Already installed — either running as the installed app right now, or installed earlier
 * in this browser.
 *
 * The display-mode check alone only answers "am I *currently* the installed app", so
 * opening the site in an ordinary tab after installing it reported "not installed" while
 * Chrome, correctly, refused to offer installation again. That combination produced the
 * flatly untrue "this browser cannot install it".
 */
function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    installedHere ||
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

  return { canInstall, installed: isInstalled(), promptInstall };
}
