import api from './api';

const BASE = '/admin/blocked-domains';

export const blockedDomainService = {
  async list({ page = 1, limit = 50, query = '' } = {}) {
    const response = await api.get(BASE, {
      params: { page, limit, query: query || undefined },
    });
    return response.data.data;
  },

  async create({ domain, domains, description } = {}) {
    const response = await api.post(BASE, {
      domain,
      domains,
      description,
    });
    return response.data.data;
  },

  async update(id, { domain, description } = {}) {
    const response = await api.put(`${BASE}/${id}`, {
      domain,
      description,
    });
    return response.data.data;
  },

  async delete(id) {
    const response = await api.delete(`${BASE}/${id}`);
    return response.data.data;
  },
};

export default blockedDomainService;
