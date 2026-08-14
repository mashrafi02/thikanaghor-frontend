import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BuyerStatus, InquiryStatus, PropertyStatus } from '@/app/api/types';
import { Icon } from './Icon';
import { cn } from '@/lib/cn';
import {
  BUYER_STATUS_META,
  INQUIRY_STATUS_META,
  PROPERTY_STATUS_META,
  STATUS_CLASSES,
  type StatusMeta,
} from '@/lib/statusMeta';

/**
 * Status pill.
 *
 * Colour, icon and label all come from one table, so they cannot disagree. The icon is
 * not decoration: status must never be carried by colour alone, both for accessibility
 * and because four of the eight statuses share a colour family (DESIGN.md §4.4).
 */

interface BaseProps {
  size?: 'sm' | 'md';
  className?: string;
}

function Pill({ meta, size = 'md', className }: { meta: StatusMeta } & BaseProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1 text-caption',
        STATUS_CLASSES[meta.tone][meta.variant],
        className,
      )}
    >
      <Icon icon={meta.icon} size="sm" weight={meta.filled ? 'fill' : 'regular'} />
      {t(meta.labelKey)}
    </span>
  );
}

export const StatusPill = memo(function StatusPill({
  status,
  ...rest
}: { status: PropertyStatus } & BaseProps) {
  return <Pill meta={PROPERTY_STATUS_META[status]} {...rest} />;
});

export const BuyerStatusPill = memo(function BuyerStatusPill({
  status,
  ...rest
}: { status: BuyerStatus } & BaseProps) {
  return <Pill meta={BUYER_STATUS_META[status]} {...rest} />;
});

export const InquiryStatusPill = memo(function InquiryStatusPill({
  status,
  ...rest
}: { status: InquiryStatus } & BaseProps) {
  return <Pill meta={INQUIRY_STATUS_META[status]} {...rest} />;
});
