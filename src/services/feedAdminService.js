import api from './api';

export const feedAdminService = {
  // Feed Algorithm Settings
  getAlgorithmConfig: async () => {
    const res = await api.get('/admin/feed-algorithm');
    return res.data?.data || res.data;
  },

  updateAlgorithmConfig: async (configData) => {
    const res = await api.put('/admin/feed-algorithm', configData);
    return res.data?.data || res.data;
  },

  simulateAlgorithm: async (simulationParams) => {
    const res = await api.post('/admin/feed-algorithm/simulate', simulationParams);
    return res.data?.data || res.data;
  },

  // Post Moderation & Score Management
  getPosts: async (params = {}) => {
    const res = await api.get('/admin/posts', { params });
    return res.data?.data || res.data;
  },

  adjustPostScore: async (postId, adjustment, reason = '') => {
    const res = await api.patch(`/admin/posts/${postId}/score`, {
      adjustment,
      reason,
    });
    return res.data?.data || res.data;
  },

  deletePost: async (postId) => {
    const res = await api.delete(`/admin/posts/${postId}`);
    return res.data?.data || res.data;
  },
};
