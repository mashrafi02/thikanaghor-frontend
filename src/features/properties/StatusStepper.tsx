import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ACTIVE_STATUSES, type PropertyStatus } from '@/app/api/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import { CheckCircle, Warning } from '@/lib/icons';
import { PROPERTY_STATUS_META } from '@/lib/statusMeta';

/**
 * The deal pipeline, and the controls for moving through it.
 *
 * Every button here comes from `allowedNextStatuses` in the API response. The
 * transition rules are **not** duplicated on the client, so the UI can never offer a
 * move the server will reject — and the two can never drift apart, because there is
 * only one copy.
 *
 * `CLOSED_WON` is deliberately absent from those buttons: the server rejects it as a
 * status change because closing requires a sale price. Closing is a separate action
 * with its own dialog.
 */

const STALE_THRESHOLD_DAYS = 14;

export const StatusStepper = memo(function StatusStepper({
  status,
  allowedNextStatuses,
  daysInCurrentStatus,
  canClose,
  onChangeStatus,
  onCloseDeal,
  isChanging,
}: {
  status: PropertyStatus;
  allowedNextStatuses: PropertyStatus[];
  daysInCurrentStatus: number | null;
  canClose: boolean;
  onChangeStatus: (next: PropertyStatus) => void;
  onCloseDeal: () => void;
  isChanging: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormat();

  const currentIndex = ACTIVE_STATUSES.indexOf(status as (typeof ACTIVE_STATUSES)[number]);
  const isActiveStage = currentIndex >= 0;
  const isStale = daysInCurrentStatus !== null && daysInCurrentStatus >= STALE_THRESHOLD_DAYS;

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3 text-ink">{t('property.pipeline')}</h2>

        {daysInCurrentStatus !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption',
              // Turns amber past the stale threshold — the same rule the dashboard's
              // attention list uses, so the two agree about what "gone quiet" means.
              isStale ? 'bg-pending-subtle text-pending-ink' : 'text-ink-muted',
            )}
          >
            {isStale && <Icon icon={Warning} size="sm" />}
            {t('property.daysInStatus', { days: format.days(daysInCurrentStatus) })}
          </span>
        )}
      </div>

      {/* The five active stages. Horizontal on desktop, vertical on a phone — five
          labels in Bangla will not fit across 390px without truncating to nonsense. */}
      {isActiveStage ? (
        <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1">
          {ACTIVE_STATUSES.map((stage, index) => {
            const isDone = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <li key={stage} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-caption',
                    isDone && 'bg-accent text-accent-fg',
                    isCurrent && 'bg-accent-subtle text-accent ring-2 ring-accent',
                    !isDone && !isCurrent && 'border border-border text-ink-muted',
                  )}
                >
                  {isDone ? (
                    <Icon icon={CheckCircle} size="sm" weight="fill" />
                  ) : (
                    format.count(index + 1)
                  )}
                </span>

                <span
                  className={cn(
                    'min-w-0 truncate text-body-sm',
                    isCurrent ? 'font-medium text-ink' : 'text-ink-muted',
                  )}
                >
                  {t(PROPERTY_STATUS_META[stage].labelKey)}
                </span>

                {index < ACTIVE_STATUSES.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      'hidden h-px flex-1 sm:block',
                      isDone ? 'bg-accent' : 'bg-border',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        // Closed or on hold: the stepper is meaningless, so show the outcome instead.
        <div className="flex items-center gap-2">
          <StatusPill status={status} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {canClose && (
          // The primary action once a deal reaches AGREEMENT. Separate from the status
          // buttons because it needs a sale price before the server will accept it.
          <Button variant="primary" icon={CheckCircle} onClick={onCloseDeal}>
            {t('property.closeDeal')}
          </Button>
        )}

        {allowedNextStatuses.map((next) => (
          <Button
            key={next}
            variant="secondary"
            size="md"
            disabled={isChanging}
            onClick={() => {
              onChangeStatus(next);
            }}
          >
            {t(PROPERTY_STATUS_META[next].labelKey)}
          </Button>
        ))}

        {allowedNextStatuses.length === 0 && !canClose && (
          <p className="text-body-sm text-ink-muted">{t('property.statusTerminal')}</p>
        )}
      </div>
    </section>
  );
});
