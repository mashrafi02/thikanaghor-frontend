import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { useFormat } from '@/hooks/useFormat';
import { CaretRight, CheckCircle, Clock } from '@/lib/icons';
import type { AttentionItem } from './types';

/**
 * Active deals that have gone quiet.
 *
 * The most useful thing on this page. A referral business does not usually lose money to
 * deals that go wrong — it loses money to deals nobody followed up on, which fail
 * silently and never appear in any total. This list is the only place they surface.
 *
 * An empty list here is genuinely good news, so it says so rather than showing the
 * neutral "nothing found" used for an over-filtered search.
 */
export const AttentionList = memo(function AttentionList({
  items,
  isLoading,
}: {
  items: AttentionItem[] | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <section
      aria-labelledby="attention-title"
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 shadow-sm md:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 id="attention-title" className="text-h3 text-ink">
            {t('dashboard.needsAttention')}
          </h2>
          <p className="text-body-sm text-ink-secondary">
            {t('dashboard.needsAttentionHint')}
          </p>
        </div>
        {items && items.length > 0 && (
          <span className="tabular text-body-sm text-ink-muted">
            {format.count(items.length)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-sm" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-won bg-won-subtle p-6 text-center text-body-sm text-won-ink">
          <Icon icon={CheckCircle} size="sm" weight="fill" />
          {t('dashboard.nothingStale')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/properties/${item.id}`}
                className="group flex items-center gap-3 rounded-sm p-2 transition-colors duration-fast ease-standard hover:bg-surface-sunken"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-body font-medium text-ink group-hover:text-accent">
                    {item.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">
                    <StatusPill status={item.status} size="sm" />
                    <span className="tabular text-ink-secondary">
                      {format.moneyShort(item.askingPrice)}
                    </span>
                  </span>
                </div>

                {/* The number that justifies the row's presence gets its own emphasis. */}
                <span className="flex shrink-0 items-center gap-1 text-body-sm text-pending-ink">
                  <Icon icon={Clock} size="sm" />
                  <span className="tabular">
                    {item.daysSinceLastChange === null
                      ? format.empty
                      : format.days(item.daysSinceLastChange)}
                  </span>
                </span>

                <Icon
                  icon={CaretRight}
                  size="sm"
                  className="shrink-0 text-ink-muted rtl:rotate-180"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
