import { forwardRef, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { normalizeBdPhone } from '@/lib/phone';

/**
 * Bangladeshi mobile number.
 *
 * Accepts every shape a number gets copied out of a Facebook post in — `01712-345678`,
 * `+880 1712 345678`, `০১৭১২৩৪৫৬৭৮` — because the server normalises them all to
 * `+8801712345678` on save. Rejecting any of them at the input would just make the
 * common case of pasting a number fail.
 *
 * The hint shows the normalised form as it is typed, so it is clear the app understood.
 */
export interface PhoneInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type'
> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { label, error, value, onChange, className, id, ...rest },
  ref,
) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const normalised = value ? normalizeBdPhone(value) : null;

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
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="01712-345678"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, !error && normalised && hintId) || undefined}
        className={cn(
          'tabular h-10 w-full rounded-sm border bg-surface px-3 text-body text-ink',
          'placeholder:text-ink-muted',
          'transition-colors duration-fast ease-standard',
          error ? 'border-lost' : 'border-border-strong hover:border-ink-muted',
          className,
        )}
        {...rest}
      />

      {error ? (
        <p id={errorId} role="alert" className="text-caption text-lost-ink">
          {error}
        </p>
      ) : (
        normalised && (
          <p id={hintId} className="text-caption text-ink-muted">
            {t('property.phoneNormalised', { phone: normalised })}
          </p>
        )
      )}
    </div>
  );
});
