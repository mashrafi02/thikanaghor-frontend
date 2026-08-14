import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyStatus } from '@/app/api/types';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/toast/ToastContext';
import { useApiError } from '@/hooks/useApiError';
import { useFormat } from '@/hooks/useFormat';
import { Kanban } from '@/lib/icons';
import { sumMoney } from './money';
import { useGetPipelineQuery, useMoveCardMutation } from './pipelineApi';
import { StageColumn } from './StageColumn';
import type { PipelineCard } from './types';

/**
 * The Kanban board.
 *
 * Five columns side by side, scrolling horizontally as one surface rather than wrapping.
 * A Kanban that wraps its columns onto a second row is no longer a pipeline — the left
 * to right reading *is* the information (DESIGN.md §7.3). So on a phone the board is a
 * scroll-snap rail: one column fills the screen, the next peeks at the edge, and the
 * gesture is the same horizontal swipe used everywhere else in the app.
 *
 * Every move is optimistic and reversible. The card lands in its new column immediately
 * and returns if the server refuses, with the reason surfaced as a toast — the one case
 * where a toast is right, because a rejected move is otherwise invisible.
 */
export function PipelineBoard() {
  const { t } = useTranslation();
  const toast = useToast();
  const resolveError = useApiError();

  const { data, isLoading, isError, error, refetch } = useGetPipelineQuery();
  const [moveCard] = useMoveCardMutation();

  type DragSource = { status: PropertyStatus; allowedNextStatuses: PropertyStatus[] };

  // The drag origin is held twice, deliberately.
  //
  // The ref is the *decision*: `dragover` must know synchronously whether this column can
  // accept, because the first `dragover` can land in the same tick as `dragstart` and a
  // state update has not committed by then. Missing it means `preventDefault` is never
  // called, the browser refuses the drop, and a perfectly legal move silently bounces —
  // rare on a fast machine, reliable on a slow one or a board big enough that a render
  // takes longer than a frame.
  //
  // The state is the *appearance*: highlighting the columns that can accept has to go
  // through a render, and being one frame late there costs nothing.
  const dragSourceRef = useRef<DragSource | null>(null);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [movingIds, setMovingIds] = useState<string[]>([]);

  useEffect(() => {
    document.title = `${t('nav.pipeline')} · ${t('appName')}`;
  }, [t]);

  const columns = data?.columns;

  const move = useCallback(
    async (id: string, from: PropertyStatus, to: PropertyStatus) => {
      setMovingIds((ids) => [...ids, id]);
      try {
        await moveCard({ id, from, to }).unwrap();
        // No success toast: the card visibly moves, and the column totals change with
        // it. Announcing what the user just watched happen is noise.
      } catch (caught) {
        toast.error(resolveError(caught).text);
      } finally {
        setMovingIds((ids) => ids.filter((value) => value !== id));
      }
    },
    [moveCard, toast, resolveError],
  );

  const handleDrop = useCallback(
    (id: string, from: PropertyStatus, to: PropertyStatus) => {
      dragSourceRef.current = null;
      setDragSource(null);
      void move(id, from, to);
    },
    [move],
  );

  const handleMenuMove = useCallback(
    (card: PipelineCard, to: PropertyStatus) => {
      void move(card.id, card.status, to);
    },
    [move],
  );

  const handleDragState = useCallback(
    (from: PropertyStatus | null) => {
      if (from === null) {
        dragSourceRef.current = null;
        setDragSource(null);
        return;
      }
      const column = columns?.find((entry) => entry.status === from);
      if (column) {
        const source = { status: from, allowedNextStatuses: column.allowedNextStatuses };
        dragSourceRef.current = source;
        setDragSource(source);
      }
    },
    [columns],
  );

  /** Board-wide totals for the header — summed from figures the server already
   *  computed, so this only ever adds five numbers rather than N money strings. */
  const totals = useMemo(() => {
    if (!columns) return null;
    return {
      deals: columns.reduce((sum, column) => sum + column.count, 0),
      value: sumMoney(columns.map((column) => column.totalValue)),
      commission: sumMoney(columns.map((column) => column.projectedCommission)),
    };
  }, [columns]);

  if (isError) {
    return <ErrorState message={resolveError(error).text} onRetry={() => void refetch()} />;
  }

  if (isLoading || !data || !totals) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-md" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-64 w-[280px] shrink-0 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (totals.deals === 0) {
    return (
      <div className="flex flex-col gap-4">
        <BoardHeader totals={totals} />
        <EmptyState
          icon={Kanban}
          title={t('pipeline.emptyTitle')}
          description={t('pipeline.emptyBody')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BoardHeader totals={totals} />

      {/* Below `xl` the board is a scroll-snap rail: one column fills a phone screen and
          the next peeks. From `xl` all five fit, and seeing the whole pipeline at once is
          most of what a Kanban is for — so it becomes a grid and stops scrolling.
          `items-stretch` keeps the columns equal height so their drop zones line up. */}
      <div
        className="rail -mx-4 items-stretch px-4 pb-2 md:-mx-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0"
        role="group"
        aria-label={t('nav.pipeline')}
        tabIndex={0}
      >
        {data.columns.map((column) => (
          <div
            key={column.status}
            className="w-[86vw] max-w-[320px] shrink-0 snap-start sm:w-[300px] xl:w-auto xl:max-w-none"
          >
            <StageColumn
              column={column}
              cards={data.items[column.status] ?? []}
              dragSource={dragSource}
              dragSourceRef={dragSourceRef}
              movingIds={movingIds}
              onDropCard={handleDrop}
              onMoveCard={handleMenuMove}
              onDragStateChange={handleDragState}
            />
          </div>
        ))}
      </div>

      <p className="text-caption text-ink-muted">{t('pipeline.moveHint')}</p>

      {/* Announces every move to a screen reader, which sees no drag and no animation. */}
      <p aria-live="polite" className="sr-only">
        {movingIds.length > 0 ? t('pipeline.moving') : ''}
      </p>
    </div>
  );
}

interface BoardTotals {
  deals: number;
  value: string;
  commission: string;
}

/** The board's headline: how many live deals, what they are worth, and what they pay. */
function BoardHeader({ totals }: { totals: BoardTotals }) {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <header className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-ink">{t('nav.pipeline')}</h1>
        <p className="text-body-sm text-ink-secondary">
          {t('pipeline.summary', {
            count: totals.deals,
            deals: format.count(totals.deals),
            value: format.moneyShort(totals.value),
          })}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-caption text-ink-muted">
          {t('dashboard.projectedCommission')}
        </span>
        <span className="tabular text-h2 text-won-ink">
          {format.moneyShort(totals.commission)}
        </span>
      </div>
    </header>
  );
}
