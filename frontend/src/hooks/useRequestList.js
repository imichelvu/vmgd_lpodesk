/**
 * Author: Igor Michel
 * Purpose: Load list endpoints with stable defaults, loading, and error state.
 * Last updated: 2026-02-28
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Load a list endpoint with cancellation safety.
 * Keeps page components concise and consistent.
 */
export function useRequestList(request, path, initialValue = []) {
  const initialRef = useRef(initialValue);
  const [list, setList] = useState(initialRef.current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    request(path)
      .then((data) => {
        if (!cancelled) {
          setList(Array.isArray(data) ? data : initialRef.current);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setList(initialRef.current);
          setError(err?.message || 'Failed to load data.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [request, path]);

  useEffect(() => reload(), [reload]);

  return { list, setList, reload, loading, error };
}

