import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Horizontal swipe rail.
 *
 * **Not a carousel.** No arrows, no dots, no auto-advance — it is native horizontal
 * scrolling with snap points, so the gesture is the same one used everywhere else on a
 * phone. Arrow carousels lose all but a small fraction of users past the first item;
 * native scroll does not (DESIGN.md §8).
 *
 * Use for a *short, known, ordered* set: stat tiles, pipeline columns, a property's
 * videos. Never for search results or a list being scanned — a rail hides how many
 * there are and makes them impossible to compare.
 */
export function Rail({
  children,
  className,
  itemClassName,
  /** Pulls the rail into the parent's padding so cards bleed to the screen edge, which
   *  is what makes the peek read as "more over here" rather than a cut-off card. */
  bleed = true,
}: {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  bleed?: boolean;
}) {
  return (
    <div
      className={cn('rail', bleed && '-mx-4 px-4 md:-mx-6 md:px-6', className)}
      // Focusable so the rail is reachable and scrollable by keyboard; without it a
      // keyboard user cannot reach items past the first screenful.
      tabIndex={0}
      role="group"
    >
      <div className={cn('flex gap-3', itemClassName)}>{children}</div>
    </div>
  );
}

/**
 * A rail item.
 *
 * The width is the load-bearing part: at 100% the card looks like a static block and
 * nobody swipes. At ~78vw the next card peeks in at the edge, which is the only
 * affordance telling the user there is more.
 */
export function RailItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-[78vw] max-w-[300px] shrink-0 snap-start md:w-auto', className)}>
      {children}
    </div>
  );
}
