import api from './api';

const API_BASE = '/admin/i18n';

export const i18nAdminService = {
  getLanguages: () => api.get(`${API_BASE}/languages`),
  addLanguage: (data) => api.post(`${API_BASE}/languages`, data),
  getKeys: () => api.get(`${API_BASE}/keys`),
  createKey: (data) => api.post(`${API_BASE}/keys`, data),
  getValues: (languageCode) => api.get(`${API_BASE}/values?languageCode=${languageCode}`),
  getMissingKeys: (lang) => api.get(`${API_BASE}/missing?language=${lang}`),
  upsertValue: (data) => api.post(`${API_BASE}/values`, data),
  publishRelease: (data) => api.post(`${API_BASE}/releases/publish`, data),
  rollbackRelease: (releaseId) => api.post(`${API_BASE}/releases/${releaseId}/rollback`)
};
