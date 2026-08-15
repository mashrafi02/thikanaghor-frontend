import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The install prompt's capture behaviour.
 *
 * The bug this guards against is specific and common: `beforeinstallprompt` fires **once**
 * and often *before* React mounts. A hook that registers its listener on mount misses it,
 * `canInstall` stays false forever, and the install button never appears — on a build
 * where installation works perfectly.
 *
 * Module scope alone was not the fix, which is how it shipped broken: the only importer
 * was the lazy Settings route, so the module did not even load until long after the event
 * had fired. Startup now calls `startInstallPromptCapture()` explicitly, and two tests
 * pin that down — one fires the event with nothing mounted and expects a later mount to
 * already know, the other asserts that merely importing the module listens to nothing.
 */

interface FakePromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function makeEvent(outcome: 'accepted' | 'dismissed' = 'accepted'): FakePromptEvent {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as FakePromptEvent;
  // The real `prompt()` returns a promise; nothing here needs to await anything, so it
  // resolves immediately rather than being an async function with no await in it.
  event.prompt = vi.fn(() => Promise.resolve());
  Object.defineProperty(event, 'userChoice', { value: Promise.resolve({ outcome }) });
  return event;
}

/**
 * Fresh module instance per test, with capture started the way `main.tsx` starts it.
 *
 * Importing the module is deliberately *not* enough to begin listening — that was the bug:
 * the only importer was the lazy Settings route, so nothing was listening when Chrome
 * fired the event moments after load. Startup must call this explicitly.
 */
async function loadHook() {
  vi.resetModules();
  const module = await import('../src/hooks/useInstallPrompt');
  module.startInstallPromptCapture();
  return module.useInstallPrompt;
}

beforeEach(() => {
  vi.resetModules();
});

describe('useInstallPrompt', () => {
  it('captures an event fired while nothing is mounted', async () => {
    const useInstallPrompt = await loadHook();

    // No component exists yet — this is the cold-load case the hook is built for.
    act(() => {
      window.dispatchEvent(makeEvent());
    });

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(true);
  });

  it('prevents the browser default so the app chooses when to prompt', async () => {
    await loadHook();

    const event = makeEvent();
    window.dispatchEvent(event);

    // Chrome's mini-infobar appears unless the event is cancelled. Suppressing it is what
    // lets the offer live in Settings rather than over the login screen.
    expect(event.defaultPrevented).toBe(true);
  });

  it('reports nothing to install before any event', async () => {
    const useInstallPrompt = await loadHook();
    const { result } = renderHook(() => useInstallPrompt());

    // Firefox and desktop Safari never fire the event. The UI reads this to explain
    // itself rather than showing a button that would do nothing.
    expect(result.current.canInstall).toBe(false);
  });

  it('clears the offer once the prompt has been used', async () => {
    const useInstallPrompt = await loadHook();
    act(() => {
      window.dispatchEvent(makeEvent('accepted'));
    });

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(true);

    await act(async () => {
      const accepted = await result.current.promptInstall();
      expect(accepted).toBe(true);
    });

    // The event is single-use: calling prompt() twice throws. Clearing it is what stops
    // a second press from doing that.
    expect(result.current.canInstall).toBe(false);
  });

  it('reports a dismissed prompt as not accepted, and still clears it', async () => {
    const useInstallPrompt = await loadHook();
    act(() => {
      window.dispatchEvent(makeEvent('dismissed'));
    });

    const { result } = renderHook(() => useInstallPrompt());

    await act(async () => {
      expect(await result.current.promptInstall()).toBe(false);
    });
    expect(result.current.canInstall).toBe(false);
  });

  it('withdraws the offer when the app reports itself installed', async () => {
    const useInstallPrompt = await loadHook();
    act(() => {
      window.dispatchEvent(makeEvent());
    });

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.canInstall).toBe(false);
  });

  it('registers its listeners exactly once, however many times start is called', async () => {
    vi.resetModules();
    const module = await import('../src/hooks/useInstallPrompt');

    const addSpy = vi.spyOn(window, 'addEventListener');
    module.startInstallPromptCapture();
    module.startInstallPromptCapture();

    const types = addSpy.mock.calls.map(([type]) => type);
    expect(types.filter((type) => type === 'beforeinstallprompt')).toHaveLength(1);
    expect(types).toContain('appinstalled');
    addSpy.mockRestore();
  });

  it('does not listen until startup calls it', async () => {
    // The regression that shipped: the module was only imported by a lazy route, so the
    // event had already fired by the time anything was listening. Importing alone must
    // therefore be inert, and `main.tsx` must be the thing that starts it.
    vi.resetModules();
    const addSpy = vi.spyOn(window, 'addEventListener');
    await import('../src/hooks/useInstallPrompt');

    expect(addSpy.mock.calls.map(([type]) => type)).not.toContain('beforeinstallprompt');
    addSpy.mockRestore();
  });

  it('does nothing when asked to prompt with no captured event', async () => {
    const useInstallPrompt = await loadHook();
    const { result } = renderHook(() => useInstallPrompt());

    await act(async () => {
      expect(await result.current.promptInstall()).toBe(false);
    });
  });
});
