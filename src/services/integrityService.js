import api from './api';

const integrityService = {
  async getSummary() {
    const response = await api.get('/admin/integrity/summary');
    return response.data.data;
  },

  async getFlaggedUsers(params = {}) {
    const { page = 1, limit = 20, flag, confidence } = params;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(flag && { flag }),
      ...(confidence && { confidence }),
    });
    const response = await api.get(`/admin/integrity/users?${query}`);
    return response.data.data;
  },

  async getHistory(days = 30) {
    const response = await api.get(`/admin/integrity/history?days=${days}`);
    return response.data.data;
  },
};

export default integrityService;
