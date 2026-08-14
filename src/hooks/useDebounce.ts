import { useEffect, useState } from 'react';

/**
 * Delays a rapidly-changing value.
 *
 * Used for search: a request per keystroke is wasteful and, with a Bangla IME, fires
 * mid-composition on partial conjuncts that match nothing.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
