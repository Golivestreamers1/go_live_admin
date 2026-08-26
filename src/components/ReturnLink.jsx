import React from 'react';
import { Link } from 'react-router-dom';
import { useLinkReturnState } from '../hooks/useListNavigation';

/** Link to a detail page while preserving the current list URL for back navigation. */
export function ReturnLink({ to, state, ...props }) {
  const returnState = useLinkReturnState(state);
  return <Link to={to} state={returnState} {...props} />;
}
