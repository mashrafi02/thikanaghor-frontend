import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast/ToastContext';
import { useApiError } from '@/hooks/useApiError';
import { useFormat } from '@/hooks/useFormat';
import { normalizeNumericInput } from '@/lib/format';
import { Percent } from '@/lib/icons';
import { useGetSettingsQuery, useUpdateSettingsMutation } from './settingsApi';
import { SettingRow, SettingsSection } from './SettingsSection';

/**
 * The commission rate new records start with.
 *
 * This one *does* have a Save button, unlike the appearance controls. A partially typed
 * number is a valid intermediate state ("2." on the way to "2.5"), so saving on every
 * keystroke would send nonsense and show errors mid-typing.
 *
 * The hint is the important part of this section: changing the default does **not**
 * re-price anything. Each property freezes its own rate at creation, so a deal already
 * in the pipeline keeps the terms it was entered with. Without saying so, "default"
 * invites exactly the opposite assumption on a screen that is all about money.
 */
export function CommissionSection() {
  const { t } = useTranslation();
  const format = useFormat();
  const toast = useToast();
  const resolveError = useApiError();

  const { data: settings, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();

  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Seeds the field from the server value, and re-seeds whenever that value changes —
  // adjusted during render rather than in an effect. React documents this comparison
  // pattern for exactly this case; doing it in an effect costs an extra render pass on
  // every load and trips the cascading-render rule.
  const [lastServerRate, setLastServerRate] = useState<string | null>(null);
  if (settings && settings.defaultCommissionRate !== lastServerRate) {
    setLastServerRate(settings.defaultCommissionRate);
    setRate(settings.defaultCommissionRate);
  }

  const normalized = normalizeNumericInput(rate);
  const parsed = Number(normalized);
  const dirty = settings !== undefined && normalized !== settings.defaultCommissionRate;

  const handleSave = async () => {
    // Mirrors the server's bounds so the common mistake is caught without a round trip.
    if (!normalized || !Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setError(t('settings.rateInvalid'));
      return;
    }

    setError(null);
    try {
      await updateSettings({ defaultCommissionRate: normalized }).unwrap();
      toast.success(t('settings.saved'));
    } catch (caught) {
      const resolved = resolveError(caught);
      setError(resolved.details?.['defaultCommissionRate']?.[0] ?? resolved.text);
    }
  };

  return (
    <SettingsSection
      title={t('settings.deals')}
      description={t('settings.dealsHint')}
      icon={Percent}
    >
      <SettingRow
        label={t('settings.defaultRate')}
        hint={t('settings.defaultRateHint')}
        className="sm:items-start"
      >
        {isLoading ? (
          <Skeleton className="h-11 w-40" />
        ) : (
          <div className="flex items-start gap-2">
            {/* `aria-label` rather than a visible label: SettingRow already names this
                control, and repeating it would read the label twice. */}
            <Input
              aria-label={t('settings.defaultRate')}
              inputMode="decimal"
              numeric
              value={rate}
              onChange={(event) => {
                setRate(event.target.value);
                setError(null);
              }}
              className="w-24"
              {...(error ? { error } : {})}
            />
            <span aria-hidden="true" className="mt-3 text-body text-ink-secondary">
              %
            </span>
            <Button
              variant="primary"
              onClick={() => void handleSave()}
              loading={isSaving}
              disabled={!dirty}
            >
              {t('action.save')}
            </Button>
          </div>
        )}
      </SettingRow>

      {settings && (
        <p className="text-body-sm text-ink-muted">
          {t('settings.rateExample', {
            rate: format.percent(settings.defaultCommissionRate, 2),
            price: format.moneyShort('5000000'),
            commission: format.money(
              ((5_000_000 * Number(settings.defaultCommissionRate)) / 100).toFixed(2),
            ),
          })}
        </p>
      )}
    </SettingsSection>
  );
}
