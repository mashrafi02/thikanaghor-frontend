import type { PropertyStatus, PropertyType } from '@/app/api/types';
import type { Property } from '@/features/properties/types';

/**
 * Dashboard response shapes, transcribed from `dashboard.service.ts`.
 *
 * Every money field is a **string**, exactly as the server sends it. Parsing one into a
 * number here would undo the decimal handling the backend went to some trouble to get
 * right, so amounts stay strings until a formatter renders them.
 */

export interface DashboardStats {
  properties: { total: number; active: number; closedWon: number; closedLost: number };
  buyers: { total: number; active: number };
  earnings: {
    total: string;
    received: string;
    pending: string;
    thisMonth: string;
    lastMonth: string;
    /** null when last month was zero — a percentage change from nothing is undefined,
     *  not infinite, and must not render as one. */
    monthChangePercent: number | null;
  };
  pipeline: { activeDeals: number; projectedCommission: string };
  performance: {
    /** null until something has actually concluded. */
    conversionRate: number | null;
    avgDaysToClose: number | null;
    staleDeals: number;
  };
}

export interface TimeseriesPoint {
  /** `YYYY-MM`. Formatted for display by `useFormat().month`. */
  month: string;
  received: string;
  pending: string;
  total: string;
  dealsClosed: number;
  propertiesAdded: number;
}

export interface TimeseriesResponse {
  months: number;
  points: TimeseriesPoint[];
}

export interface DistributionSlice<K extends string = string> {
  key: K;
  count: number;
}

export interface DistributionResponse {
  byStatus: DistributionSlice<PropertyStatus>[];
  byType: DistributionSlice<PropertyType>[];
}

export interface AttentionItem extends Property {
  /** null when the record has no status events at all. */
  daysSinceLastChange: number | null;
}

export interface AttentionResponse {
  items: AttentionItem[];
  total: number;
}

/** The ranges the period switcher offers. Kept small on purpose: a referral business
 *  reads the last few months, and a 24-month axis is unreadable on a phone. */
export const TIMESERIES_RANGES = [6, 12] as const;
export type TimeseriesRange = (typeof TIMESERIES_RANGES)[number];
