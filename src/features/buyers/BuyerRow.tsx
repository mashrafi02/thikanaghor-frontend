import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { BuyerStatusPill } from '@/components/ui/StatusPill';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import { Users } from '@/lib/icons';
import type { Buyer } from './types';

/**
 * A buyer row. Same density reasoning as the property row — the budget is what he
 * scans for, so it leads line two.
 */
export const BuyerRow = memo(function BuyerRow({ buyer }: { buyer: Buyer }) {
  const { t } = useTranslation();
  const format = useFormat();

  const budget =
    buyer.budgetMin && buyer.budgetMax
      ? `${format.moneyShort(buyer.budgetMin)} – ${format.moneyShort(buyer.budgetMax)}`
      : buyer.budgetMax
        ? `≤ ${format.moneyShort(buyer.budgetMax)}`
        : buyer.budgetMin
          ? `≥ ${format.moneyShort(buyer.budgetMin)}`
          : null;

  return (
    <Link
      to={`/buyers/${buyer.id}`}
      className={cn(
        'flex items-center gap-3 rounded-md border border-border bg-surface p-3',
        'transition-colors duration-fast ease-standard hover:border-border-strong',
        'md:gap-4 md:p-4',
      )}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
        <Icon icon={Users} size="md" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-body font-medium text-ink">
            {buyer.name}
          </p>
          <BuyerStatusPill status={buyer.status} size="sm" className="hidden sm:inline-flex" />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
          {budget && <span className="tabular font-medium text-ink">{budget}</span>}
          <span className="tabular text-ink-muted">{buyer.phoneDisplay}</span>
          {buyer.inquiryCount > 0 && (
            <span className="text-ink-muted">
              {t('buyer.linkedCount', {
                count: buyer.inquiryCount,
                formatted: format.count(buyer.inquiryCount),
              })}
            </span>
          )}
          <BuyerStatusPill status={buyer.status} size="sm" className="sm:hidden" />
        </div>
      </div>
    </Link>
  );
});
