import { memo } from 'react';
import type { PhosphorIcon } from '@/lib/icons';
import { cn } from '@/lib/cn';

/**
 * Icon wrapper.
 *
 * Exists to make DESIGN.md §9.2 unbreakable rather than aspirational: the size scale is
 * closed, the default weight is fixed, and colour always comes from `currentColor`. A
 * component cannot pass `size={18}` and quietly put an icon off the grid.
 */

/** 16 in pills and chips · 20 in general UI · 24 in empty states and mobile tabs. */
const SIZES = { sm: 16, md: 20, lg: 24 } as const;

export type IconSize = keyof typeof SIZES;

export interface IconProps {
  icon: PhosphorIcon;
  size?: IconSize;
  /** `fill` marks active, selected or completed — nothing else. `duotone` is unused:
   *  it introduces a second colour inside the glyph, which competes with the status
   *  colours doing semantic work beside it. */
  weight?: 'regular' | 'bold' | 'fill';
  className?: string;
  /** Supply when the icon *is* the control. Omit when a text label sits beside it —
   *  the icon is then decorative and gets aria-hidden. */
  label?: string;
}

export const Icon = memo(function Icon({
  icon: Glyph,
  size = 'md',
  weight = 'regular',
  className,
  label,
}: IconProps) {
  return (
    <Glyph
      size={SIZES[size]}
      weight={weight}
      // Never a hex: inheriting means an icon can never disagree with the text it
      // sits beside, and it themes for free.
      color="currentColor"
      className={cn('shrink-0', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
});
