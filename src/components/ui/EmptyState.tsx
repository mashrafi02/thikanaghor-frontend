import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Icon } from './Icon';
import { cn } from '@/lib/cn';
import {
  ArrowClockwise,
  CloudSlash,
  MagnifyingGlass,
  Warning,
  type PhosphorIcon,
} from '@/lib/icons';

/**
 * The four "nothing here" states.
 *
 * They are separate components rather than one with a `variant` prop because they mean
 * genuinely different things and are used at different moments (FRONTEND.md §10.5.1).
 * Collapsing them is how an app ends up telling someone whose search returned nothing
 * to "add your first property", or — far worse — rendering a failed request as
 * "no data yet", which reads as *your records are gone*.
 */

function Frame({
  icon,
  weight = 'regular',
  tone = 'muted',
  title,
  description,
  children,
  compact,
}: {
  icon: PhosphorIcon;
  weight?: 'regular' | 'fill';
  tone?: 'muted' | 'pending';
  title: string;
  description?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-3 py-8' : 'gap-4 py-16',
      )}
    >
      <Icon
        icon={icon}
        size="lg"
        weight={weight}
        className={cn(
          compact ? 'size-6' : 'size-12',
          tone === 'pending' ? 'text-pending' : 'text-ink-muted',
        )}
      />

      <div className="flex max-w-[42ch] flex-col gap-1">
        <p className={cn(compact ? 'text-body font-medium' : 'text-h3', 'text-ink')}>
          {title}
        </p>
        {description && <p className="text-body-sm text-ink-secondary">{description}</p>}
      </div>

      {children}
    </div>
  );
}

/**
 * No records at all, and no filters applied. An invitation — generous space, an
 * illustration-scale icon, one primary action.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: PhosphorIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <Frame icon={icon} title={title} {...(description !== undefined && { description })}>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Frame>
  );
}

/**
 * Filters are active and matched nothing.
 *
 * Tighter and less ceremonious than EmptyState: the user is mid-task, not starting out.
 * The way out — clearing the filters — is the point of the component.
 */
export function NoResultsState({ onClearFilters }: { onClearFilters?: () => void }) {
  const { t } = useTranslation();

  return (
    <Frame
      compact
      icon={MagnifyingGlass}
      title={t('state.noResults')}
      description={t('state.noResultsHint')}
    >
      {onClearFilters && (
        <Button variant="secondary" size="sm" onClick={onClearFilters}>
          {t('action.clearFilters')}
        </Button>
      )}
    </Frame>
  );
}

/**
 * A request failed.
 *
 * Bordered and inset so it reads as "this panel failed" rather than "the app broke",
 * and it must never be mistaken for an empty state — hence the amber icon and the
 * Retry action rather than a blank region.
 */
export function ErrorState({
  message,
  onRetry,
  requestId,
}: {
  message: string;
  onRetry?: () => void;
  requestId?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border border-border bg-surface">
      <Frame
        compact
        icon={Warning}
        tone="pending"
        title={t('state.error')}
        description={message}
      >
        {onRetry && (
          <Button variant="secondary" size="sm" icon={ArrowClockwise} onClick={onRetry}>
            {t('action.retry')}
          </Button>
        )}

        {requestId && (
          // Behind a disclosure on purpose: useful for debugging, meaningless to the
          // person using the app. Never in the main message.
          <details className="mt-1">
            <summary className="cursor-pointer text-caption text-ink-muted">
              {t('action.details')}
            </summary>
            <code className="mt-1 block text-caption text-ink-muted">{requestId}</code>
          </details>
        )}
      </Frame>
    </div>
  );
}

/** No network, and nothing cached to show. */
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();

  return (
    <Frame
      compact
      icon={CloudSlash}
      title={t('state.offline')}
      description={t('state.offlineHint')}
    >
      {onRetry && (
        <Button variant="secondary" size="sm" icon={ArrowClockwise} onClick={onRetry}>
          {t('action.retry')}
        </Button>
      )}
    </Frame>
  );
}
