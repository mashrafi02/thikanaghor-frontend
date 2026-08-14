import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import type { PhosphorIcon } from '@/lib/icons';

/**
 * Button.
 *
 * Hover changes background and border only — never transform or scale. A button that
 * grows on hover is one of the tells listed in DESIGN.md §2, and at this density it
 * also nudges neighbouring layout.
 */

const VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-accent/50',
  secondary:
    'bg-surface text-ink border border-border-strong hover:bg-surface-overlay disabled:text-ink-muted',
  ghost: 'text-ink-secondary hover:bg-surface-overlay hover:text-ink',
  // text-lost-fg, not text-white: on dark mode's brighter red, white measures
  // 3.62:1 and fails. The token carries the ink that actually passes in each mode.
  danger: 'bg-lost text-lost-fg hover:opacity-90 disabled:bg-lost/50',
} as const;

const SIZES = {
  // Every size clears the 44px touch target once the icon and border are counted,
  // except `sm`, which is desktop-only chrome (table row actions, filter chips).
  // `coarse:min-h-11` is the 44px touch floor (DESIGN.md §12). The visual height stays
  // 32/40px with a mouse, where denser is better and a fingertip is not the input.
  sm: 'h-8 coarse:min-h-11 px-3 text-caption gap-1',
  md: 'h-10 coarse:min-h-11 px-4 text-body-sm gap-2',
  lg: 'h-12 px-6 text-body gap-2',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  icon?: PhosphorIcon;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'start',
    fullWidth,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled ?? loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      // Tells assistive tech the control is working, without removing it from the
      // accessibility tree the way `disabled` alone would.
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors duration-fast ease-standard',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        icon &&
        iconPosition === 'start' && <Icon icon={icon} size={size === 'sm' ? 'sm' : 'md'} />
      )}
      {children}
      {!loading && icon && iconPosition === 'end' && (
        <Icon icon={icon} size={size === 'sm' ? 'sm' : 'md'} />
      )}
    </button>
  );
});
