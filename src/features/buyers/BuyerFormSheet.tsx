import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { BUYER_STATUSES, PROPERTY_TYPES } from '@/app/api/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { useApiError } from '@/hooks/useApiError';
import { cn } from '@/lib/cn';
import { normalizeNumericInput } from '@/lib/format';
import { isValidBdPhone } from '@/lib/phone';
import { Warning } from '@/lib/icons';
import { useCreateBuyerMutation, useUpdateBuyerMutation } from './buyerApi';
import type { Buyer } from './types';

/**
 * Create / edit a buyer.
 *
 * Shorter than the property form, and structured around the two things the matcher
 * actually uses: budget, and preferences. Everything else is contact detail.
 */

type Translate = (key: string, options?: Record<string, unknown>) => string;

function buildSchema(t: Translate) {
  const numericOrBlank = (value: string) =>
    !value || Number.isFinite(Number(normalizeNumericInput(value)));

  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t('form.required', { field: t('buyer.name') }))
        .max(120),
      phone: z
        .string()
        .trim()
        .min(1, t('form.required', { field: t('buyer.phone') }))
        .refine(isValidBdPhone, t('form.invalidPhone')),
      budgetMin: z.string().refine(numericOrBlank, t('form.mustBeNumber')),
      budgetMax: z.string().refine(numericOrBlank, t('form.mustBeNumber')),
      preferredTypes: z.array(z.enum(PROPERTY_TYPES)),
      preferredAreas: z.string(),
      status: z.enum(BUYER_STATUSES),
      notes: z.string().trim().max(5000),
    })
    .refine(
      (data) => {
        // Mirrors the server: a minimum above the maximum matches nothing, silently.
        if (!data.budgetMin || !data.budgetMax) return true;
        return (
          Number(normalizeNumericInput(data.budgetMin)) <=
          Number(normalizeNumericInput(data.budgetMax))
        );
      },
      { path: ['budgetMax'], message: t('form.budgetOrder') },
    );
}

type BuyerFormValues = z.infer<ReturnType<typeof buildSchema>>;

const EMPTY: BuyerFormValues = {
  name: '',
  phone: '',
  budgetMin: '',
  budgetMax: '',
  preferredTypes: [],
  preferredAreas: '',
  status: 'ACTIVE',
  notes: '',
};

export function BuyerFormSheet({
  open,
  onClose,
  buyer,
}: {
  open: boolean;
  onClose: () => void;
  buyer?: Buyer;
}) {
  const { t } = useTranslation();
  const resolveError = useApiError();
  const [createBuyer, { isLoading: creating }] = useCreateBuyerMutation();
  const [updateBuyer, { isLoading: updating }] = useUpdateBuyerMutation();
  const isSaving = creating || updating;

  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(() => buildSchema(t), [t]);

  const defaultValues = useMemo<BuyerFormValues>(() => {
    if (!buyer) return EMPTY;
    return {
      name: buyer.name,
      phone: buyer.phoneDisplay,
      budgetMin: buyer.budgetMin ?? '',
      budgetMax: buyer.budgetMax ?? '',
      preferredTypes: buyer.preferredTypes,
      // Stored as an array, edited as one comma-separated field — a chip editor is
      // more UI than this earns for a list that is usually two or three entries.
      preferredAreas: buyer.preferredAreas.join(', '),
      status: buyer.status,
      notes: buyer.notes ?? '',
    };
  }, [buyer]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<BuyerFormValues>({
    resolver: zodResolver(schema) as Resolver<BuyerFormValues>,
    defaultValues,
  });

  // Clearing the banner is a render-time adjustment, not effect work: React's documented
  // "reset state when a prop changes" pattern. Doing it in the effect costs an extra
  // render pass on every open and trips the cascading-render rule.
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    setFormError(null);
  }

  // `reset` is a call into react-hook-form's own store, so it stays in an effect.
  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const payload: Record<string, unknown> = {
      name: values.name,
      phone: values.phone,
      preferredTypes: values.preferredTypes,
      preferredAreas: values.preferredAreas
        .split(',')
        .map((area) => area.trim())
        .filter(Boolean),
      status: values.status,
    };

    // Blank optional fields are omitted, not sent as "" — the server rejects an empty
    // string where it accepts an absent key.
    if (normalizeNumericInput(values.budgetMin)) {
      payload['budgetMin'] = normalizeNumericInput(values.budgetMin);
    }
    if (normalizeNumericInput(values.budgetMax)) {
      payload['budgetMax'] = normalizeNumericInput(values.budgetMax);
    }
    if (values.notes.trim()) payload['notes'] = values.notes.trim();

    try {
      if (buyer) await updateBuyer({ id: buyer.id, body: payload }).unwrap();
      else await createBuyer(payload).unwrap();

      reset(EMPTY);
      onClose();
    } catch (caught) {
      const resolved = resolveError(caught);

      if (resolved.details) {
        for (const [field, messages] of Object.entries(resolved.details)) {
          if (messages[0]) {
            setError(field as keyof BuyerFormValues, { type: 'server', message: messages[0] });
          }
        }
        return;
      }
      setFormError(resolved.text);
    }
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={buyer ? t('buyer.editTitle') : t('buyer.addNew')}
      disableDismiss={isSaving}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {t('action.cancel')}
          </Button>
          <Button variant="primary" loading={isSaving} onClick={() => void onSubmit()}>
            {t('action.save')}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="flex flex-col gap-4"
        noValidate
      >
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-lost bg-lost-subtle p-3 text-body-sm text-lost-ink"
          >
            <Icon icon={Warning} size="sm" className="mt-px" />
            {formError}
          </p>
        )}

        <Input
          label={t('buyer.name')}
          autoFocus
          {...register('name')}
          {...(errors.name?.message ? { error: errors.name.message } : {})}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <PhoneInput
              label={t('buyer.phone')}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              {...(fieldState.error?.message ? { error: fieldState.error.message } : {})}
            />
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="budgetMin"
            render={({ field, fieldState }) => (
              <MoneyInput
                label={t('buyer.budgetMin')}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                {...(fieldState.error?.message ? { error: fieldState.error.message } : {})}
              />
            )}
          />
          <Controller
            control={control}
            name="budgetMax"
            render={({ field, fieldState }) => (
              <MoneyInput
                label={t('buyer.budgetMax')}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                {...(fieldState.error?.message ? { error: fieldState.error.message } : {})}
              />
            )}
          />
        </div>

        {/* Toggle chips rather than a multi-select: five options, and tapping a chip is
            far easier one-handed than a multi-select's platform picker. */}
        <Controller
          control={control}
          name="preferredTypes"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-body-sm font-medium text-ink-secondary">
                {t('buyer.preferredTypes')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((type) => {
                  const active = field.value.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        field.onChange(
                          active
                            ? field.value.filter((value) => value !== type)
                            : [...field.value, type],
                        );
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-body-sm transition-colors duration-fast',
                        active
                          ? 'border-accent bg-accent-subtle text-accent'
                          : 'border-border text-ink-secondary hover:border-border-strong',
                      )}
                    >
                      {t(`enums:propertyType.${type}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        />

        <Input
          label={t('buyer.preferredAreas')}
          hint={t('buyer.areasHint')}
          placeholder="উত্তরা, বসুন্ধরা"
          {...register('preferredAreas')}
        />

        <Select
          label={t('buyer.status')}
          {...register('status')}
          options={BUYER_STATUSES.map((value) => ({
            value,
            label: t(`enums:buyerStatus.${value}`),
          }))}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="buyer-notes" className="text-body-sm font-medium text-ink-secondary">
            {t('buyer.notes')}
          </label>
          <textarea
            id="buyer-notes"
            rows={3}
            {...register('notes')}
            className="w-full rounded-sm border border-border-strong bg-surface p-3 text-body text-ink"
          />
        </div>
      </form>
    </Sheet>
  );
}
