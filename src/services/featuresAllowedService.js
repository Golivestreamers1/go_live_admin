import api from './api';

export const featuresAllowedService = {
  getSettings: async () => {
    const response = await api.get('/admin/features-allowed/settings');
    return response.data.data;
  },

  updateSettings: async (settings) => {
    const response = await api.post('/admin/features-allowed/settings', settings);
    return response.data.data;
  },
};
