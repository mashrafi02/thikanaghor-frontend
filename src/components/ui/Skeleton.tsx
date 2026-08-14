import { cn } from '@/lib/cn';

/**
 * Loading placeholder.
 *
 * Sized by the caller to match the real content's height, so nothing shifts when data
 * arrives. A skeleton that is the wrong height is worse than none — it moves the page
 * under a thumb that is already reaching for a row.
 *
 * The shimmer is a translating gradient rather than a pulsing opacity: pulse reads as
 * "broken/disabled", and under `prefers-reduced-motion` the animation stops while the
 * block stays visible.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-sm bg-surface-sunken',
        'after:absolute after:inset-0 after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-surface-overlay after:to-transparent',
        'motion-reduce:after:hidden',
        className,
      )}
    />
  );
}

/** Text lines at body height, with the last one short like real prose. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}
