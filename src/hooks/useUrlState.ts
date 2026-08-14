import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps a piece of state in the URL query string.
 *
 * The URL is the single source of truth rather than a mirror of React state. That is
 * what makes the back button, refresh, and bookmarking all work without extra code —
 * and it means a filtered list can be shared as a link.
 *
 * The caller supplies `parse` and `serialize` so this stays honest about types: a
 * generic that guessed how to encode arrays and numbers would need casts at every call
 * site, which defeats the point.
 */
export function useUrlState<T>(
  parse: (params: URLSearchParams) => T,
  serialize: (value: T) => Record<string, string>,
): [T, (patch: Partial<T>) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => parse(searchParams), [searchParams, parse]);

  const update = useCallback(
    (patch: Partial<T>) => {
      const next = { ...value, ...patch };
      // `replace` so filter tweaks do not fill the history stack — the back button
      // should leave the list, not step through every keystroke of a search.
      setSearchParams(serialize(next), { replace: true });
    },
    [value, serialize, setSearchParams],
  );

  const reset = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return [value, update, reset];
}
