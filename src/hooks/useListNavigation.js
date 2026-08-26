import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function getListReturnTo(location) {
  return `${location.pathname}${location.search}`;
}

/** Navigate to a detail route while remembering the current list URL. */
export function useNavigateWithReturn() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to, options = {}) => {
      navigate(to, {
        ...options,
        state: {
          ...(options.state && typeof options.state === 'object' ? options.state : {}),
          returnTo: getListReturnTo(location),
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
    const returnTo = location.state?.returnTo;
    if (typeof returnTo === 'string' && returnTo.startsWith('/')) {
      navigate(returnTo);
      return;
    }
    navigate(fallbackPath);
  }, [navigate, location.state, fallbackPath]);
}

/** Pass to `<Link state={...}>` when opening a detail page from a list. */
export function useLinkReturnState(extraState = {}) {
  const location = useLocation();
  return {
    ...extraState,
    returnTo: getListReturnTo(location),
  };
}
