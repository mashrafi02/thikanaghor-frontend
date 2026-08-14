import type { PhosphorIcon } from '@/lib/icons';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * A small set of mutually exclusive choices, all visible at once.
 *
 * Used where a `<select>` would be worse: two or three options that the user should be
 * able to see the state of without opening anything — theme, language, a time range.
 * Above about four options this stops fitting on a phone and a `Select` is the right
 * control instead.
 *
 * `aria-pressed` on plain buttons rather than `role="radiogroup"`: radios imply arrow-key
 * navigation between options and a single tab stop, which is correct for a form field but
 * wrong for controls that apply immediately on press.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'md',
  className,
}: {
  value: T;
  options: { value: T; label: string; icon?: PhosphorIcon }[];
  onChange: (value: T) => void;
  /** Names the group for assistive tech — the visible label sits outside. */
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex rounded-sm border border-border p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              onChange(option.value);
            }}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-[3px] transition-colors duration-fast ease-standard',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              size === 'sm'
                ? 'coarse:min-h-11 px-3 py-1 text-body-sm'
                : 'min-h-11 px-4 text-body-sm',
              active
                ? 'bg-accent text-accent-fg'
                : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
            )}
          >
            {option.icon && <Icon icon={option.icon} size="sm" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
