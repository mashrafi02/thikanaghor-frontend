/**
 * Mirror of the backend's error vocabulary (`backend/src/utils/errorCodes.ts`).
 *
 * Duplicated deliberately rather than generated: it is one flat list, and a codegen step
 * would add a build dependency for something a test can guard just as well. The test in
 * `tests/errorMessages.test.ts` asserts every code here has a translation in **both**
 * languages, so a code added to the backend and mirrored here without strings fails the
 * build rather than rendering a raw identifier to the user.
 */

export const SERVER_ERROR_CODES = [
  // auth
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_REQUIRED',
  'AUTH_SESSION_EXPIRED',
  'AUTH_ACCOUNT_LOCKED',
  'AUTH_CURRENT_PASSWORD_INCORRECT',
  'AUTH_PASSWORD_UNCHANGED',
  'SESSION_NOT_FOUND',
  // request integrity
  'CSRF_TOKEN_MISSING',
  'CSRF_TOKEN_INVALID',
  'RATE_LIMITED',
  'ORIGIN_NOT_ALLOWED',
  'ROUTE_NOT_FOUND',
  'BODY_INVALID_JSON',
  'BODY_TOO_LARGE',
  'BODY_UNSUPPORTED_ENCODING',
  'BODY_TOO_DEEP',
  'BODY_TOO_MANY_FIELDS',
  // validation
  'VALIDATION_FAILED',
  'INVALID_INPUT',
  // persistence
  'DUPLICATE_RECORD',
  'RECORD_NOT_FOUND',
  'REFERENCE_NOT_FOUND',
  'VALUE_TOO_LONG',
  'FIELD_REQUIRED',
  'RECORD_IN_USE',
  // property
  'PROPERTY_NOT_FOUND',
  'PROPERTY_STATUS_UNCHANGED',
  'PROPERTY_STATUS_TRANSITION_INVALID',
  'PROPERTY_STATUS_TERMINAL',
  'PROPERTY_ALREADY_CLOSED',
  'PROPERTY_REOPEN_REQUIRED',
  'PROPERTY_COMMISSION_REQUIRES_CLOSE',
  'PROPERTY_NOT_DELETED',
  // buyer & inquiry
  'BUYER_NOT_FOUND',
  'BUYER_NOT_DELETED',
  'INQUIRY_NOT_FOUND',
  'INQUIRY_DUPLICATE',
  // video links
  'VIDEO_URL_EMPTY',
  'VIDEO_URL_MALFORMED',
  'VIDEO_SCHEME_UNSUPPORTED',
  'VIDEO_HOST_UNSUPPORTED',
  'VIDEO_ID_NOT_FOUND',
  'VIDEO_TIKTOK_SHORT_LINK',
  // catch-all
  'INTERNAL',
] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];

/**
 * Failures that never reach the server, so the server can never name them. Kept in the
 * same namespace so the UI has one lookup for "what went wrong", whatever the layer.
 */
export const CLIENT_ERROR_CODES = ['OFFLINE', 'SERVER_UNREACHABLE', 'UNKNOWN'] as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];

export type ErrorCode = ServerErrorCode | ClientErrorCode;

export const ALL_ERROR_CODES: ErrorCode[] = [...SERVER_ERROR_CODES, ...CLIENT_ERROR_CODES];

/**
 * Params whose values are enum members and must themselves be translated before
 * interpolation — otherwise a Bangla sentence ends with a raw "NEGOTIATING".
 */
export const ENUM_VALUED_PARAMS: Record<string, 'propertyStatus'> = {
  status: 'propertyStatus',
  from: 'propertyStatus',
  to: 'propertyStatus',
  allowed: 'propertyStatus',
};
