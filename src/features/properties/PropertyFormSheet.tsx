import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AREA_UNITS, PROPERTY_TYPES, SOURCE_PLATFORMS } from '@/app/api/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PhoneListField } from '@/components/ui/PhoneListField';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { useApiError } from '@/hooks/useApiError';
import { Plus, Trash, Warning } from '@/lib/icons';
import { useCreatePropertyMutation, useUpdatePropertyMutation } from './propertyApi';
import {
  buildPropertySchema,
  EMPTY_FORM,
  toApiPayload,
  type PropertyFormValues,
} from './propertySchema';
import type { PropertyDetail } from './types';

/**
 * Create / edit a property, in a slide-over.
 *
 * Two things beyond the fields themselves:
 *
 * **Server errors land on the fields.** A 400 carrying `details` is mapped through
 * `setError` per field and the first invalid input is focused — the server's field names
 * match the form's because both come from the same schema. It never becomes a toast
 * (FRONTEND.md §10.5.4): a banner saying "invalid input" above a long form leaves the
 * user hunting for which field.
 *
 * **Closing a dirty form asks first.** A sheet is far easier to dismiss by accident than
 * a page — backdrop tap, Escape, swipe — and losing a half-typed listing copied from a
 * Facebook post is the most annoying thing this screen could do.
 */
export function PropertyFormSheet({
  open,
  onClose,
  property,
}: {
  open: boolean;
  onClose: () => void;
  /** Present for edit, absent for create. */
  property?: PropertyDetail;
}) {
  const { t } = useTranslation();
  const resolveError = useApiError();

  const [createProperty, { isLoading: isCreating }] = useCreatePropertyMutation();
  const [updateProperty, { isLoading: isUpdating }] = useUpdatePropertyMutation();
  const isSaving = isCreating || isUpdating;

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Rebuilt when the language changes so validation messages follow it.
  const schema = useMemo(() => buildPropertySchema(t), [t]);

  const defaultValues = useMemo<PropertyFormValues>(() => {
    if (!property) return EMPTY_FORM;
    return {
      title: property.title,
      contactName: property.contactName,
      phones: property.phones.map((phone) => ({
        number: phone.display,
        label: phone.label ?? '',
      })),
      type: property.type,
      askingPrice: property.askingPrice ?? '',
      commissionRate: property.commissionRate,
      area: property.area ?? '',
      areaUnit: property.areaUnit,
      district: property.district ?? '',
      areaName: property.areaName ?? '',
      bedrooms: property.bedrooms === null ? '' : String(property.bedrooms),
      bathrooms: property.bathrooms === null ? '' : String(property.bathrooms),
      sourcePlatform: property.sourcePlatform,
      sourceUrl: property.sourceUrl ?? '',
      notes: property.notes ?? '',
      videos: property.videos.map((video) => ({ url: video.url, label: video.label ?? '' })),
    };
  }, [property]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(schema) as Resolver<PropertyFormValues>,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'videos' });

  // Reset when the sheet reopens, so a cancelled edit does not persist into the next.
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

  // `useWatch` rather than `watch`: `watch` reads through a mutable ref during render,
  // which makes the React Compiler skip this whole component. `useWatch` is a real
  // subscription hook, so the sheet stays compiled and re-renders only on type changes.
  const type = useWatch({ control, name: 'type' });
  const isBuilding = type === 'FLAT' || type === 'BUILDING';

  const requestClose = useCallback(() => {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const payload = toApiPayload(values);

      if (property) {
        await updateProperty({ id: property.id, body: payload }).unwrap();
      } else {
        await createProperty(payload).unwrap();
      }

      // No success toast on create: the sheet closes and the new row appears at the top
      // of the list. On edit, the change is visible on the record itself.
      reset(EMPTY_FORM);
      onClose();
    } catch (caught) {
      const resolved = resolveError(caught);

      if (resolved.details) {
        let firstField: string | null = null;
        for (const [field, messages] of Object.entries(resolved.details)) {
          if (!messages[0]) continue;
          // The server's field names match the form's — both derive from the same
          // schema shape — so this maps directly with no translation table.
          setError(field as keyof PropertyFormValues, {
            type: 'server',
            message: messages[0],
          });
          firstField ??= field;
        }
        if (firstField) {
          document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
        }
        return;
      }

      setFormError(resolved.text);
    }
  });

  return (
    <>
      <Sheet
        open={open}
        onClose={requestClose}
        title={property ? t('property.editTitle') : t('property.addNew')}
        description={property ? undefined : t('property.addHint')}
        disableDismiss={isSaving}
        footer={
          <>
            <Button variant="ghost" onClick={requestClose} disabled={isSaving}>
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
          className="flex flex-col gap-6"
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

          {/* The four fields the whole record hangs on, first and ungrouped. */}
          <section className="flex flex-col gap-3">
            <Input
              label={t('property.formTitle')}
              autoFocus
              {...register('title')}
              {...(errors.title?.message ? { error: errors.title.message } : {})}
            />

            <Input
              label={t('property.contactName')}
              {...register('contactName')}
              {...(errors.contactName?.message ? { error: errors.contactName.message } : {})}
            />

            {/* Full width, not sharing the two-column row with the contact name. The
                phone list is itself a two-column grid per row plus a delete button, and
                nesting that inside half the sheet truncated every label to "Owne". */}
            <PhoneListField control={control} name="phones" label={t('property.contactPhone')} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label={t('property.type')}
                {...register('type')}
                options={PROPERTY_TYPES.map((value) => ({
                  value,
                  label: t(`enums:propertyType.${value}`),
                }))}
              />
              <Select
                label={t('property.source')}
                {...register('sourcePlatform')}
                options={SOURCE_PLATFORMS.map((value) => ({
                  value,
                  label: t(`enums:sourcePlatform.${value}`),
                }))}
              />
            </div>
          </section>

          <FormSection title={t('property.priceSection')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Controller
                control={control}
                name="askingPrice"
                render={({ field, fieldState }) => (
                  <MoneyInput
                    label={t('property.askingPrice')}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    {...(fieldState.error?.message ? { error: fieldState.error.message } : {})}
                  />
                )}
              />
              <Input
                label={t('property.commissionRate')}
                inputMode="decimal"
                numeric
                {...register('commissionRate')}
                {...(errors.commissionRate?.message
                  ? { error: errors.commissionRate.message }
                  : {})}
              />
            </div>
          </FormSection>

          <FormSection title={t('property.areaSection')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t('property.area')}
                inputMode="decimal"
                numeric
                {...register('area')}
                {...(errors.area?.message ? { error: errors.area.message } : {})}
              />
              <Select
                label={t('property.areaUnit')}
                {...register('areaUnit')}
                options={AREA_UNITS.map((value) => ({
                  value,
                  label: t(`enums:areaUnit.${value}`),
                }))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('property.district')} {...register('district')} />
              <Input label={t('property.areaName')} {...register('areaName')} />
            </div>

            {/* Only for a flat or a building — bedrooms on raw land is nonsense, and a
                permanently-visible irrelevant field makes the form feel longer. */}
            {isBuilding && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label={t('property.bedrooms')}
                  inputMode="numeric"
                  numeric
                  {...register('bedrooms')}
                />
                <Input
                  label={t('property.bathrooms')}
                  inputMode="numeric"
                  numeric
                  {...register('bathrooms')}
                />
              </div>
            )}
          </FormSection>

          <FormSection title={t('property.videos')}>
            {errors.videos?.root?.message && (
              <p role="alert" className="text-caption text-lost-ink">
                {errors.videos.root.message}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[2fr_1fr]">
                    <Input
                      label={index === 0 ? t('property.videoUrl') : undefined}
                      placeholder="https://facebook.com/… · tiktok.com/… · youtube.com/…"
                      {...register(`videos.${index}.url` as const)}
                      {...(errors.videos?.[index]?.url?.message
                        ? { error: errors.videos[index].url.message }
                        : {})}
                    />
                    <Input
                      label={index === 0 ? t('property.videoLabel') : undefined}
                      {...register(`videos.${index}.label` as const)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="md"
                    icon={Trash}
                    aria-label={t('action.delete')}
                    onClick={() => {
                      remove(index);
                    }}
                    className="text-lost-ink"
                  />
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => {
                append({ url: '', label: '' });
              }}
              disabled={fields.length >= 10}
            >
              {t('property.addVideo')}
            </Button>
          </FormSection>

          <FormSection title={t('property.moreSection')}>
            <Input
              label={t('property.sourceUrl')}
              placeholder="https://facebook.com/…"
              {...register('sourceUrl')}
              {...(errors.sourceUrl?.message ? { error: errors.sourceUrl.message } : {})}
            />

            <div className="flex flex-col gap-1">
              <label
                htmlFor="property-notes"
                className="text-body-sm font-medium text-ink-secondary"
              >
                {t('property.notes')}
              </label>
              <textarea
                id="property-notes"
                rows={4}
                {...register('notes')}
                className="w-full rounded-sm border border-border-strong bg-surface p-3 text-body text-ink transition-colors duration-fast hover:border-ink-muted"
              />
            </div>
          </FormSection>
        </form>
      </Sheet>

      <Modal
        open={confirmDiscard}
        onClose={() => {
          setConfirmDiscard(false);
        }}
        title={t('form.discardTitle')}
        description={t('form.discardHint')}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDiscard(false);
              }}
            >
              {t('form.keepEditing')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDiscard(false);
                reset(defaultValues);
                onClose();
              }}
            >
              {t('form.discard')}
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-ink-secondary">{t('form.discardBody')}</p>
      </Modal>
    </>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="border-b border-border pb-2 text-body-sm font-medium text-ink-secondary">
        {title}
      </h3>
      {children}
    </section>
  );
}
