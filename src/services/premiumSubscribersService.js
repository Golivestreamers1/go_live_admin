import api from './api';

export const premiumSubscribersService = {
  /**
   * Users who purchased the store Premium subscription (Google Play / App Store).
   * `status`: 'all' | 'active' | 'expired'.
   */
  async getPremiumSubscribers(params = {}) {
    const { page = 1, limit = 20, status = 'all', search } = params;
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status: status || 'all',
      ...(search && String(search).trim() ? { search: String(search).trim() } : {}),
    });
    const response = await api.get(`/admin/premium-subscribers?${queryParams}`);
    return response.data.data;
  },
};
