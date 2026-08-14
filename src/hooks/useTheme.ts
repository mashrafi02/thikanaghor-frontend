import { useCallback, useSyncExternalStore } from 'react';

/**
 * Three-state theme control: light, dark, or follow the system.
 *
 * "System" is a real third state, not the absence of a choice — someone who has never
 * touched the toggle should track their OS, and someone who has explicitly chosen light
 * should stay light even when the OS goes dark at sunset.
 *
 * State lives in a module-level store rather than React state so every consumer sees the
 * same value without a context provider, and the DOM stays the single source of truth.
 * The initial class is applied by the inline script in index.html, before first paint —
 * this hook only takes over from there.
 */

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'tg.theme';
const THEME_COLORS = { light: '#f7f5f2', dark: '#100f0d' } as const;

const darkQuery =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const listeners = new Set<() => void>();

function readStored(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private browsing can throw on localStorage access.
  }
  return 'system';
}

let preference: ThemePreference = readStored();

function resolve(value: ThemePreference): 'light' | 'dark' {
  if (value === 'system') return darkQuery?.matches ? 'dark' : 'light';
  return value;
}

function apply(): void {
  const resolved = resolve(preference);
  const root = document.documentElement;

  root.classList.toggle('dark', resolved === 'dark');

  // Keeps the PWA's system chrome (status bar, address bar) matching the app.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved]);
}

function emit(): void {
  for (const listener of listeners) listener();
}

// A system change only matters while the preference is "system"; an explicit choice
// must not be overridden by the OS.
darkQuery?.addEventListener('change', () => {
  if (preference !== 'system') return;
  apply();
  emit();
});

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ThemePreference {
  return preference;
}

export function setThemePreference(value: ThemePreference): void {
  preference = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Non-fatal: the theme still applies for this session.
  }
  apply();
  emit();
}

export interface UseThemeResult {
  /** What the user chose — including "system". */
  preference: ThemePreference;
  /** What is actually on screen right now. */
  resolved: 'light' | 'dark';
  setPreference: (value: ThemePreference) => void;
}

export function useTheme(): UseThemeResult {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setPreference = useCallback((value: ThemePreference) => {
    setThemePreference(value);
  }, []);

  return { preference: current, resolved: resolve(current), setPreference };
}
