import type { BuyerStatus, InquiryStatus, PropertyStatus } from '@/app/api/types';
import {
  CheckCircle,
  Clock,
  Info,
  PauseCircle,
  XCircle,
  type PhosphorIcon,
} from '@/lib/icons';

/**
 * How every status renders.
 *
 * One table, so a status can never appear with a colour that disagrees with its label —
 * the failure you get when each component decides for itself and one of them is missed
 * during a rename.
 *
 * The `Record<PropertyStatus, …>` type is the enforcement: adding a status to the API
 * without adding a row here is a **compile error**, not a blank pill discovered in
 * production.
 */

/** Which semantic colour family, from DESIGN.md §4.3. */
export type StatusTone = 'won' | 'active' | 'pending' | 'lost' | 'hold';

/** DESIGN.md §4.4 — eight statuses collapse into four colour families, with the
 *  specific stage carried by the label and the treatment carrying the weight. */
export type StatusVariant = 'solid' | 'subtle' | 'outline';

export interface StatusMeta {
  tone: StatusTone;
  variant: StatusVariant;
  icon: PhosphorIcon;
  /** `fill` is reserved for terminal/decided states — see DESIGN.md §9.2. */
  filled: boolean;
  /** Key inside the `enums` namespace. */
  labelKey: string;
}

export const PROPERTY_STATUS_META: Record<PropertyStatus, StatusMeta> = {
  // Untouched: deliberately the quietest thing in a list. A new record is not news.
  NEW: {
    tone: 'hold',
    variant: 'outline',
    icon: Info,
    filled: false,
    labelKey: 'enums:propertyStatus.NEW',
  },
  CONTACTED: {
    tone: 'active',
    variant: 'subtle',
    icon: Clock,
    filled: false,
    labelKey: 'enums:propertyStatus.CONTACTED',
  },
  VISIT_SCHEDULED: {
    tone: 'active',
    variant: 'subtle',
    icon: Clock,
    filled: false,
    labelKey: 'enums:propertyStatus.VISIT_SCHEDULED',
  },
  NEGOTIATING: {
    tone: 'active',
    variant: 'subtle',
    icon: Clock,
    filled: false,
    labelKey: 'enums:propertyStatus.NEGOTIATING',
  },
  AGREEMENT: {
    tone: 'active',
    variant: 'subtle',
    icon: Clock,
    filled: false,
    labelKey: 'enums:propertyStatus.AGREEMENT',
  },
  // The only solid pill in the set. A sale is the outcome the whole app exists for and
  // should be findable by glance alone down a long list.
  CLOSED_WON: {
    tone: 'won',
    variant: 'solid',
    icon: CheckCircle,
    filled: true,
    labelKey: 'enums:propertyStatus.CLOSED_WON',
  },
  CLOSED_LOST: {
    tone: 'lost',
    variant: 'outline',
    icon: XCircle,
    filled: false,
    labelKey: 'enums:propertyStatus.CLOSED_LOST',
  },
  ON_HOLD: {
    tone: 'pending',
    variant: 'outline',
    icon: PauseCircle,
    filled: false,
    labelKey: 'enums:propertyStatus.ON_HOLD',
  },
};

export const BUYER_STATUS_META: Record<BuyerStatus, StatusMeta> = {
  ACTIVE: {
    tone: 'active',
    variant: 'subtle',
    icon: Clock,
    filled: false,
    labelKey: 'enums:buyerStatus.ACTIVE',
  },
  MATCHED: {
    tone: 'won',
    variant: 'subtle',
    icon: CheckCircle,
    filled: false,
    labelKey: 'enums:buyerStatus.MATCHED',
  },
  CLOSED: {
    tone: 'won',
    variant: 'solid',
    icon: CheckCircle,
    filled: true,
    labelKey: 'enums:buyerStatus.CLOSED',
  },
  INACTIVE: {
    tone: 'hold',
    variant: 'outline',
    icon: PauseCircle,
    filled: false,
    labelKey: 'enums:buyerStatus.INACTIVE',
  },
};

export const INQUIRY_STATUS_META: Record<InquiryStatus, StatusMeta> = {
  INTERESTED: {
    tone: 'active',
    variant: 'subtle',
    icon: Info,
    filled: false,
    labelKey: 'enums:inquiryStatus.INTERESTED',
  },
  VISITED: {
    tone: 'active',
    variant: 'subtle',
    icon: CheckCircle,
    filled: false,
    labelKey: 'enums:inquiryStatus.VISITED',
  },
  OFFER_MADE: {
    tone: 'pending',
    variant: 'subtle',
    icon: Clock,
    filled: false,
    labelKey: 'enums:inquiryStatus.OFFER_MADE',
  },
  REJECTED: {
    tone: 'lost',
    variant: 'outline',
    icon: XCircle,
    filled: false,
    labelKey: 'enums:inquiryStatus.REJECTED',
  },
  WON: {
    tone: 'won',
    variant: 'solid',
    icon: CheckCircle,
    filled: true,
    labelKey: 'enums:inquiryStatus.WON',
  },
};

/**
 * Tailwind classes per tone and variant.
 *
 * Written as complete literal strings rather than composed (`bg-${tone}-subtle`) because
 * Tailwind scans source text — an interpolated class name is never generated, and the
 * pill renders unstyled.
 *
 * Two rules, both learned by measuring rather than looking:
 *
 *  • Solid fills use `text-<tone>-fg`, never `text-white`. The correct ink differs per
 *    tone *and* per mode — white on the light-mode amber is 3.59:1, on the dark-mode
 *    blue 3.40:1; both fail.
 *  • Text uses `text-<tone>-ink`, not `text-<tone>`. The mark colour and the text colour
 *    are different values for the same tone, because the light amber cannot reach AA as
 *    text against any light background.
 */
export const STATUS_CLASSES: Record<StatusTone, Record<StatusVariant, string>> = {
  won: {
    solid: 'bg-won text-won-fg border-transparent',
    subtle: 'bg-won-subtle text-won-ink border-transparent',
    outline: 'bg-transparent text-won-ink border-won',
  },
  active: {
    solid: 'bg-active text-active-fg border-transparent',
    subtle: 'bg-active-subtle text-active-ink border-transparent',
    outline: 'bg-transparent text-active-ink border-active',
  },
  pending: {
    solid: 'bg-pending text-pending-fg border-transparent',
    subtle: 'bg-pending-subtle text-pending-ink border-transparent',
    outline: 'bg-transparent text-pending-ink border-pending',
  },
  lost: {
    solid: 'bg-lost text-lost-fg border-transparent',
    subtle: 'bg-lost-subtle text-lost-ink border-transparent',
    outline: 'bg-transparent text-lost-ink border-lost',
  },
  hold: {
    solid: 'bg-hold text-hold-fg border-transparent',
    subtle: 'bg-hold-subtle text-ink-secondary border-transparent',
    outline: 'bg-transparent text-ink-secondary border-border-strong',
  },
};

/** Chart slice colours for the four-family donut (DESIGN.md §11.2). */
export const STATUS_GROUP_TONES: Record<'active' | 'won' | 'lost' | 'hold', StatusTone> = {
  active: 'active',
  won: 'won',
  lost: 'lost',
  hold: 'pending',
};

/** Collapses the eight statuses into the four groups the donut can legibly show. */
export function statusGroup(status: PropertyStatus): keyof typeof STATUS_GROUP_TONES {
  if (status === 'CLOSED_WON') return 'won';
  if (status === 'CLOSED_LOST') return 'lost';
  if (status === 'ON_HOLD') return 'hold';
  return 'active';
}
