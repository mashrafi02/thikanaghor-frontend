import { useTranslation } from 'react-i18next';
import type { PaginationMeta } from '@/app/api/types';
import { useFormat } from '@/hooks/useFormat';
import { Button } from './Button';
import { CaretLeft, CaretRight } from '@/lib/icons';

/**
 * Previous/next pagination with a position readout.
 *
 * No numbered page buttons: at 20 rows a page they add a row of controls that is
 * awkward to hit on a phone and rarely used — the answer to "where is that record" is
 * search, not page 7. The readout still says exactly where you are.
 */
export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();

  if (meta.totalPages <= 1) return null;

  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);

  return (
    <nav
      className="flex items-center justify-between gap-3 border-t border-border pt-4"
      aria-label={t('list.pagination')}
    >
      <p className="text-body-sm text-ink-secondary">
        {t('list.showingRange', {
          first: format.count(first),
          last: format.count(last),
          total: format.number(meta.total),
        })}
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          icon={CaretLeft}
          disabled={!meta.hasPrev}
          onClick={() => {
            onPageChange(meta.page - 1);
          }}
          aria-label={t('list.previousPage')}
        />
        <span className="text-body-sm tabular text-ink-secondary">
          {format.count(meta.page)} / {format.count(meta.totalPages)}
        </span>
        <Button
          size="sm"
          icon={CaretRight}
          disabled={!meta.hasNext}
          onClick={() => {
            onPageChange(meta.page + 1);
          }}
          aria-label={t('list.nextPage')}
        />
      </div>
    </nav>
  );
}
