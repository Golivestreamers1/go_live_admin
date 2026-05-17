import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://golive.staging.api.server2.creativecreation.io/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  (config) => {
    const token = localStorage.getItem('adminAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Default Content-Type is application/json; for FormData the browser must set
    // multipart/form-data with a boundary — otherwise multer sees no file (uploads fail silently or 400).
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers?.delete) {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // Don't try to refresh tokens for login/register requests
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

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });

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
  }
);

export default api;