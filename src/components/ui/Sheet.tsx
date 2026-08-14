import { useCallback, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDialogBehaviour } from '@/hooks/useDialogBehaviour';
import { cn } from '@/lib/cn';
import { X } from '@/lib/icons';
import { Icon } from './Icon';

/**
 * Slide-over panel.
 *
 * Right edge above 768px, bottom sheet below it — the same component, a different
 * edge. Chosen over a full page for the property form because entry happens repeatedly
 * from a phone and a sheet keeps the list underneath rather than replacing it.
 *
 * Animation is transform and opacity only. Animating width or height forces layout on
 * every frame, which is exactly what makes a sheet feel like it stutters — and "smooth"
 * was the requirement here.
 */
export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Set while a save is in flight, or when closing would discard edits. */
  disableDismiss?: boolean;
  size?: 'md' | 'lg';
}

const WIDTHS = {
  md: 'md:w-[480px]',
  lg: 'md:w-[560px]',
} as const;

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  disableDismiss = false,
  size = 'lg',
}: SheetProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const requestClose = useCallback(() => {
    if (!disableDismiss) onClose();
  }, [disableDismiss, onClose]);

  useDialogBehaviour({
    open,
    panelRef,
    onDismiss: requestClose,
    dismissible: !disableDismiss,
  });

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-end md:items-stretch">
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
          'relative flex w-full flex-col bg-surface outline-none shadow-lg',
          // Bottom sheet on a phone: 92dvh leaves a strip of the list visible, which
          // keeps the context and makes the panel feel layered rather than like a
          // page swap.
          'h-[92dvh] rounded-t-lg',
          'md:h-full md:rounded-none md:rounded-s-lg',
          WIDTHS[size],
          // Transform only — see the note above.
          'motion-safe:animate-sheet-in',
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4">
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

        {/* Only the body scrolls; the header and the save/cancel footer stay pinned so
            the primary action never scrolls out of reach on a long form. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>

        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
