import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import { CaretDown } from '@/lib/icons';

/**
 * Native `<select>`, deliberately.
 *
 * A custom listbox would let us restyle the popup, but the native control gets the
 * platform picker on a phone — the big scrollable wheel that is far easier to hit than
 * a bespoke dropdown, and which handles the Bangla IME and screen readers for free.
 * This app is used one-handed on Android; that trade is not close.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'size'
> {
  label?: string;
  error?: string;
  options: SelectOption[];
  /** Renders a leading blank option — for "any status" style filters. */
  placeholder?: string;
  size?: 'sm' | 'md';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, placeholder, size = 'md', className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-body-sm font-medium text-ink-secondary">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full appearance-none rounded-sm border bg-surface text-ink',
            // ps/pe rather than pl/pr so the caret stays on the correct side if a
            // right-to-left language is ever added.
            'ps-3 pe-8',
            size === 'sm' ? 'h-8 text-caption' : 'h-10 coarse:min-h-11 text-body-sm',
            'transition-colors duration-fast ease-standard',
            'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted',
            error ? 'border-lost' : 'border-border-strong hover:border-ink-muted',
            className,
          )}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Icon
          icon={CaretDown}
          size="sm"
          className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-ink-muted"
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-caption text-lost">
          {error}
        </p>
      )}
    </div>
  );
});
