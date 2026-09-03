import api from './api';

const BASE = '/admin/ip-bans';

export const ipBanService = {
  async list({ page = 1, limit = 20, q = '', activeOnly = true } = {}) {
    const response = await api.get(BASE, {
      params: { page, limit, q: q || undefined, activeOnly },
    });
    return response.data.data;
  },

  async create({ ip, reason, durationDays, expiresAt } = {}) {
    const response = await api.post(BASE, {
      ip,
      reason,
      durationDays,
      expiresAt,
    });
    return response.data.data;
  },

  async lift(id) {
    const response = await api.delete(`${BASE}/${id}`);
    return response.data.data;
  },

  async lookup(ip) {
    const response = await api.get(`${BASE}/lookup`, { params: { ip } });
    return response.data.data;
  },
};

export default ipBanService;
