import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolveReturnTo, withReturnTo } from './listReturnTo.js';

export function getListReturnTo(location) {
  return `${location.pathname}${location.search}`;
}

/**
 * Navigate to a detail route while remembering the current list URL.
 * The list URL is put in the detail page's query string (and in history state
 * for backwards compatibility) so Back survives a refresh or a new tab.
 */
export function useNavigateWithReturn() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to, options = {}) => {
      const returnTo = getListReturnTo(location);
      navigate(withReturnTo(to, returnTo), {
        ...options,
        state: {
          ...(options.state && typeof options.state === 'object' ? options.state : {}),
          returnTo,
        },
      });
    },
    [navigate, location.pathname, location.search]
  );
}

/** Detail pages: go back to the saved list URL, or fall back to a default path. */
export function useListBack(fallbackPath = '/') {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    navigate(
      resolveReturnTo({
        search: location.search,
        state: location.state,
        fallback: fallbackPath,
      })
    );
  }, [navigate, location.search, location.state, fallbackPath]);
}

/**
 * Build a `to` for a <Link> that opens a detail page, carrying the current
 * page's return target forward. Use this for links that sit *on* a detail page
 * (e.g. related records) so they inherit the original list URL rather than
 * dropping it.
 */
export function useDetailLinkTo() {
  const location = useLocation();
  return useCallback(
    (to) =>
      withReturnTo(
        to,
        resolveReturnTo({ search: location.search, state: location.state, fallback: '' })
      ),
    [location.search, location.state]
  );
}

/** Pass to `<Link state={...}>` when opening a detail page from a list. */
export function useLinkReturnState(extraState = {}) {
  const location = useLocation();
  return {
    ...extraState,
    returnTo: getListReturnTo(location),
  };
}
