import api from './api';

export const appUpdateService = {
  getSettings: async () => {
    const response = await api.get('/admin/config/app-update');
    return response.data.data;
  },

  updateSettings: async (settings) => {
    const response = await api.patch('/admin/config/app-update', settings);
    return response.data.data;
  },
};
