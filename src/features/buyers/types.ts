import type {
  BuyerStatus,
  InquiryStatus,
  Money,
  PaginationMeta,
  PropertyStatus,
  PropertyType,
} from '@/app/api/types';
import type { ContactPhone, Property } from '@/features/properties/types';

/** Transcribed from `backend/src/services/buyer.serializer.ts`. */

export interface BuyerInquiry {
  id: string;
  status: InquiryStatus;
  offeredPrice: Money | null;
  visitedAt: string | null;
  notes: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    type: PropertyType;
    status: PropertyStatus;
    askingPrice: Money | null;
  };
}

export interface Buyer {
  id: string;
  name: string;
  /** Ordered; index 0 is the primary number. Never empty — the API requires one. */
  phones: ContactPhone[];
  budgetMin: Money | null;
  budgetMax: Money | null;
  preferredTypes: PropertyType[];
  preferredAreas: string[];
  status: BuyerStatus;
  notes: string | null;
  inquiryCount: number;
  inquiries: BuyerInquiry[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Why a property was suggested — a structured code, not prose.
 *
 * The server sends `{ code: 'PREFERRED_AREA', value: 'bashundhara' }` rather than
 * "preferred area (bashundhara)", so the card can render it in Bangla.
 */
export type MatchReason =
  | { code: 'WITHIN_BUDGET' }
  | { code: 'NEAR_BUDGET' }
  | { code: 'PREFERRED_TYPE'; value: string }
  | { code: 'PREFERRED_AREA'; value: string };

export interface PropertyMatch extends Property {
  matchScore: number;
  matchReasons: MatchReason[];
}

export interface BuyerListResponse {
  items: Buyer[];
  meta: PaginationMeta;
}

export const BUYER_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'status'] as const;
export type BuyerSortField = (typeof BUYER_SORT_FIELDS)[number];

export interface BuyerFilters {
  q: string;
  status: BuyerStatus[];
  preferredType: PropertyType[];
  sortBy: BuyerSortField;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}
