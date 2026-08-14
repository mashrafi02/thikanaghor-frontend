import type {
  AreaUnit,
  Facing,
  InquiryStatus,
  Money,
  PaginationMeta,
  PropertyStatus,
  PropertyType,
  SourcePlatform,
  VideoProvider,
} from '@/app/api/types';

/**
 * Property shapes, transcribed from `backend/src/services/property.serializer.ts`.
 *
 * Every amount is `Money` — a **string**. The backend serialises `NUMERIC(14,2)` to
 * "5000000.00" precisely so the value survives the trip; typing these as `number` would
 * invite a `Number(...)` at some call site and undo that.
 */

export interface PropertyVideo {
  id: string;
  /** The URL as pasted — used for the "open on Facebook/TikTok" fallback. */
  url: string;
  provider: VideoProvider;
  /** Built server-side. Safe as an iframe src; never constructed on the client. */
  embedUrl: string;
  label: string | null;
  sortOrder: number;
  /**
   * Poster image, or null when the provider does not publish one.
   *
   * Populated for YouTube on every response — it is derived from the video id with no
   * network call. TikTok's needs an oEmbed round trip and is fetched on demand from
   * `/properties/videos/:id/thumbnail`. Facebook has none without a registered app
   * token, so it stays null and the placeholder shows its provider mark instead.
   */
  thumbnailUrl: string | null;
}

/** Shared by list rows and the detail page. */
export interface Property {
  id: string;

  title: string;
  contactName: string;
  contactPhone: string;
  /** Precomputed by the server so the client does not reimplement BD phone formatting. */
  contactPhoneDisplay: string;
  contactPhoneTel: string;
  contactPhoneWhatsApp: string;
  altPhone: string | null;
  altPhoneDisplay: string | null;

  type: PropertyType;
  status: PropertyStatus;

  askingPrice: Money | null;
  negotiatedPrice: Money | null;
  finalSalePrice: Money | null;
  commissionRate: string;
  commissionAmount: Money | null;
  commissionReceived: boolean;
  commissionReceivedAt: string | null;
  /** asking × rate. Null once the deal closes and a real commission exists. */
  projectedCommission: Money | null;

  area: string | null;
  areaUnit: AreaUnit;
  areaSqft: string | null;
  areaInKatha: string | null;

  division: string | null;
  district: string | null;
  upazila: string | null;
  areaName: string | null;
  addressLine: string | null;
  landmark: string | null;

  bedrooms: number | null;
  bathrooms: number | null;
  floorNo: number | null;
  totalFloors: number | null;
  facing: Facing | null;
  isReadyToMove: boolean;

  sourceUrl: string | null;
  sourcePlatform: SourcePlatform;

  notes: string | null;
  tags: string[];

  videos: PropertyVideo[];
  videoCount: number;

  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatusEvent {
  id: string;
  fromStatus: PropertyStatus | null;
  toStatus: PropertyStatus;
  note: string | null;
  createdAt: string;
}

export interface PropertyInquiry {
  id: string;
  status: InquiryStatus;
  offeredPrice: Money | null;
  visitedAt: string | null;
  notes: string | null;
  createdAt: string;
  buyer: {
    id: string;
    name: string;
    phone: string;
    phoneDisplay: string;
    status: string;
  };
}

export interface PropertyDetail extends Property {
  /**
   * The transitions the API will actually accept from here.
   *
   * The single most useful field in the response: the stepper and the status menu render
   * only what this contains, so the UI can never offer a move the server will reject and
   * the transition rules are not duplicated on the client.
   */
  allowedNextStatuses: PropertyStatus[];
  daysInCurrentStatus: number | null;
  statusEvents: StatusEvent[];
  inquiries: PropertyInquiry[];
}

export interface PropertyListResponse {
  items: Property[];
  meta: PaginationMeta;
}

/** Mirrors the server's sort allow-list. Anything else is a 400, not a fallback. */
export const PROPERTY_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'title',
  'askingPrice',
  'areaSqft',
  'status',
  'closedAt',
] as const;

export type PropertySortField = (typeof PROPERTY_SORT_FIELDS)[number];

export interface PropertyFilters {
  q: string;
  status: PropertyStatus[];
  type: PropertyType[];
  district: string;
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  areaUnit: AreaUnit;
  sortBy: PropertySortField;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}
