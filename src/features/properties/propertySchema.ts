import { z } from 'zod';
import { AREA_UNITS, PROPERTY_TYPES, SOURCE_PLATFORMS } from '@/app/api/types';
import { normalizeNumericInput } from '@/lib/format';
import { isValidBdPhone } from '@/lib/phone';

/**
 * Client-side validation for the property form.
 *
 * Mirrors the server's rules with **translated** messages. That duplication is
 * deliberate and bounded: the server remains the authority — it revalidates everything
 * and its rejection is still mapped onto the fields — but validating here means the
 * common mistakes are caught instantly and in Bangla, rather than after a round trip
 * that returns an English Zod message.
 *
 * `t` is passed in so the messages come from the active language. A module-level schema
 * would freeze whichever language happened to be active at import.
 */

type Translate = (key: string, options?: Record<string, unknown>) => string;

function isNumericOrBlank(value: string): boolean {
  if (!value) return true;
  const normalized = normalizeNumericInput(value);
  return normalized !== '' && Number.isFinite(Number(normalized));
}

/**
 * The video allow-list, mirrored from the server.
 *
 * Checked here only so a typo is caught before submitting. The **security** control is
 * server-side: `embedUrl` is constructed there from an allow-listed host and a client
 * value is never accepted. This check is convenience, not protection.
 */
const VIDEO_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.watch',
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
];

function isSupportedVideoUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return VIDEO_HOSTS.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function buildPropertySchema(t: Translate) {
  const required = (field: string) => t('form.required', { field });

  return z.object({
    title: z
      .string()
      .trim()
      .min(1, required(t('property.formTitle')))
      .max(200),
    contactName: z
      .string()
      .trim()
      .min(1, required(t('property.contactName')))
      .max(120),
    contactPhone: z
      .string()
      .trim()
      .min(1, required(t('property.contactPhone')))
      .refine(isValidBdPhone, t('form.invalidPhone')),

    type: z.enum(PROPERTY_TYPES),

    askingPrice: z.string().refine(isNumericOrBlank, t('form.mustBeNumber')),
    commissionRate: z
      .string()
      .refine(isNumericOrBlank, t('form.mustBeNumber'))
      .refine(
        (value) => !value || Number(normalizeNumericInput(value)) <= 100,
        t('form.rateRange'),
      ),

    area: z.string().refine(isNumericOrBlank, t('form.mustBeNumber')),
    areaUnit: z.enum(AREA_UNITS),

    district: z.string().trim().max(60),
    areaName: z.string().trim().max(120),

    bedrooms: z.string().refine(isNumericOrBlank, t('form.mustBeNumber')),
    bathrooms: z.string().refine(isNumericOrBlank, t('form.mustBeNumber')),

    sourcePlatform: z.enum(SOURCE_PLATFORMS),
    sourceUrl: z
      .string()
      .trim()
      .refine((value) => {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      }, t('form.invalidUrl')),

    notes: z.string().trim().max(5000),

    videos: z
      .array(
        z.object({
          url: z.string().trim(),
          label: z.string().trim().max(100),
        }),
      )
      .max(10, t('form.tooManyVideos'))
      // Empty rows are dropped on submit, so only filled ones are checked.
      .refine(
        (videos) => videos.every((video) => !video.url || isSupportedVideoUrl(video.url)),
        t('form.unsupportedVideo'),
      ),
  });
}

export type PropertyFormValues = z.infer<ReturnType<typeof buildPropertySchema>>;

export const EMPTY_FORM: PropertyFormValues = {
  title: '',
  contactName: '',
  contactPhone: '',
  type: 'LAND',
  askingPrice: '',
  commissionRate: '',
  area: '',
  areaUnit: 'KATHA',
  district: '',
  areaName: '',
  bedrooms: '',
  bathrooms: '',
  sourcePlatform: 'FACEBOOK',
  sourceUrl: '',
  notes: '',
  videos: [],
};

/**
 * Form values → API payload.
 *
 * Blank strings become omitted keys rather than empty strings: the server's optional
 * fields reject `""` where they accept `undefined`, and sending `""` for an optional
 * number is a validation error rather than "leave it unset".
 */
export function toApiPayload(values: PropertyFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: values.title,
    contactName: values.contactName,
    contactPhone: values.contactPhone,
    type: values.type,
    areaUnit: values.areaUnit,
    sourcePlatform: values.sourcePlatform,
    // Only the URL is sent. `provider` and `embedUrl` are derived server-side, and a
    // client-supplied embedUrl is ignored — it would otherwise be an iframe src.
    videos: values.videos
      .filter((video) => video.url.trim())
      .map((video) => ({
        url: video.url.trim(),
        ...(video.label.trim() && { label: video.label.trim() }),
      })),
  };

  const numeric: [keyof PropertyFormValues, string][] = [
    ['askingPrice', values.askingPrice],
    ['commissionRate', values.commissionRate],
    ['area', values.area],
    ['bedrooms', values.bedrooms],
    ['bathrooms', values.bathrooms],
  ];

  for (const [key, raw] of numeric) {
    const normalized = normalizeNumericInput(raw);
    if (normalized) payload[key] = normalized;
  }

  const text: [keyof PropertyFormValues, string][] = [
    ['district', values.district],
    ['areaName', values.areaName],
    ['sourceUrl', values.sourceUrl],
    ['notes', values.notes],
  ];

  for (const [key, raw] of text) {
    if (raw.trim()) payload[key] = raw.trim();
  }

  return payload;
}
