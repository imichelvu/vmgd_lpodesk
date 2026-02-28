/**
 * Author: Igor Michel
 * Purpose: Centralize authenticated API requests with timeout/error handling.
 * Last updated: 2026-02-28
 */
import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_TIMEOUT_MS = 10000;

export function useApi() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (path, options = {}) => {
    setLoading(true);
    setError(null);
    const controller = !options.signal ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
      : null;
    try {
      const res = await api(path, {
        ...options,
        signal: options.signal || controller?.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      return data;
    } catch (e) {
      const isTimeout = e?.name === 'AbortError';
      const message = isTimeout
        ? 'Request timed out. Please check backend/API connectivity.'
        : (e?.message || 'Request failed');
      setError(message);
      throw new Error(message);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [api]);

  return { request, loading, error };
}
