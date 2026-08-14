import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { cn } from '@/lib/cn';
import { X } from '@/lib/icons';

/**
 * Modal dialog.
 *
 * The mechanics below are what separate a real dialog from a styled div, and each one
 * is a bug if missed: focus escaping to the page behind, the background scrolling under
 * the overlay, Escape doing nothing, and focus vanishing to `<body>` on close so the
 * next Tab starts from the top of the document.
 *
 * `Sheet` (F6) reuses this same foundation with a different edge and transform.
 */

/** Elements that can hold focus, for the tab trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Set when closing would discard work — blocks backdrop and Escape dismissal. */
  disableDismiss?: boolean;
}

const SIZES = {
  sm: 'max-w-[400px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[720px]',
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  disableDismiss = false,
}: ModalProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const requestClose = useCallback(() => {
    if (!disableDismiss) onClose();
  }, [disableDismiss, onClose]);

  // Focus management: remember where focus was, move it into the dialog, and put it
  // back on close. Without the restore, closing a dialog drops focus to <body> and a
  // keyboard user has to tab from the top of the page again.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panelRef.current)?.focus();

    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  // Scroll lock. The padding compensates for the scrollbar's width so the page behind
  // does not visibly jump sideways as it disappears.
  useEffect(() => {
    if (!open) return;

    const { body } = document;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingInlineEnd;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingInlineEnd = `${String(scrollbarWidth)}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingInlineEnd = previousPadding;
    };
  }, [open]);

  // Escape to close, and a Tab trap that cycles within the panel.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        requestClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, requestClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 motion-safe:animate-fade-in"
        onClick={requestClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex w-full flex-col bg-surface-raised shadow-lg outline-none',
          // Full-width sheet from the bottom on a phone, centred card above 640px:
          // a centred 520px box on a 390px screen leaves unusable margins.
          'max-h-[90dvh] rounded-t-lg sm:rounded-lg',
          SIZES[size],
          'motion-safe:animate-fade-in',
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-h3 text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-body-sm text-ink-secondary">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={requestClose}
            aria-label={t('action.close')}
            className="shrink-0 rounded-sm p-1 text-ink-muted transition-colors duration-fast hover:bg-surface-overlay hover:text-ink"
          >
            <Icon icon={X} size="sm" />
          </button>
        </header>

        {/* The body scrolls, not the dialog — header and footer stay put. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
