import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import { CheckCircle, Plus } from '@/lib/icons';
import type { MatchReason, PropertyMatch } from './types';

/**
 * A suggested property, with the reasons it was suggested.
 *
 * Showing the reasons rather than a bare score is the whole point: "within budget ·
 * preferred area (Bashundhara)" is something the user can judge and disagree with, a
 * number out of 100 is something they have to trust. It also makes a wrong suggestion
 * diagnosable rather than mysterious.
 */

/** Structured codes → translated text. The server sends no prose (see MatchReason). */
function useReasonText() {
  const { t } = useTranslation();

  return (reason: MatchReason): string => {
    switch (reason.code) {
      case 'WITHIN_BUDGET':
        return t('buyer.reason.withinBudget');
      case 'NEAR_BUDGET':
        return t('buyer.reason.nearBudget');
      case 'PREFERRED_TYPE':
        return t('buyer.reason.preferredType', {
          type: t(`enums:propertyType.${reason.value}`),
        });
      case 'PREFERRED_AREA':
        return t('buyer.reason.preferredArea', { area: reason.value });
    }
  };
}

export const MatchCard = memo(function MatchCard({
  match,
  onLink,
  isLinking,
}: {
  match: PropertyMatch;
  onLink: (propertyId: string) => void;
  isLinking: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const reasonText = useReasonText();

  const location = [match.areaName, match.district].filter(Boolean).join(', ');

  return (
    <article className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/properties/${match.id}`}
          className="flex min-w-0 flex-1 items-center coarse:min-h-11 text-body font-medium text-ink hover:text-accent"
        >
          {match.title}
        </Link>
        <StatusPill status={match.status} size="sm" />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
        <span className="tabular font-medium text-ink">
          {format.moneyShort(match.askingPrice)}
        </span>
        {match.area && (
          <span className="text-ink-secondary">{format.area(match.area, match.areaUnit)}</span>
        )}
        {location && <span className="text-ink-muted">{location}</span>}
      </div>

      {/* Reasons, not a score. The score drives the ordering; the reasons explain it. */}
      <ul className="flex flex-wrap gap-1">
        {match.matchReasons.map((reason, index) => (
          <li
            key={`${reason.code}-${String(index)}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption',
              reason.code === 'NEAR_BUDGET'
                ? 'bg-pending-subtle text-pending-ink'
                : 'bg-accent-subtle text-accent',
            )}
          >
            <Icon icon={CheckCircle} size="sm" weight="fill" />
            {reasonText(reason)}
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        size="sm"
        icon={Plus}
        disabled={isLinking}
        onClick={() => {
          onLink(match.id);
        }}
      >
        {t('buyer.linkProperty')}
      </Button>
    </article>
  );
});
