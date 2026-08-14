import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement `matchMedia`, and several hooks depend on it: `useTheme` reads
 * `prefers-color-scheme`, and `useInstallPrompt` checks `display-mode: standalone`.
 * Without this any test that renders them dies on `matchMedia is not a function`.
 *
 * Deliberately a *working* stub rather than `vi.fn()`: it returns a real object with the
 * listener methods, so code that subscribes to media changes runs its normal path instead
 * of silently taking an error branch. Every query reports `false`, which is the honest
 * default — no dark mode, not installed — and a test that needs otherwise can override
 * this per-case.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      // Deprecated, but still what some libraries reach for.
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
