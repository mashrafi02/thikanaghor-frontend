import type { PropertyStatus } from '@/app/api/types';
import type { Property } from '@/features/properties/types';

/**
 * The Kanban board's shapes, transcribed from `pipeline.service.ts`.
 *
 * `totalValue` and `projectedCommission` are **strings**, summed with Decimal on the
 * server. That is the whole reason the board has its own endpoint rather than reusing
 * the property list: adding money client-side would mean `Number()`-ing decimal strings,
 * which is the one thing the money design exists to prevent.
 */

export interface PipelineCard extends Property {
  /** Days since the last status change — how long this deal has sat where it is. */
  daysInCurrentStatus: number | null;
  /** Past the stale cutoff, so the card should look different from a fresh one. */
  isStale: boolean;
}

export interface PipelineColumn {
  status: PropertyStatus;
  count: number;
  totalValue: string;
  projectedCommission: string;
  /** What a card here may legally become. Mirrors the server's state machine exactly,
   *  so an illegal drop is refused before a request is built. */
  allowedNextStatuses: PropertyStatus[];
  truncated: boolean;
}

export interface PipelineResponse {
  columns: PipelineColumn[];
  items: Record<PropertyStatus, PipelineCard[] | undefined>;
}
