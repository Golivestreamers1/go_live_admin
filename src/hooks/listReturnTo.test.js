import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeReturnTo, withReturnTo, resolveReturnTo } from './listReturnTo.js';

describe('sanitizeReturnTo', () => {
  it('accepts same-origin paths, with query and hash', () => {
    assert.equal(sanitizeReturnTo('/support'), '/support');
    assert.equal(sanitizeReturnTo('/support?page=3'), '/support?page=3');
    assert.equal(sanitizeReturnTo('/users?page=2&status=active'), '/users?page=2&status=active');
  });

  it('rejects protocol-relative URLs that browsers treat as external', () => {
    // `//evil.com` starts with "/" but navigates off-site.
    assert.equal(sanitizeReturnTo('//evil.com'), null);
    assert.equal(sanitizeReturnTo('//evil.com/support?page=3'), null);
    assert.equal(sanitizeReturnTo('/\\evil.com'), null);
    assert.equal(sanitizeReturnTo('/\t/evil.com'), null);
  });

  it('rejects absolute URLs and non-path junk', () => {
    assert.equal(sanitizeReturnTo('https://evil.com'), null);
    assert.equal(sanitizeReturnTo('javascript:alert(1)'), null);
    assert.equal(sanitizeReturnTo('support?page=3'), null);
    assert.equal(sanitizeReturnTo(''), null);
    assert.equal(sanitizeReturnTo(null), null);
    assert.equal(sanitizeReturnTo(undefined), null);
    assert.equal(sanitizeReturnTo(42), null);
  });
});

describe('withReturnTo', () => {
  it('appends an encoded returnTo to a plain path', () => {
    assert.equal(
      withReturnTo('/support/abc123', '/support?page=3'),
      '/support/abc123?returnTo=%2Fsupport%3Fpage%3D3'
    );
  });

  it('preserves an existing query string on the target', () => {
    const out = withReturnTo('/support/abc?tab=notes', '/support?page=3');
    assert.ok(out.startsWith('/support/abc?'));
    const qs = new URLSearchParams(out.split('?')[1]);
    assert.equal(qs.get('tab'), 'notes');
    assert.equal(qs.get('returnTo'), '/support?page=3');
  });

  it('does not attach an unsafe returnTo', () => {
    assert.equal(withReturnTo('/support/abc', '//evil.com'), '/support/abc');
    assert.equal(withReturnTo('/support/abc', ''), '/support/abc');
  });

  it('does not double-append on repeated navigation', () => {
    const once = withReturnTo('/support/abc', '/support?page=3');
    const twice = withReturnTo(once, '/support?page=5');
    const qs = new URLSearchParams(twice.split('?')[1]);
    assert.equal(qs.getAll('returnTo').length, 1);
    assert.equal(qs.get('returnTo'), '/support?page=5');
  });
});

describe('resolveReturnTo', () => {
  it('prefers the URL param so it survives a page refresh', () => {
    assert.equal(
      resolveReturnTo({
        search: '?returnTo=%2Fsupport%3Fpage%3D3',
        state: { returnTo: '/support?page=1' },
        fallback: '/support',
      }),
      '/support?page=3'
    );
  });

  it('falls back to history state when the URL has no param', () => {
    assert.equal(
      resolveReturnTo({ search: '', state: { returnTo: '/support?page=4' }, fallback: '/support' }),
      '/support?page=4'
    );
  });

  it('falls back to the default path when neither is present', () => {
    assert.equal(resolveReturnTo({ search: '', state: null, fallback: '/support' }), '/support');
    assert.equal(resolveReturnTo({ fallback: '/support' }), '/support');
  });

  it('ignores an unsafe URL param instead of trusting it', () => {
    assert.equal(
      resolveReturnTo({
        search: '?returnTo=%2F%2Fevil.com',
        state: null,
        fallback: '/support',
      }),
      '/support'
    );
    assert.equal(
      resolveReturnTo({
        search: '?returnTo=https%3A%2F%2Fevil.com',
        state: { returnTo: '/support?page=2' },
        fallback: '/support',
      }),
      '/support?page=2',
      'an unsafe param must not shadow a safe state value'
    );
  });
});
