import { memo, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { PropertyStatus } from '@/app/api/types';
import { Icon } from '@/components/ui/Icon';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import { CaretRight, Clock, DotsThree, Warning } from '@/lib/icons';
import { PROPERTY_STATUS_META } from '@/lib/statusMeta';
import type { PipelineCard } from './types';

/**
 * One deal on the board.
 *
 * Three ways to move it, because drag alone is not enough:
 *
 *  • **Drag** on a pointer device — the fastest way when it works.
 *  • **A menu** on every card, at every size. Kanban drag on touch is genuinely fiddly
 *    (FRONTEND.md §14), so the menu is not a fallback that appears when drag fails; it
 *    is always there, and on a phone it is the primary path.
 *  • **The keyboard** — ← / → move the focused card between stages. The board is
 *    otherwise unusable without a mouse, and "unusable without a mouse" is not a
 *    trade-off, it is a defect (DESIGN.md §12).
 *
 * The card body is a link to the record. Moving is deliberately *not* on the body: a
 * mis-drag that silently reassigns a deal is worse than one that opens a page.
 */
export const DealCard = memo(function DealCard({
  card,
  allowedNextStatuses,
  onMove,
  onDragStateChange,
  isMoving,
}: {
  card: PipelineCard;
  allowedNextStatuses: PropertyStatus[];
  onMove: (to: PropertyStatus) => void;
  onDragStateChange: (dragging: boolean) => void;
  isMoving: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  const location = [card.areaName, card.district].filter(Boolean).join(', ');

  return (
    <article
      // `draggable` on the article, but the drag image and the grab affordance come from
      // the handle — dragging from the title would fight text selection.
      draggable={!isMoving}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', card.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStateChange(true);
      }}
      onDragEnd={() => {
        onDragStateChange(false);
      }}
      onKeyDown={(event) => {
        // Arrow keys only when the card itself has focus, so they still move the caret
        // inside the menu or a link.
        if (event.target !== event.currentTarget) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const target = adjacentStage(card.status, direction, allowedNextStatuses);
        if (!target) return;

        event.preventDefault();
        onMove(target);
      }}
      tabIndex={0}
      aria-label={`${card.title} — ${t(PROPERTY_STATUS_META[card.status].labelKey)}`}
      className={cn(
        'group relative flex flex-col gap-2 rounded-md border bg-surface p-3',
        'transition-[box-shadow,opacity,border-color] duration-fast ease-standard',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        // A stale card is bordered, not tinted: a fill would compete with the status
        // colours the board already uses.
        card.isStale ? 'border-pending' : 'border-border',
        isMoving ? 'opacity-60' : 'hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/properties/${card.id}`}
          className="flex min-w-0 flex-1 items-center coarse:min-h-11 text-body-sm font-medium text-ink hover:text-accent"
        >
          {card.title}
        </Link>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={t('pipeline.moveTo')}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuOpen ? menuId : undefined}
            disabled={isMoving || allowedNextStatuses.length === 0}
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
            onBlur={(event) => {
              // Closes when focus leaves the whole menu, not on any blur — otherwise
              // tabbing from the button to the first item would close it immediately.
              if (!menuRef.current?.contains(event.relatedTarget)) setMenuOpen(false);
            }}
            className="flex size-11 items-center justify-center rounded-sm text-ink-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-ink disabled:opacity-40 md:size-8"
          >
            <Icon icon={DotsThree} size="sm" weight="bold" />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={t('pipeline.moveTo')}
              onBlur={(event) => {
                if (!menuRef.current?.contains(event.relatedTarget)) setMenuOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setMenuOpen(false);
              }}
              className="absolute end-0 top-full z-20 mt-1 flex min-w-[176px] flex-col rounded-sm border border-border bg-surface-raised p-1 shadow-lg"
            >
              <p className="px-2 py-1 text-caption text-ink-muted">{t('pipeline.moveTo')}</p>
              {allowedNextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onMove(status);
                  }}
                  className="flex items-center gap-2 rounded-sm px-2 py-2 text-start text-body-sm text-ink transition-colors duration-fast hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: `rgb(var(--${PROPERTY_STATUS_META[status].tone}))`,
                    }}
                  />
                  {t(PROPERTY_STATUS_META[status].labelKey)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
        <span className="tabular font-medium text-ink">
          {format.moneyShort(card.askingPrice)}
        </span>
        {card.projectedCommission && (
          <span className="tabular text-won-ink">
            +{format.moneyShort(card.projectedCommission)}
          </span>
        )}
      </div>

      {location && <p className="truncate text-caption text-ink-muted">{location}</p>}

      <div className="flex items-center justify-between gap-2 text-caption">
        <span
          className={cn(
            'inline-flex items-center gap-1',
            card.isStale ? 'text-pending-ink' : 'text-ink-muted',
          )}
        >
          <Icon icon={card.isStale ? Warning : Clock} size="sm" />
          <span className="tabular">{format.days(card.daysInCurrentStatus)}</span>
        </span>

        <Link
          to={`/properties/${card.id}`}
          aria-label={t('action.details')}
          className="flex items-center coarse:min-h-11 coarse:min-w-11 coarse:justify-end text-ink-muted transition-colors duration-fast hover:text-accent"
        >
          <Icon icon={CaretRight} size="sm" className="rtl:rotate-180" />
        </Link>
      </div>
    </article>
  );
});

/**
 * The stage one step left or right, if moving there is legal.
 *
 * Arrow keys advance along the *pipeline*, so they only ever offer the neighbouring
 * stage — never ON_HOLD or CLOSED_LOST, which are side exits rather than directions.
 * Those stay in the menu, where choosing one is deliberate.
 */
function adjacentStage(
  from: PropertyStatus,
  direction: 1 | -1,
  allowed: PropertyStatus[],
): PropertyStatus | null {
  const order: PropertyStatus[] = [
    'NEW',
    'CONTACTED',
    'VISIT_SCHEDULED',
    'NEGOTIATING',
    'AGREEMENT',
  ];

  const index = order.indexOf(from);
  if (index === -1) return null;

  const target = order[index + direction];
  return target && allowed.includes(target) ? target : null;
}
