import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon';
import { cn } from '@/lib/cn';
import { CheckCircle, Info, Warning, X } from '@/lib/icons';
import {
  ToastContext,
  type Toast,
  type ToastApi,
  type ToastOptions,
  type ToastTone,
} from './ToastContext';

/**
 * Toast host.
 *
 * Durations follow FRONTEND.md §10.5.5: success is brief, errors linger because they
 * carry something to act on, and undo sits between the two with a visible countdown.
 */
const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  error: 8000,
};

const UNDO_DURATION = 5000;
/** A fourth toast dismisses the oldest — a stack taller than this covers content. */
const MAX_VISIBLE = 3;

const TONE_STYLES: Record<
  ToastTone,
  { bar: string; icon: string; glyph: typeof CheckCircle }
> = {
  success: { bar: 'bg-won', icon: 'text-won', glyph: CheckCircle },
  error: { bar: 'bg-lost', icon: 'text-lost', glyph: Warning },
  info: { bar: 'bg-active', icon: 'text-active', glyph: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();

      setToasts((current) => {
        const next = [...current, { ...toast, id }];
        // Trim from the front: the newest is the one the user just caused.
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
      });

      if (toast.durationMs > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => {
            dismiss(id);
          }, toast.durationMs),
        );
      }

      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => {
    const make =
      (tone: ToastTone) =>
      (message: string, options: ToastOptions = {}) => {
        push({
          message,
          tone,
          // An error with an action must not vanish before it can be acted on.
          durationMs:
            options.durationMs ??
            (tone === 'error' && options.action ? 0 : DEFAULT_DURATION[tone]),
          ...(options.action && { action: options.action }),
          showCountdown: false,
        });
      };

    return {
      success: make('success'),
      error: make('error'),
      info: make('info'),
      undo: (message, onUndo, undoLabel) => {
        let id = '';
        id = push({
          message,
          tone: 'info',
          durationMs: UNDO_DURATION,
          showCountdown: true,
          action: {
            label: undoLabel,
            onClick: () => {
              onUndo();
              dismiss(id);
            },
          },
        });
      },
      dismiss,
    };
  }, [push, dismiss]);

  return (
    <ToastContext value={api}>
      {children}

      {createPortal(
        <div
          // Bottom on mobile, offset above the tab bar and the home indicator so it
          // never covers the primary navigation. Top-right on desktop.
          className={cn(
            'pointer-events-none fixed z-50 flex flex-col gap-2',
            'inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))]',
            // top-20 clears the 56px sticky topbar with a 24px gap; top-6 would
            // overlay the search field and the sign-out control.
            'md:inset-x-auto md:bottom-auto md:end-6 md:top-20 md:w-[360px]',
          )}
        >
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => {
                dismiss(toast.id);
              }}
              closeLabel={t('action.close')}
            />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext>
  );
}

function ToastItem({
  toast,
  onDismiss,
  closeLabel,
}: {
  toast: Toast;
  onDismiss: () => void;
  closeLabel: string;
}) {
  const tone = TONE_STYLES[toast.tone];

  return (
    <div
      // Errors interrupt; everything else waits its turn in the announcement queue.
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto relative flex items-start gap-3 overflow-hidden',
        'rounded-md border border-border bg-surface-raised p-3 shadow-md',
        'animate-fade-in',
      )}
    >
      {/* Leading bar carries the tone; the icon repeats it, because colour alone is
          never the signal (DESIGN.md §4.3). */}
      <span className={cn('absolute inset-y-0 start-0 w-1', tone.bar)} aria-hidden />

      <Icon icon={tone.glyph} size="sm" className={cn('mt-1 ms-1', tone.icon)} />

      <p className="min-w-0 flex-1 text-body-sm text-ink">{toast.message}</p>

      {toast.action && (
        <button
          type="button"
          onClick={toast.action.onClick}
          className="shrink-0 rounded-sm px-2 py-1 text-caption font-medium text-accent transition-colors duration-fast hover:bg-accent-subtle"
        >
          {toast.action.label}
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        aria-label={closeLabel}
        className="shrink-0 rounded-sm p-1 text-ink-muted transition-colors duration-fast hover:text-ink"
      >
        <Icon icon={X} size="sm" />
      </button>

      {toast.showCountdown && toast.durationMs > 0 && (
        // Makes the undo window visible rather than something to guess at.
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1 origin-left bg-accent motion-reduce:hidden"
          style={{
            animation: `toast-countdown ${String(toast.durationMs)}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}
