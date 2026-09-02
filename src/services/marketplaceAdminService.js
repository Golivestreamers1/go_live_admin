import api from './api';

export const marketplaceAdminService = {
  async getCostEntries() {
    const response = await api.get('/admin/marketplace/cost-entries');
    return response.data.data;
  },

  async saveCostEntry({ blueprintId, printProviderId, size, costCents }) {
    const response = await api.put('/admin/marketplace/cost-entries', {
      blueprintId,
      printProviderId,
      size,
      costCents,
    });
    return response.data.data;
  },

  async deleteCostEntry(id) {
    const response = await api.delete(`/admin/marketplace/cost-entries/${id}`);
    return response.data;
  },

  async getSettings() {
    const response = await api.get('/admin/marketplace/settings');
    return response.data.data;
  },

  async updateSettings({ platformMarkupPct, vendorMarkupCapPct }) {
    const response = await api.patch('/admin/marketplace/settings', {
      platformMarkupPct,
      vendorMarkupCapPct,
    });
    return response.data.data;
  },

  async getOrders(params = {}) {
    const { page = 1, limit = 20, status, vendorId } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(vendorId && { vendorId }),
    });
    const response = await api.get(`/admin/marketplace/orders?${queryParams}`);
    return response.data.data;
  },

  async getEarnings(params = {}) {
    const { startDate, endDate } = params;
    const queryParams = new URLSearchParams({
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    });
    const response = await api.get(`/admin/marketplace/earnings?${queryParams}`);
    return response.data.data;
  },
};
