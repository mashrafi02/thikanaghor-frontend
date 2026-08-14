import { useEffect, type RefObject } from 'react';

/**
 * The behaviour that makes an overlay a real dialog rather than a styled div.
 *
 * Shared by `Modal` and `Sheet` so the two cannot drift — a focus trap that exists in
 * one and not the other is the kind of gap nobody notices until a keyboard user tabs
 * straight out of an open sheet and starts editing the page behind it.
 *
 * Four things, each a bug if missing:
 *  1. focus moves into the panel on open and **returns** on close
 *  2. Tab cycles within the panel
 *  3. Escape closes
 *  4. the page behind does not scroll
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogBehaviour({
  open,
  panelRef,
  onDismiss,
  dismissible = true,
}: {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  dismissible?: boolean;
}) {
  // Focus in, and back out again on close. Without the restore, closing drops focus to
  // <body> and the next Tab starts from the top of the document.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panelRef.current)?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, [open, panelRef]);

  // Scroll lock. The padding compensates for the vanishing scrollbar so the page
  // behind does not jump sideways as the overlay opens.
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

  // Escape, and a Tab trap that wraps at both ends.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!dismissible) return;
        event.stopPropagation();
        onDismiss();
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

    // Capture phase, so the dialog sees Escape before anything inside it does.
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, dismissible, onDismiss, panelRef]);
}
