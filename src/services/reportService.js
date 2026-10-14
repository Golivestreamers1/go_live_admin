import api from './api';

export const reportService = {
  async getReportedUsers(params = {}) {
    const { page = 1, limit = 10, status } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    const response = await api.get(`/admin/reports/users?${queryParams}`);
    return response.data.data;
  },

  async getReportedPosts(params = {}) {
    const { page = 1, limit = 10, status } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    const response = await api.get(`/admin/reports/posts?${queryParams}`);
    return response.data.data;
  },

  async deleteUser(id) {
    await api.delete(`/admin/users/${id}`);
  },

  async deletePost(id) {
    await api.delete(`/admin/posts/${id}`);
  },

  /**
   * Admin action on a reported post. Cascades the status to every other pending report
   * pointing at the same post so one click resolves duplicate reports together.
   * `status` must be "reviewed" or "dismissed".
   */
  async setReportStatus(reportId, status) {
    await api.patch(`/admin/reports/posts/${reportId}`, { status });
  },
};
