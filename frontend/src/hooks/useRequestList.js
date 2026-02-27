import { useState, useEffect, useCallback } from 'react';

/**
 * Load a list endpoint with cancellation safety.
 * Keeps page components concise and consistent.
 */
export function useRequestList(request, path, initialValue = []) {
  const [list, setList] = useState(initialValue);

  const reload = useCallback(() => {
    let cancelled = false;
    request(path)
      .then((data) => {
        if (!cancelled) setList(Array.isArray(data) ? data : initialValue);
      })
      .catch(() => {
        if (!cancelled) setList(initialValue);
      });
    return () => {
      cancelled = true;
    };
  }, [request, path, initialValue]);

  useEffect(() => reload(), [reload]);

  return { list, setList, reload };
}

