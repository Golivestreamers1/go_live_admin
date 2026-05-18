import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * usePolling — repeatedly invokes `fetcher` at `intervalMs`. `intervalMs = 0` pauses polling.
 * Returns { data, error, isLoading, isStale, lastUpdatedAt, intervalMs, setIntervalMs, refresh }.
 */
export function usePolling(fetcher, { defaultIntervalMs = 60_000 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [intervalMs, setIntervalMs] = useState(defaultIntervalMs);

  const mounted = useRef(true);
  const timer = useRef(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    try {
      const next = await fetcherRef.current();
      if (!mounted.current) return;
      setData(next);
      setError(null);
      setIsStale(false);
      setLastUpdatedAt(new Date());
    } catch (err) {
      if (!mounted.current) return;
      setError(err?.message || 'Request failed');
      setIsStale(true);
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    return run();
  }, [run]);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [run]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!intervalMs || intervalMs <= 0) return undefined;

    const schedule = () => {
      timer.current = setTimeout(async () => {
        if (!mounted.current) return;
        await run();
        if (mounted.current) schedule();
      }, intervalMs);
    };
    schedule();

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [intervalMs, run]);

  return {
    data,
    error,
    isLoading,
    isStale,
    lastUpdatedAt,
    intervalMs,
    setIntervalMs,
    refresh,
  };
}
