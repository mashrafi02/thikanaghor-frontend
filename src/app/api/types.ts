import type { ServerErrorCode } from '@/lib/errorCodes';

/**
 * Shared API types, transcribed from the backend (FRONTEND.md §3).
 *
 * The enums are duplicated here rather than generated. That is a deliberate trade: a
 * codegen step for eight small unions adds a build dependency and a way for the two to
 * be out of sync *silently*. Duplicated, they are checked by `statusMeta`'s exhaustive
 * `Record<>` types — adding a status to the backend without adding it here is a
 * compile error, not a runtime surprise.
 */

// ── envelope ─────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  status: 'success';
  message?: string;
  data?: T;
}

/** 4xx is "fail", 5xx is "error". `details` appears only on Zod validation failures. */
export interface ApiErrorBody {
  status: 'fail' | 'error';
  statusCode: number;
  /** Stable machine code — this is what the UI translates. `message` is the English
   *  fallback the server always includes for logs and untranslated clients. */
  code?: ServerErrorCode;
  /** Interpolation values, so a translated sentence can be built rather than glued. */
  params?: Record<string, unknown>;
  message: string;
  details?: Record<string, string[]>;
  requestId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

// ── enums ────────────────────────────────────────────────────────────────────

export const PROPERTY_TYPES = ['LAND', 'PLOT', 'FLAT', 'BUILDING', 'COMMERCIAL'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_STATUSES = [
  'NEW',
  'CONTACTED',
  'VISIT_SCHEDULED',
  'NEGOTIATING',
  'AGREEMENT',
  'CLOSED_WON',
  'CLOSED_LOST',
  'ON_HOLD',
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

/** The five stages a live deal moves through. Mirrors ACTIVE_STATUSES on the server —
 *  used for the pipeline board's columns and the "active deals" count. */
export const ACTIVE_STATUSES = [
  'NEW',
  'CONTACTED',
  'VISIT_SCHEDULED',
  'NEGOTIATING',
  'AGREEMENT',
] as const satisfies readonly PropertyStatus[];

export const AREA_UNITS = ['KATHA', 'BIGHA', 'DECIMAL', 'SQFT', 'SQ_YARD', 'ACRE'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export const VIDEO_PROVIDERS = ['FACEBOOK', 'TIKTOK', 'YOUTUBE'] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

export const SOURCE_PLATFORMS = [
  'FACEBOOK',
  'TIKTOK',
  'YOUTUBE',
  'WHATSAPP',
  'DIRECT',
  'OTHER',
] as const;
export type SourcePlatform = (typeof SOURCE_PLATFORMS)[number];

export const FACINGS = [
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
  'NORTH_EAST',
  'NORTH_WEST',
  'SOUTH_EAST',
  'SOUTH_WEST',
] as const;
export type Facing = (typeof FACINGS)[number];

export const BUYER_STATUSES = ['ACTIVE', 'MATCHED', 'CLOSED', 'INACTIVE'] as const;
export type BuyerStatus = (typeof BUYER_STATUSES)[number];

export const INQUIRY_STATUSES = [
  'INTERESTED',
  'VISITED',
  'OFFER_MADE',
  'REJECTED',
  'WON',
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

// ── auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  locale: string;
}

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

/**
 * Money is a **string**, everywhere, in and out.
 *
 * The backend stores NUMERIC(14,2) and serialises to "5000000.00" precisely so the
 * value survives the trip. Typing it as `number` here would invite `Number(...)` at a
 * call site and undo that. The alias exists to make the intent unmissable at every
 * field it annotates.
 */
export type Money = string;
