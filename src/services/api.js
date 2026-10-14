import axios from 'axios';
import {
  attachGoLiveSignatureToAxiosConfig,
  isApiSigningConfigured,
  pathnameForAxiosConfig,
  signAdminApiRequest,
} from '../utils/adminRequestSign.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.golivestreamers.com/api/v1";

/**
 * Feed service base URL — Phase 5c of the feed-separation plan.
 *
 * Set VITE_FEED_API_BASE_URL to point at Go_live_Feed_Backend. When unset, falls back to
 * API_BASE_URL so pre-5c single-backend topologies (and production builds behind nginx that
 * routes feed paths server-side) still work unchanged.
 */
const FEED_API_BASE_URL = (
  import.meta.env.VITE_FEED_API_BASE_URL || API_BASE_URL
).replace(/\/+$/, '');

/**
 * Path prefixes served by the feed service. Keep in sync with:
 *   - Go_live_Feed_Backend/src/app.js (route mounts)
 *   - Go_live_App_Backend/src/app.js (dev-only proxy prefix list)
 *   - Go_Live_Frontend/constants/api.ts (FEED_PATH_PREFIXES)
 *   - nginx config in production
 */
const FEED_PATH_PREFIXES = [
  '/post/',
  '/feed/',
  '/followers/',
  '/admin/posts/',
  '/admin/feed-algorithm/',
];

function isFeedApiPath(url) {
  if (!url || typeof url !== 'string') return false;
  let p = url.trim();
  if (!p) return false;
  if (/^https?:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname;
    } catch {
      /* bare path fall-through */
    }
  }
  p = p.replace(/^\/api\/v\d+/i, '');
  if (!p.startsWith('/')) p = `/${p}`;
  // Match either the prefix with trailing slash OR the bare segment (e.g. '/admin/posts').
  return FEED_PATH_PREFIXES.some(
    (prefix) => p.startsWith(prefix) || p === prefix.slice(0, -1),
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Route feed path prefixes to FEED_API_BASE_URL. Runs before the auth interceptor so the
 * signed URL and the fetched URL match. When FEED_API_BASE_URL === API_BASE_URL (no split
 * configured), this is a no-op.
 */
api.interceptors.request.use((config) => {
  if (FEED_API_BASE_URL !== API_BASE_URL && isFeedApiPath(config.url)) {
    config.baseURL = FEED_API_BASE_URL;
  }
  return config;
});

if (import.meta.env.DEV) {
  console.log(`[api] main=${API_BASE_URL}`);
  if (FEED_API_BASE_URL !== API_BASE_URL) {
    console.log(`[api] feed=${FEED_API_BASE_URL}`);
  }
}

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshToken = (token) => {
  refreshSubscribers.map(callback => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('adminAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers?.delete) {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
    }
    await attachGoLiveSignatureToAxiosConfig(config);
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status === 401 && !config._retry && !config.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            resolve(api(config));
          });
        });
      }

      config._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const refreshBody = JSON.stringify({ refreshToken });
        const refreshPath = pathnameForAxiosConfig({
          baseURL: API_BASE_URL,
          url: '/auth/refresh',
        });
        const signHeaders = isApiSigningConfigured()
          ? await signAdminApiRequest({
              method: 'POST',
              pathname: refreshPath,
              body: refreshBody,
            })
          : {};

        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          refreshBody,
          {
            headers: {
              'Content-Type': 'application/json',
              ...signHeaders,
            },
          },
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

        localStorage.setItem('adminAccessToken', accessToken);
        localStorage.setItem('adminRefreshToken', newRefreshToken);

        onRefreshToken(accessToken);

        config.headers.Authorization = `Bearer ${accessToken}`;
        return api(config);

      } catch (refreshError) {
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('adminUser');

        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
