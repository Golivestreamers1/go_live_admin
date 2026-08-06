import api from './api';

export const agencyAdminService = {
  async getRequests(params = {}) {
    const { page = 1, limit = 20, status = 'pending', search } = params;
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status: status || 'pending',
      ...(search && String(search).trim() ? { search: String(search).trim() } : {}),
    });
    const response = await api.get(`/admin/agencies/requests?${queryParams}`);
    return response.data.data;
  },

  async reviewRequest(id, payload) {
    const response = await api.patch(`/admin/agencies/requests/${id}`, payload);
    return response.data.data;
  },
};
