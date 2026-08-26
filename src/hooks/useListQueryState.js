import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keep list pagination + filters in the URL so list → detail → back restores state.
 */
export function useListQueryState({ defaultPage = 1, filterKeys = [] } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const defaults = useMemo(
    () => ({
      page: defaultPage,
      ...Object.fromEntries(filterKeys.map((key) => [key, ''])),
    }),
    [defaultPage, filterKeys]
  );

  const params = useMemo(() => {
    const pageRaw = searchParams.get('page');
    const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10) || defaultPage) : defaultPage;
    const filters = {};
    for (const key of filterKeys) {
      filters[key] = searchParams.get(key) ?? '';
    }
    return { page, ...filters };
  }, [searchParams, defaultPage, filterKeys]);

  const setQuery = useCallback(
    (updates, { replace = true } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const merged = { ...params, ...updates };

          if (!merged.page || Number(merged.page) <= 1) next.delete('page');
          else next.set('page', String(merged.page));

          for (const key of filterKeys) {
            const val = merged[key];
            if (val == null || val === '') next.delete(key);
            else next.set(key, String(val));
          }
          return next;
        },
        { replace }
      );
    },
    [setSearchParams, params, filterKeys]
  );

  return { params, setQuery, defaults };
}
