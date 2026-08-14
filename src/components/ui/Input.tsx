import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Text input with label, hint and error.
 *
 * The error is wired with `aria-describedby` and `aria-invalid` rather than being a
 * red line under the field. That is what makes a server-side validation failure
 * (FRONTEND.md §10.5.4) actually reach someone using a screen reader, instead of only
 * the people who can see the colour change.
 */

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  /** Right-aligned tabular figures, for money and other numeric columns. */
  numeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, numeric, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-body-sm font-medium text-ink-secondary">
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hint && !error && hintId) || undefined}
        className={cn(
          'h-10 coarse:min-h-11 w-full rounded-sm border bg-surface px-3 text-body text-ink',
          'placeholder:text-ink-muted',
          'transition-colors duration-fast ease-standard',
          'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted',
          error ? 'border-lost' : 'border-border-strong hover:border-ink-muted',
          numeric && 'tabular text-end',
          className,
        )}
        {...rest}
      />

      {error ? (
        // role="alert" so the message is announced when it appears after a submit.
        <p id={errorId} role="alert" className="text-caption text-lost">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-caption text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
});
