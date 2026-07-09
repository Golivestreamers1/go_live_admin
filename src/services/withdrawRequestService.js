import api from './api';

export const withdrawRequestService = {
  async getWithdrawRequests(params = {}) {
    const { page = 1, limit = 20, status, search } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(search && { search }),
    });
    const response = await api.get(`/admin/withdraw-requests?${queryParams}`);
    return response.data.data;
  },

  async approveRequest(id, adminNotes = null) {
    const response = await api.patch(`/admin/withdraw-requests/${id}/approve`, { adminNotes });
    return response.data;
  },

  async rejectRequest(id, adminNotes = null) {
    const response = await api.patch(`/admin/withdraw-requests/${id}/reject`, { adminNotes });
    return response.data;
  },

  async getRequestById(id) {
    const response = await api.get(`/admin/withdraw-requests/${id}`);
    return response.data.data;
  },

  async getAudit(id) {
    const response = await api.get(`/admin/withdraw-requests/${id}/audit`);
    return response.data.data;
  },

  async deleteRequest(id) {
    const response = await api.delete(`/admin/withdraw-requests/${id}`);
    return response.data;
  },
};
