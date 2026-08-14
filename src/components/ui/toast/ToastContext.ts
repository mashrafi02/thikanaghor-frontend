import { createContext, use } from 'react';

/**
 * Toast API.
 *
 * Split from the provider component so the module exports only non-components — React
 * Fast Refresh cannot hot-reload a file that mixes the two, and losing state on every
 * save while building forms is a genuine cost.
 */

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  tone?: ToastTone;
  /** Overrides the tone default. Errors carrying an action never auto-dismiss. */
  durationMs?: number;
  action?: ToastAction;
}

export interface Toast extends Required<Pick<ToastOptions, 'tone'>> {
  id: string;
  message: string;
  durationMs: number;
  action?: ToastAction;
  /** Drives the countdown ring on an undo toast, so the window is visible rather than
   *  something the user has to guess at. */
  showCountdown: boolean;
}

export interface ToastApi {
  /** Something happened that the user cannot already see on screen. */
  success: (message: string, options?: ToastOptions) => void;
  /** Anything that is not a field-level validation failure. */
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  /**
   * The delete pattern (FRONTEND.md §10.5.3): the row disappears immediately and this
   * offers the way back. Replaces a confirm dialog — no extra click in the common case,
   * fully recoverable in the rare mistake.
   */
  undo: (message: string, onUndo: () => void, undoLabel: string) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = use(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return context;
}
