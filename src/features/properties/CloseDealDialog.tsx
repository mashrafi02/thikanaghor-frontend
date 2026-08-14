import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useApiError } from '@/hooks/useApiError';
import { useFormat } from '@/hooks/useFormat';
import { normalizeNumericInput } from '@/lib/format';
import { useCloseDealMutation } from './propertyApi';
import type { PropertyDetail } from './types';

/**
 * Closing a deal.
 *
 * The one irreversible action in the app — `CLOSED_WON` is terminal in the state
 * machine — so this is one of the few places that keeps a confirmation step rather than
 * the undo pattern (FRONTEND.md §10.5.3).
 *
 * The live preview is the point of the dialog. It shows what the commission *will* be
 * as the sale price is typed, so a mistyped figure is caught before it is committed
 * rather than discovered later on the earnings dashboard.
 */
export function CloseDealDialog({
  property,
  open,
  onClose,
  onClosed,
}: {
  property: PropertyDetail;
  open: boolean;
  onClose: () => void;
  onClosed: (commissionAmount: string | null) => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const resolveError = useApiError();
  const [closeDeal, { isLoading }] = useCloseDealMutation();

  const [salePrice, setSalePrice] = useState(
    property.negotiatedPrice ?? property.askingPrice ?? '',
  );
  const [rate, setRate] = useState(property.commissionRate);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * Preview only.
   *
   * Deliberately labelled as an estimate and never sent to the server: the authoritative
   * figure is computed there with decimal arithmetic. This uses floats, which is fine
   * for showing a number and would not be fine for storing one.
   */
  const preview = useMemo(() => {
    const price = Number(normalizeNumericInput(salePrice));
    const percent = Number(normalizeNumericInput(rate));
    if (!Number.isFinite(price) || !Number.isFinite(percent) || price <= 0) return null;
    return ((price * percent) / 100).toFixed(2);
  }, [salePrice, rate]);

  async function handleSubmit() {
    setFieldErrors({});
    setFormError(null);

    try {
      const result = await closeDeal({
        id: property.id,
        finalSalePrice: normalizeNumericInput(salePrice),
        commissionRate: normalizeNumericInput(rate),
      }).unwrap();

      onClosed(result.commissionAmount);
      onClose();
    } catch (error) {
      const resolved = resolveError(error);

      if (resolved.details) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(resolved.details)) {
          if (messages[0]) mapped[field] = messages[0];
        }
        setFieldErrors(mapped);
        return;
      }

      setFormError(resolved.text);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('property.closeDeal')}
      description={t('property.closeDealHint')}
      // Blocks accidental dismissal mid-submit; the request is already in flight.
      disableDismiss={isLoading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {t('action.cancel')}
          </Button>
          <Button
            variant="primary"
            loading={isLoading}
            onClick={() => void handleSubmit()}
            disabled={!preview}
          >
            {t('property.confirmClose')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && (
          <p
            role="alert"
            className="rounded-sm border border-lost bg-lost-subtle p-3 text-body-sm text-lost-ink"
          >
            {formError}
          </p>
        )}

        <Input
          label={t('property.finalSalePrice')}
          value={salePrice}
          onChange={(event) => {
            setSalePrice(event.target.value);
          }}
          inputMode="numeric"
          numeric
          autoFocus
          hint={salePrice ? format.money(normalizeNumericInput(salePrice)) : undefined}
          {...(fieldErrors['finalSalePrice'] ? { error: fieldErrors['finalSalePrice'] } : {})}
        />

        <Input
          label={t('property.commissionRate')}
          value={rate}
          onChange={(event) => {
            setRate(event.target.value);
          }}
          inputMode="decimal"
          numeric
          {...(fieldErrors['commissionRate'] ? { error: fieldErrors['commissionRate'] } : {})}
        />

        {/* The reason this dialog exists rather than a bare confirm. */}
        <div className="rounded-md bg-accent-subtle p-4">
          <p className="text-caption uppercase tracking-wide text-ink-muted">
            {t('property.commissionPreview')}
          </p>
          <p className="mt-1 text-h1 text-accent">{format.money(preview)}</p>
          <p className="mt-1 text-caption text-ink-muted">{t('property.previewNote')}</p>
        </div>
      </div>
    </Modal>
  );
}
