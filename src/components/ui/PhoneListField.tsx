import { Controller, useFieldArray, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Plus, Trash } from '@/lib/icons';

/**
 * A repeatable list of contact numbers, with at least one row always present.
 *
 * Shared by the property and buyer forms rather than written twice. The two used to hold
 * a single `phone` field each and a dead `altPhone` the UI never rendered; one component
 * is what stops them drifting apart again.
 *
 * The first row is never removable. The API requires at least one number, so offering a
 * delete button that produces a submit-time validation error is a worse experience than
 * not offering it — the constraint is visible in the UI instead of enforced after the
 * fact.
 *
 * `Controller` rather than `register` for the number itself, for the reason documented on
 * the property form: a field set only through `setValue` is never entered into RHF's
 * registry, so its error never clears once shown.
 */
export interface PhoneListFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** The array field's name — `phones` on both current forms. */
  name: Path<T>;
  label: string;
  max?: number;
}

export function PhoneListField<T extends FieldValues>({
  control,
  name,
  label,
  max = 8,
}: PhoneListFieldProps<T>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control,
    // useFieldArray's name type is narrower than Path<T>; the caller passes an array
    // field, which the form schema already guarantees.
    name: name as never,
  });

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        // `items-start`, not `items-end`: each PhoneInput renders a "will be saved as"
        // hint below itself, so aligning to the bottom pushed the delete button below the
        // input it belongs to. Rows after the first carry no label, so their inputs start
        // at the row's top edge and the button lines up with them.
        <div key={field.id} className="flex items-start gap-2">
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[2fr_1fr]">
            <Controller
              control={control}
              name={`${name}.${String(index)}.number` as Path<T>}
              render={({ field: numberField, fieldState }) => (
                <PhoneInput
                  label={index === 0 ? label : undefined}
                  value={numberField.value ?? ''}
                  onChange={numberField.onChange}
                  onBlur={numberField.onBlur}
                  name={numberField.name}
                  ref={numberField.ref}
                  {...(fieldState.error?.message ? { error: fieldState.error.message } : {})}
                />
              )}
            />
            <Controller
              control={control}
              name={`${name}.${String(index)}.label` as Path<T>}
              render={({ field: labelField }) => (
                <Input
                  label={index === 0 ? t('property.phoneLabel') : undefined}
                  placeholder={t('property.phoneLabelHint')}
                  value={labelField.value ?? ''}
                  onChange={labelField.onChange}
                  onBlur={labelField.onBlur}
                  name={labelField.name}
                  ref={labelField.ref}
                />
              )}
            />
          </div>

          {/* Kept in the layout even on the first row, as an invisible spacer, so the
              inputs above it do not shift sideways when a second row appears. */}
          <Button
            variant="ghost"
            size="md"
            icon={Trash}
            aria-label={t('action.delete')}
            onClick={() => {
              remove(index);
            }}
            className={index === 0 ? 'invisible' : 'text-lost-ink'}
            {...(index === 0 ? { tabIndex: -1, 'aria-hidden': true } : {})}
          />
        </div>
      ))}

      {fields.length < max && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            append({ number: '', label: '' } as never);
          }}
          className="self-start"
        >
          <Icon icon={Plus} size="sm" />
          {t('property.addPhone')}
        </Button>
      )}
    </div>
  );
}
