import { forwardRef, useId } from 'react';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import { normalizeNumericInput } from '@/lib/format';

/**
 * Taka amount.
 *
 * Two behaviours that matter:
 *
 * **It accepts Bengali digits.** Someone typing with a Bangla keyboard produces ৫০০০০০০,
 * and rejecting that would make the app unusable in its own default language. The value
 * is normalised to ASCII only when it is submitted.
 *
 * **It emits a plain string, never a number.** `parseFloat` on money is the bug the
 * whole Decimal pipeline exists to prevent; the client does no arithmetic on it at all.
 *
 * The live lakh/crore reading beneath is the practical part: ৫০০০০০০ is hard to verify
 * at a glance, "৫০ লক্ষ" is not — so a mistyped zero is caught while typing.
 */
export interface MoneyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type'
> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { label, error, value, onChange, className, id, ...rest },
  ref,
) {
  const format = useFormat();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const normalized = normalizeNumericInput(value);
  const preview =
    normalized && Number.isFinite(Number(normalized)) ? format.moneyShort(normalized) : null;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-body-sm font-medium text-ink-secondary">
          {label}
        </label>
      )}

      <div className="relative">
        <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-body text-ink-muted">
          ৳
        </span>
        <input
          ref={ref}
          id={inputId}
          // `inputMode` rather than `type="number"`: a number input rejects Bengali
          // digits outright and adds spinner arrows nobody wants on a price.
          inputMode="numeric"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error && errorId, !error && preview && hintId) || undefined}
          className={cn(
            'tabular h-10 w-full rounded-sm border bg-surface ps-8 pe-3 text-end text-body text-ink',
            'transition-colors duration-fast ease-standard',
            error ? 'border-lost' : 'border-border-strong hover:border-ink-muted',
            className,
          )}
          {...rest}
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-caption text-lost-ink">
          {error}
        </p>
      ) : (
        preview && (
          <p id={hintId} className="text-caption text-ink-muted">
            {preview}
          </p>
        )
      )}
    </div>
  );
});
