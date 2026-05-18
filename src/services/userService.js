import api from './api';

export const userService = {
  async getAllUsers(params = {}) {
    const { page = 1, limit = 10, role, search } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(role && { role }),
      ...(search && { search })
    });

    const response = await api.get(`/admin/users?${queryParams}`);
    return response.data.data; // Unwrap to return inner data object
  },

  async getUserById(id) {
    const response = await api.get(`/admin/users/${id}`);
    return response.data.data; // Unwrap to return inner data object
  },

  async createUser(userData) {
    const response = await api.post('/admin/users', userData);
    return response.data.data; // Unwrap to return inner data object
  },

  async updateUser(id, userData) {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data.data; // Unwrap to return inner data object
  },

  async resetPassword(id) {
    const response = await api.patch(`/admin/users/${id}/reset-password`);
    return response.data.data;
  },

  async deleteUser(id) {
    await api.delete(`/admin/users/${id}`);
  },

  async blockUser(id, options = {}) {
    const response = await api.patch(`/admin/users/${id}/block`, options);
    return response.data.data;
  },

  async unblockUser(id) {
    const response = await api.patch(`/admin/users/${id}/unblock`);
    return response.data.data;
  },

  async setVerification(id, isVerified) {
    const response = await api.patch(`/admin/users/${id}/verify`, { isVerified });
    return response.data.data;
  },

  async getUserOverview(id) {
    const response = await api.get(`/admin/users/${id}/overview`);
    return response.data.data;
  },

  async getUserPurchases(id, { page = 1, limit = 20 } = {}) {
    const response = await api.get(
      `/admin/users/${id}/purchases?page=${page}&limit=${limit}`
    );
    return response.data.data;
  },

  async getUserTransactions(id, { page = 1, limit = 25, type } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(type ? { type } : {}),
    });
    const response = await api.get(`/admin/users/${id}/transactions?${params}`);
    return response.data.data;
  },

  async getUserWithdrawals(id, { page = 1, limit = 20, status } = {}) {
    const params = new URLSearchParams({
      userId: id,
      page: String(page),
      limit: String(limit),
      ...(status ? { status } : {}),
    });
    const response = await api.get(`/admin/withdraw-requests?${params}`);
    return response.data.data;
  },

  async verifyPayPalOrder(userId, orderId) {
    const response = await api.post(`/admin/users/${userId}/paypal/verify`, {
      orderId,
    });
    return response.data.data;
  },

  async reconcilePayPalOrder(userId, orderId) {
    const response = await api.post(`/admin/users/${userId}/paypal/reconcile`, {
      orderId,
    });
    return response.data.data;
  },

  async getLifetimeRubiesAudit(userId) {
    const response = await api.get(`/admin/users/${userId}/lifetime-rubies-audit`);
    return response.data.data;
  },

  async reconcileLifetimeRubies(userId) {
    const response = await api.post(`/admin/users/${userId}/lifetime-rubies/reconcile`);
    return response.data.data;
  },

  async adjustUserCoins(userId, { direction, amount, reason }) {
    const response = await api.post(`/admin/users/${userId}/coins/adjust`, {
      direction,
      amount,
      reason,
    });
    return response.data.data;
  },

  async getUserAdminActions(userId, { page = 1, limit = 20 } = {}) {
    const response = await api.get(
      `/admin/users/${userId}/admin-actions?page=${page}&limit=${limit}`
    );
    return response.data.data;
  },

  async getUserActivity(userId, { from, to, granularity = 'day' } = {}) {
    const params = new URLSearchParams({ granularity });
    if (from) params.set('from', from instanceof Date ? from.toISOString() : String(from));
    if (to) params.set('to', to instanceof Date ? to.toISOString() : String(to));
    const response = await api.get(`/admin/users/${userId}/activity?${params}`);
    return response.data.data;
  },
};