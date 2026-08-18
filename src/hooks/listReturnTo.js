/**
 * Return-to-list plumbing, kept free of React so it can be unit tested.
 *
 * The list page keeps its page/filters in the URL. When you open a detail page
 * we carry that list URL along so "Back" lands where you left off.
 *
 * The return URL travels in the *query string*, not in React Router history
 * state. History state is wiped by a page refresh, is absent when a link is
 * opened in a new tab, and is not carried by a plain <Link>, so "Back" silently
 * fell through to page 1 in all three cases.
 */

const RETURN_TO_PARAM = 'returnTo';

/**
 * Accept only same-origin absolute paths.
 *
 * `//evil.com` and `/\evil.com` start with "/" but browsers resolve them as
 * protocol-relative external URLs, so a bare startsWith('/') check is an open
 * redirect once the value is attacker-supplyable from the query string.
 */
export function sanitizeReturnTo(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v.startsWith('/')) return null;
  // Reject anything whose second character is a slash, backslash, or control
  // char (browsers strip tabs/newlines before resolving the URL).
  const rest = v.slice(1).replace(/[\t\n\r]/g, '');
  if (rest.startsWith('/') || rest.startsWith('\\')) return null;
  return v;
}

/** Build a detail-page URL that remembers where the user came from. */
export function withReturnTo(to, returnTo) {
  const safe = sanitizeReturnTo(returnTo);
  if (!safe) return to;
  const [path, existing = ''] = String(to).split('?');
  const params = new URLSearchParams(existing);
  params.set(RETURN_TO_PARAM, safe);
  return `${path}?${params.toString()}`;
}

/**
 * Where "Back" should go: the URL param first (survives refresh and new tabs),
 * then history state (older links already in the wild), then the fallback.
 */
export function resolveReturnTo({ search = '', state = null, fallback = '/' } = {}) {
  const fromUrl = sanitizeReturnTo(new URLSearchParams(search).get(RETURN_TO_PARAM));
  if (fromUrl) return fromUrl;
  const fromState = sanitizeReturnTo(state && state[RETURN_TO_PARAM]);
  if (fromState) return fromState;
  return fallback;
}

export { RETURN_TO_PARAM };
