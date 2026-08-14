import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { BuyerStatusPill, InquiryStatusPill, StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/toast/ToastContext';
import { useApiError } from '@/hooks/useApiError';
import { useFormat } from '@/hooks/useFormat';
import { CaretLeft, PencilSimple, Phone, Trash, Users, WhatsappLogo } from '@/lib/icons';
import { BuyerFormSheet } from './BuyerFormSheet';
import {
  useCreateInquiryMutation,
  useDeleteBuyerMutation,
  useDeleteInquiryMutation,
  useGetBuyerQuery,
  useGetMatchesQuery,
  useRestoreBuyerMutation,
} from './buyerApi';
import { MatchCard } from './MatchCard';

/**
 * A buyer, their linked properties, and what they should be shown next.
 *
 * The matches section is the reason this page exists — it is the thing that turns a
 * list of contacts into a referral pipeline.
 */
export function BuyerDetail() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const toast = useToast();
  const resolveError = useApiError();

  const { data: buyer, isLoading, isError, error, refetch } = useGetBuyerQuery(id);
  const { data: matchData, isFetching: matchesLoading } = useGetMatchesQuery(id, {
    skip: !buyer,
  });
  const [createInquiry, { isLoading: isLinking }] = useCreateInquiryMutation();
  const [deleteInquiry] = useDeleteInquiryMutation();
  const [deleteBuyer] = useDeleteBuyerMutation();
  const [restoreBuyer] = useRestoreBuyerMutation();

  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (buyer) document.title = `${buyer.name} · ${t('appName')}`;
  }, [buyer, t]);

  const handleLink = useCallback(
    async (propertyId: string) => {
      try {
        await createInquiry({ propertyId, buyerId: id }).unwrap();
        // The match disappears from the list and appears under linked properties —
        // both visible, so no toast. A 409 (already linked) does surface, since that
        // outcome is not visible.
      } catch (caught) {
        toast.error(resolveError(caught).text);
      }
    },
    [createInquiry, id, toast, resolveError],
  );

  const handleUnlink = useCallback(
    async (inquiryId: string, propertyId: string) => {
      try {
        await deleteInquiry({ id: inquiryId, propertyId, buyerId: id }).unwrap();
      } catch (caught) {
        toast.error(resolveError(caught).text);
      }
    },
    [deleteInquiry, id, toast, resolveError],
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteBuyer(id).unwrap();
      toast.undo(
        t('buyer.deleted'),
        () => {
          void restoreBuyer(id);
        },
        t('action.undo'),
      );
      void navigate('/buyers');
    } catch (caught) {
      toast.error(resolveError(caught).text);
    }
  }, [deleteBuyer, restoreBuyer, id, navigate, toast, resolveError, t]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    const resolved = resolveError(error);
    if (resolved.statusCode === 404) {
      return (
        <EmptyState
          icon={Users}
          title={t('buyer.notFound')}
          action={{ label: t('buyer.backToList'), onClick: () => void navigate('/buyers') }}
        />
      );
    }
    return <ErrorState message={resolved.text} onRetry={() => void refetch()} />;
  }

  if (!buyer) return null;

  const budget =
    buyer.budgetMin && buyer.budgetMax
      ? `${format.money(buyer.budgetMin)} – ${format.money(buyer.budgetMax)}`
      : buyer.budgetMax
        ? `≤ ${format.money(buyer.budgetMax)}`
        : buyer.budgetMin
          ? `≥ ${format.money(buyer.budgetMin)}`
          : format.empty;

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/buyers"
        className="flex w-fit items-center gap-1 coarse:min-h-11 text-body-sm text-ink-secondary transition-colors duration-fast hover:text-ink"
      >
        <Icon icon={CaretLeft} size="sm" />
        {t('buyer.title')}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-h1 text-ink">{buyer.name}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <BuyerStatusPill status={buyer.status} />
            <span className="tabular text-body-sm text-ink-secondary">
              {buyer.phoneDisplay}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <a href={buyer.phoneTel}>
            <Button variant="secondary" size="sm" icon={Phone}>
              <span className="hidden sm:inline">{t('property.call')}</span>
            </Button>
          </a>
          <a href={buyer.phoneWhatsApp} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm" icon={WhatsappLogo}>
              <span className="hidden sm:inline">{t('property.whatsapp')}</span>
            </Button>
          </a>
          <Button
            variant="secondary"
            size="sm"
            icon={PencilSimple}
            onClick={() => {
              setEditOpen(true);
            }}
          >
            <span className="hidden sm:inline">{t('action.edit')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash}
            className="text-lost-ink"
            onClick={() => void handleDelete()}
          >
            <span className="hidden sm:inline">{t('action.delete')}</span>
          </Button>
        </div>
      </header>

      <section className="grid gap-3 rounded-md border border-border bg-surface p-4 sm:grid-cols-3">
        <Fact label={t('buyer.budget')} value={budget} />
        <Fact
          label={t('buyer.preferredTypes')}
          value={
            buyer.preferredTypes.length
              ? buyer.preferredTypes.map((type) => t(`enums:propertyType.${type}`)).join(', ')
              : format.empty
          }
        />
        <Fact
          label={t('buyer.preferredAreas')}
          value={buyer.preferredAreas.length ? buyer.preferredAreas.join(', ') : format.empty}
        />
      </section>

      {buyer.notes && (
        <p className="whitespace-pre-wrap rounded-md border border-border bg-surface p-4 text-body-sm text-ink-secondary">
          {buyer.notes}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-h2 text-ink">{t('buyer.linkedProperties')}</h2>

        {buyer.inquiries.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-body-sm text-ink-muted">
            {t('buyer.noLinked')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {buyer.inquiries.map((inquiry) => (
              <li
                key={inquiry.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    to={`/properties/${inquiry.property.id}`}
                    className="flex items-center truncate coarse:min-h-11 text-body font-medium text-ink hover:text-accent"
                  >
                    {inquiry.property.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-body-sm">
                    <span className="tabular text-ink-secondary">
                      {format.moneyShort(inquiry.property.askingPrice)}
                    </span>
                    <StatusPill status={inquiry.property.status} size="sm" />
                    <InquiryStatusPill status={inquiry.status} size="sm" />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash}
                  aria-label={t('buyer.unlink')}
                  className="text-lost-ink"
                  onClick={() => void handleUnlink(inquiry.id, inquiry.property.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-h2 text-ink">{t('buyer.matches')}</h2>
          {matchData && (
            <span className="tabular text-body-sm text-ink-muted">
              {format.count(matchData.total)}
            </span>
          )}
        </div>

        {matchesLoading ? (
          <div className="grid gap-3 md:grid-cols-2" aria-busy="true">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : matchData && matchData.matches.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {matchData.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onLink={(propertyId) => void handleLink(propertyId)}
                isLinking={isLinking}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-6 text-center">
            <p className="text-body text-ink">{t('buyer.noMatches')}</p>
            <p className="mt-1 text-body-sm text-ink-muted">{t('buyer.noMatchesHint')}</p>
          </div>
        )}
      </section>

      <BuyerFormSheet
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
        }}
        buyer={buyer}
      />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-body text-ink">{value}</span>
    </div>
  );
}
