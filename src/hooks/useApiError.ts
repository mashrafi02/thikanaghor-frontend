import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeError, type NormalizedApiError } from '@/app/api/baseApi';
import { ENUM_VALUED_PARAMS, type ErrorCode } from '@/lib/errorCodes';

/**
 * Turns any RTK Query failure into a sentence in the user's language.
 *
 * The backend sends a stable `code` plus interpolation `params`; this resolves them
 * against the `errors` namespace. The server's English `message` is used only when a
 * code has no translation — which the test suite makes impossible for known codes, so
 * in practice it covers a backend deployed ahead of the frontend.
 */

export interface ResolvedApiError extends Omit<NormalizedApiError, 'code'> {
  /** Ready to display, in the active language. */
  text: string;
  /** Widened from the server's code set to include the client-only ones (OFFLINE,
   *  SERVER_UNREACHABLE) — a network failure never reached a server to be named. */
  code: ErrorCode;
  /** True when the failure belongs on form fields rather than in a toast. */
  isFieldError: boolean;
}

export function useApiError() {
  const { t, i18n } = useTranslation(['errors', 'enums']);

  const resolve = useCallback(
    (error: unknown): ResolvedApiError => {
      const normalized = normalizeError(error);

      // A network failure never reaches the server, so it has no code of its own.
      const code: ErrorCode =
        normalized.code ??
        (normalized.isOffline
          ? 'OFFLINE'
          : normalized.statusCode === null
            ? 'SERVER_UNREACHABLE'
            : 'UNKNOWN');

      // Enum-valued params must be translated before interpolation, or a Bangla
      // sentence ends with a raw "NEGOTIATING".
      const params: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(normalized.params ?? {})) {
        const enumNamespace = ENUM_VALUED_PARAMS[key];
        if (!enumNamespace) {
          params[key] = value;
          continue;
        }
        params[key] = Array.isArray(value)
          ? value.map((item) => t(`enums:${enumNamespace}.${String(item)}`)).join(', ')
          : t(`enums:${enumNamespace}.${String(value)}`);
      }

      const key = `errors:${code}`;
      const translated = t(key, params);

      return {
        ...normalized,
        code,
        // i18next returns the key itself when nothing matched. Falling back to the
        // server's English beats showing "errors:SOME_CODE" to a user.
        text: translated === key ? normalized.message : translated,
        isFieldError: Boolean(normalized.details),
      };
    },
    // i18n.language is in the deps because `t` is not referentially stable across a
    // language change, and a memoised resolver would keep returning the old language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );

  return resolve;
}
