import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { PropertyStatus } from '@/app/api/types';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { useToast } from '@/components/ui/toast/ToastContext';
import { useApiError } from '@/hooks/useApiError';
import { useFormat } from '@/hooks/useFormat';
import { cn } from '@/lib/cn';
import {
  ArrowSquareOut,
  Buildings,
  CaretLeft,
  CheckCircle,
  Clock,
  PencilSimple,
  Phone,
  Trash,
  WhatsappLogo,
} from '@/lib/icons';
import { CloseDealDialog } from './CloseDealDialog';
import {
  useChangeStatusMutation,
  useDeletePropertyMutation,
  useGetPropertyQuery,
  useRestorePropertyMutation,
  useSetCommissionReceivedMutation,
} from './propertyApi';
import { StatusStepper } from './StatusStepper';
import { VideoGallery } from './VideoEmbed';
import type { PropertyDetail as PropertyDetailType } from './types';

/**
 * A single property.
 *
 * Layout follows DESIGN.md §7.4: video first, then the facts, then the pipeline. On a
 * phone the contact actions are pinned to the bottom — calling and messaging are what
 * he actually does standing in front of a plot, and they should not require scrolling.
 */
export function PropertyDetail() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const toast = useToast();
  const resolveError = useApiError();

  const { data: property, isLoading, isError, error, refetch } = useGetPropertyQuery(id);
  const [changeStatus, { isLoading: isChangingStatus }] = useChangeStatusMutation();
  const [setCommissionReceived] = useSetCommissionReceivedMutation();
  const [deleteProperty] = useDeletePropertyMutation();
  const [restoreProperty] = useRestorePropertyMutation();

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  useEffect(() => {
    if (property) document.title = `${property.title} · ${t('appName')}`;
  }, [property, t]);

  const handleStatusChange = useCallback(
    async (next: PropertyStatus) => {
      try {
        await changeStatus({ id, status: next }).unwrap();
        // No success toast: the pill and stepper already moved, optimistically. A toast
        // on top of a visible change is noise (FRONTEND.md §10.5.2).
      } catch (caught) {
        toast.error(resolveError(caught).text);
      }
    },
    [changeStatus, id, toast, resolveError],
  );

  const handleCommissionToggle = useCallback(
    async (received: boolean) => {
      try {
        await setCommissionReceived({ id, received }).unwrap();
      } catch (caught) {
        toast.error(resolveError(caught).text);
      }
    },
    [setCommissionReceived, id, toast, resolveError],
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteProperty(id).unwrap();
      // Undo instead of a confirm dialog: the backend soft-deletes, so this is
      // recoverable and costs one fewer click in the common case.
      toast.undo(
        t('property.deleted'),
        () => {
          void restoreProperty(id);
        },
        t('action.undo'),
      );
      void navigate('/properties');
    } catch (caught) {
      toast.error(resolveError(caught).text);
    }
  }, [deleteProperty, restoreProperty, id, navigate, toast, resolveError, t]);

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
    const resolved = resolveError(error);
    if (resolved.statusCode === 404) {
      return (
        <EmptyState
          icon={Buildings}
          title={t('property.notFound')}
          action={{
            label: t('property.backToList'),
            onClick: () => void navigate('/properties'),
          }}
        />
      );
    }
    return <ErrorState message={resolved.text} onRetry={() => void refetch()} />;
  }

  if (!property) return null;

  const canClose = property.status === 'AGREEMENT';

  return (
    <div className="flex flex-col gap-4 pb-16 md:pb-0">
      <div className="flex items-center gap-2">
        <Link
          to="/properties"
          className="flex items-center gap-1 coarse:min-h-11 text-body-sm text-ink-secondary transition-colors duration-fast hover:text-ink"
        >
          <Icon icon={CaretLeft} size="sm" />
          {t('property.title')}
        </Link>
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-h1 text-ink">{property.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={PencilSimple}
              onClick={() => void navigate(`/properties/${id}/edit`)}
            >
              <span className="hidden sm:inline">{t('action.edit')}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={Trash}
              onClick={() => void handleDelete()}
              className="text-lost-ink"
            >
              <span className="hidden sm:inline">{t('action.delete')}</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={property.status} />
          <span className="text-body-sm text-ink-muted">
            {t(`enums:propertyType.${property.type}`)}
          </span>
          <span className="text-body-sm text-ink-muted">
            {t('property.createdAt')} {format.date(property.createdAt)}
          </span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-4">
          {property.videos.length > 0 ? (
            <VideoGallery videos={property.videos} />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-border text-body-sm text-ink-muted">
              {t('property.noVideos')}
            </div>
          )}

          <StatusStepper
            status={property.status}
            allowedNextStatuses={property.allowedNextStatuses}
            daysInCurrentStatus={property.daysInCurrentStatus}
            canClose={canClose}
            isChanging={isChangingStatus}
            onChangeStatus={(next) => void handleStatusChange(next)}
            onCloseDeal={() => {
              setCloseDialogOpen(true);
            }}
          />

          <Timeline property={property} />
        </div>

        {/* Sticky on desktop: the money and the phone number stay in view while the
            timeline is scrolled. */}
        <aside
          aria-label={t('property.sidePanel')}
          className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start"
        >
          <MoneyPanel property={property} onToggleReceived={handleCommissionToggle} />
          <FactsPanel property={property} />
          <ContactPanel property={property} />
        </aside>
      </div>

      {/* Mobile action bar. Call and WhatsApp are the two things done standing in front
          of a plot, so they are always reachable rather than scrolled to. */}
      <div className="fixed inset-x-0 bottom-14 z-20 flex gap-2 border-t border-border bg-surface p-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        <a href={property.contactPhoneTel} className="flex-1">
          <Button variant="primary" icon={Phone} fullWidth>
            {t('property.call')}
          </Button>
        </a>
        <a
          href={property.contactPhoneWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button variant="secondary" icon={WhatsappLogo} fullWidth>
            {t('property.whatsapp')}
          </Button>
        </a>
      </div>

      <CloseDealDialog
        property={property}
        open={closeDialogOpen}
        onClose={() => {
          setCloseDialogOpen(false);
        }}
        onClosed={(commissionAmount) => {
          // One of the few actions that *earns* a toast: the commission figure is the
          // payoff of the whole app and is not otherwise visible at the moment it lands.
          toast.success(t('property.closedToast', { amount: format.money(commissionAmount) }));
        }}
      />
    </div>
  );
}

function MoneyPanel({
  property,
  onToggleReceived,
}: {
  property: PropertyDetailType;
  onToggleReceived: (received: boolean) => Promise<void>;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const isClosed = property.status === 'CLOSED_WON';

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body-sm text-ink-secondary">
          {isClosed ? t('property.finalSalePrice') : t('property.askingPrice')}
        </span>
        <span className="tabular text-h2 text-ink">
          {format.money(isClosed ? property.finalSalePrice : property.askingPrice)}
        </span>
      </div>

      {property.negotiatedPrice && !isClosed && (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-body-sm text-ink-secondary">
            {t('property.negotiatedPrice')}
          </span>
          <span className="tabular text-body text-ink">
            {format.money(property.negotiatedPrice)}
          </span>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <span className="text-body-sm text-ink-secondary">
          {t('property.commission')} ({property.commissionRate}%)
        </span>
        <span className={cn('tabular text-h3', isClosed ? 'text-won-ink' : 'text-ink-muted')}>
          {isClosed
            ? format.money(property.commissionAmount)
            : `~${format.money(property.projectedCommission)}`}
        </span>
      </div>

      {isClosed && (
        <button
          type="button"
          onClick={() => void onToggleReceived(!property.commissionReceived)}
          className={cn(
            'flex items-center justify-between gap-2 rounded-sm border p-3 text-body-sm',
            'transition-colors duration-fast ease-standard',
            property.commissionReceived
              ? 'border-won bg-won-subtle text-won-ink'
              : 'border-pending bg-pending-subtle text-pending-ink',
          )}
        >
          <span className="flex items-center gap-2">
            <Icon
              icon={property.commissionReceived ? CheckCircle : Clock}
              size="sm"
              weight={property.commissionReceived ? 'fill' : 'regular'}
            />
            {property.commissionReceived
              ? t('property.commissionReceived')
              : t('property.commissionPending')}
          </span>
        </button>
      )}
    </section>
  );
}

function FactsPanel({ property }: { property: PropertyDetailType }) {
  const { t } = useTranslation();
  const format = useFormat();

  const location = [property.areaName, property.upazila, property.district]
    .filter(Boolean)
    .join(', ');

  const facts: [string, string | null][] = [
    [
      t('property.area'),
      property.area
        ? format.areaWithSqft(property.area, property.areaUnit, property.areaSqft)
        : null,
    ],
    [t('property.location'), location || null],
    [t('property.source'), t(`enums:sourcePlatform.${property.sourcePlatform}`)],
  ];

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <h2 className="text-h3 text-ink">{t('property.details')}</h2>
      <dl className="flex flex-col gap-2">
        {facts
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-body-sm text-ink-secondary">{label}</dt>
              <dd className="text-end text-body-sm text-ink">{value}</dd>
            </div>
          ))}
      </dl>

      {property.notes && (
        <p className="whitespace-pre-wrap border-t border-border pt-3 text-body-sm text-ink-secondary">
          {property.notes}
        </p>
      )}

      {property.sourceUrl && (
        <a
          href={property.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-body-sm text-accent hover:text-accent-hover"
        >
          {t('property.source')}
          <Icon icon={ArrowSquareOut} size="sm" />
        </a>
      )}
    </section>
  );
}

function ContactPanel({ property }: { property: PropertyDetailType }) {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <h2 className="text-h3 text-ink">{t('property.contact')}</h2>
      <p className="text-body text-ink">{property.contactName}</p>
      <p className="tabular text-body-sm text-ink-secondary">{property.contactPhoneDisplay}</p>

      {/* Hidden on mobile: the pinned bottom bar already carries these. */}
      <div className="hidden gap-2 md:flex">
        <a href={property.contactPhoneTel} className="flex-1">
          <Button variant="secondary" icon={Phone} fullWidth size="sm">
            {t('property.call')}
          </Button>
        </a>
        <a
          href={property.contactPhoneWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button variant="secondary" icon={WhatsappLogo} fullWidth size="sm">
            {t('property.whatsapp')}
          </Button>
        </a>
      </div>
    </section>
  );
}

function Timeline({ property }: { property: PropertyDetailType }) {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <h2 className="text-h3 text-ink">{t('property.timeline')}</h2>

      <ol className="flex flex-col gap-3">
        {property.statusEvents.map((event, index) => (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  index === 0 ? 'bg-accent' : 'bg-border-strong',
                )}
              />
              {index < property.statusEvents.length - 1 && (
                <span className="w-px flex-1 bg-border" aria-hidden />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col pb-1">
              {/* The label is derived from the transition, never from a stored string.
                  `note` now holds only what the user typed, so nothing here can be
                  untranslatable server prose. */}
              <span className="text-body-sm text-ink">
                {event.fromStatus
                  ? t(`enums:propertyStatus.${event.toStatus}`)
                  : t('property.recordCreated')}
              </span>
              <span className="text-caption text-ink-muted">
                {format.relative(event.createdAt)} · {format.date(event.createdAt)}
              </span>
              {event.note && (
                <span className="mt-1 text-body-sm text-ink-secondary">{event.note}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-8 w-2/3" />
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
