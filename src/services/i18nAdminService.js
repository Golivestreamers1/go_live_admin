import axios from 'axios';

const API_BASE = '/api/v1/admin/i18n';

export const i18nAdminService = {
  getLanguages: () => axios.get(`${API_BASE}/languages`),
  addLanguage: (data) => axios.post(`${API_BASE}/languages`, data),
  getKeys: () => axios.get(`${API_BASE}/keys`),
  getMissingKeys: (lang) => axios.get(`${API_BASE}/missing?language=${lang}`),
  upsertValue: (data) => axios.post(`${API_BASE}/values`, data),
  publishRelease: (data) => axios.post(`${API_BASE}/releases/publish`, data),
  rollbackRelease: (releaseId) => axios.post(`${API_BASE}/releases/${releaseId}/rollback`)
};
