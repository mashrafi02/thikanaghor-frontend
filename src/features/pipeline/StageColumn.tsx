import { memo, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { PropertyStatus } from '@/app/api/types';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import { PROPERTY_STATUS_META } from '@/lib/statusMeta';
import { DealCard } from './DealCard';
import type { PipelineCard, PipelineColumn } from './types';

/**
 * One stage of the pipeline.
 *
 * The header carries the count *and* the summed value, because a column with two deals
 * worth ৳2 crore matters more than one with six worth ৳30 lakh, and a bare count hides
 * that completely. Both figures come from the server — see `pipeline.service.ts` for why
 * the client must not add them up itself.
 *
 * The column is a drop target only for cards it can legally accept. An illegal drag
 * shows `cursor: no-drop` and the drop is ignored, so the state machine is enforced by
 * the interface rather than by an error message after the fact.
 */
export const StageColumn = memo(function StageColumn({
  column,
  cards,
  dragSource,
  dragSourceRef,
  movingIds,
  onDropCard,
  onMoveCard,
  onDragStateChange,
}: {
  column: PipelineColumn;
  cards: PipelineCard[];
  /** The in-flight drag's origin, or null when nothing is being dragged. Carries the
   *  source column's transition list, because whether *this* column may accept the card
   *  is a property of where the card came from, not of where it is going. */
  dragSource: { status: PropertyStatus; allowedNextStatuses: PropertyStatus[] } | null;
  /** The same value, readable synchronously. See the note in PipelineBoard for why the
   *  drop decision cannot wait for the state above to commit. */
  dragSourceRef: RefObject<{
    status: PropertyStatus;
    allowedNextStatuses: PropertyStatus[];
  } | null>;
  movingIds: string[];
  onDropCard: (id: string, from: PropertyStatus, to: PropertyStatus) => void;
  onMoveCard: (card: PipelineCard, to: PropertyStatus) => void;
  onDragStateChange: (from: PropertyStatus | null) => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const [isOver, setIsOver] = useState(false);

  const meta = PROPERTY_STATUS_META[column.status];

  /** Whether a source column's card may land here — the same list the server enforces. */
  const accepts = (
    source: { status: PropertyStatus; allowedNextStatuses: PropertyStatus[] } | null,
  ) =>
    source !== null &&
    source.status !== column.status &&
    source.allowedNextStatuses.includes(column.status);

  // Styling follows the rendered state; the drop handlers below read the ref instead.
  const canAccept = accepts(dragSource);

  return (
    <section
      aria-labelledby={`stage-${column.status}`}
      onDragOver={(event) => {
        if (!accepts(dragSourceRef.current)) return;
        // Without preventDefault the browser refuses the drop entirely — this is the
        // line that makes an element a drop target at all.
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={() => {
        setIsOver(false);
      }}
      onDrop={(event) => {
        setIsOver(false);
        const source = dragSourceRef.current;
        if (!accepts(source) || source === null) return;

        event.preventDefault();
        const id = event.dataTransfer.getData('text/plain');
        if (id) onDropCard(id, source.status, column.status);
      }}
      className={cn(
        'flex h-full flex-col rounded-md border transition-colors duration-fast ease-standard',
        isOver
          ? 'border-accent bg-accent-subtle'
          : canAccept
            ? 'border-dashed border-border-strong bg-surface-sunken'
            : 'border-border bg-surface-sunken',
      )}
    >
      <header className="flex flex-col gap-1 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2
            id={`stage-${column.status}`}
            className="flex min-w-0 items-center gap-2 text-body-sm font-medium text-ink"
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: `rgb(var(--${meta.tone}))` }}
            />
            <span className="truncate">{t(meta.labelKey)}</span>
          </h2>
          <span className="tabular shrink-0 rounded-full bg-surface px-2 py-1 text-caption text-ink-secondary">
            {format.count(column.count)}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 text-caption">
          <span className="tabular text-ink-secondary">
            {format.moneyShort(column.totalValue)}
          </span>
          {column.count > 0 && (
            <span className="tabular text-won-ink">
              +{format.moneyShort(column.projectedCommission)}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {cards.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border p-4 text-center text-caption text-ink-muted">
            {canAccept ? t('pipeline.dropHere') : t('pipeline.emptyStage')}
          </p>
        ) : (
          cards.map((card) => (
            <DealCard
              key={card.id}
              card={card}
              allowedNextStatuses={column.allowedNextStatuses}
              isMoving={movingIds.includes(card.id)}
              onMove={(to) => {
                onMoveCard(card, to);
              }}
              onDragStateChange={(dragging) => {
                onDragStateChange(dragging ? column.status : null);
              }}
            />
          ))
        )}

        {column.truncated && (
          <Link
            to={`/properties?status=${column.status}`}
            className="rounded-sm p-2 text-center text-caption text-accent hover:underline"
          >
            {t('pipeline.seeAll')}
          </Link>
        )}
      </div>
    </section>
  );
});
