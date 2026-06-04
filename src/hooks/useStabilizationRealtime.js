import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FALLBACK_POLL_MS,
  isStabilizationSocketConnected,
  subscribeStabilizationUpdates,
} from '../services/stabilizationSocket.service';

/**
 * Real-time stabilization data: Socket.IO push when phones report + slow HTTP fallback.
 *
 * @param {() => Promise<any>} fetcher - initial / fallback REST loader
 * @param {(payload: object) => any | null | undefined} selectFromSocket - maps socket snapshot to page data
 */
export function useStabilizationRealtime(fetcher, selectFromSocket) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [isLive, setIsLive] = useState(false);

  const fetcherRef = useRef(fetcher);
  const selectRef = useRef(selectFromSocket);
  fetcherRef.current = fetcher;
  selectRef.current = selectFromSocket;

  const applyPayload = useCallback((payload) => {
    if (!payload || payload.__disconnected) {
      setIsLive(false);
      setIsStale(true);
      return;
    }
    const next = selectRef.current(payload);
    if (next == null) return;
    setData(next);
    setError(null);
    setIsStale(false);
    setIsLive(true);
    setLastUpdatedAt(new Date());
    setIsLoading(false);
  }, []);

  const run = useCallback(async () => {
    try {
      const next = await fetcherRef.current();
      setData(next);
      setError(null);
      setIsStale(!isStabilizationSocketConnected());
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(err?.message || 'Request failed');
      setIsStale(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    return run();
  }, [run]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    run();

    const unsub = subscribeStabilizationUpdates((payload) => {
      if (cancelled) return;
      applyPayload(payload);
    });

    const fallbackTimer = setInterval(() => {
      if (!isStabilizationSocketConnected()) run();
    }, FALLBACK_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(fallbackTimer);
      unsub();
    };
  }, [run, applyPayload]);

  return {
    data,
    error,
    isLoading,
    isStale,
    lastUpdatedAt,
    isLive,
    refresh,
  };
}
