import api from './api';

const qs = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === '') return;
    query.set(k, String(v));
  });
  const s = query.toString();
  return s ? `?${s}` : '';
};

export const agencyAdminService = {
  async getRequests(params = {}) {
    const { page = 1, limit = 20, status = 'pending', search } = params;
    const response = await api.get(
      `/admin/agencies/requests${qs({ page, limit, status, search })}`
    );
    return response.data.data;
  },

  async reviewRequest(id, payload) {
    const response = await api.patch(`/admin/agencies/requests/${id}`, payload);
    return response.data.data;
  },

  async listAgencies(params = {}) {
    const response = await api.get(`/admin/agencies${qs(params)}`);
    return response.data.data;
  },

  async getAgency(agencyId) {
    const response = await api.get(`/admin/agencies/${agencyId}`);
    return response.data.data;
  },

  async getMembers(agencyId, params = {}) {
    const response = await api.get(`/admin/agencies/${agencyId}/members${qs(params)}`);
    return response.data.data;
  },

  async getAnalytics(agencyId) {
    const response = await api.get(`/admin/agencies/${agencyId}/analytics`);
    return response.data.data;
  },

  async getWallet(agencyId) {
    const response = await api.get(`/admin/agencies/${agencyId}/wallet`);
    return response.data.data;
  },

  async getWithdrawals(agencyId, params = {}) {
    const response = await api.get(
      `/admin/agencies/${agencyId}/withdrawals${qs(params)}`
    );
    return response.data.data;
  },

  async getAuditLogs(agencyId, params = {}) {
    const response = await api.get(
      `/admin/agencies/${agencyId}/audit-logs${qs(params)}`
    );
    return response.data.data;
  },

  async suspendAgency(agencyId, payload = {}) {
    const response = await api.patch(`/admin/agencies/${agencyId}/suspend`, payload);
    return response.data.data;
  },

  async reactivateAgency(agencyId, payload = {}) {
    const response = await api.patch(
      `/admin/agencies/${agencyId}/reactivate`,
      payload
    );
    return response.data.data;
  },

  async listAllWithdrawals(params = {}) {
    const response = await api.get(`/admin/agencies/withdrawals${qs(params)}`);
    return response.data.data;
  },

  async approveWithdrawal(requestId, payload = {}) {
    const response = await api.post(
      `/admin/agencies/withdrawals/${requestId}/approve`,
      payload
    );
    return response.data.data;
  },

  async rejectWithdrawal(requestId, payload = {}) {
    const response = await api.post(
      `/admin/agencies/withdrawals/${requestId}/reject`,
      payload
    );
    return response.data.data;
  },
};
