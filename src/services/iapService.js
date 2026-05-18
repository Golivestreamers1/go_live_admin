import api from './api';

export const iapService = {
  getSettings: async () => {
    const response = await api.get('/admin/iap/settings');
    return response.data.data;
  },

  updateSettings: async (settings) => {
    const response = await api.post('/admin/iap/settings', settings);
    return response.data.data;
  },

  getTransactions: async (params) => {
    const response = await api.get('/admin/iap/transactions', { params });
    return response.data.data;
  },

  getPackages: async () => {
    const response = await api.get('/admin/iap/packages');
    return response.data.data;
  },

  createPackage: async (data) => {
    const response = await api.post('/admin/iap/packages', data);
    return response.data.data;
  },

  updatePackage: async (id, data) => {
    const response = await api.put(`/admin/iap/packages/${id}`, data);
    return response.data.data;
  },

  deletePackage: async (id) => {
    const response = await api.delete(`/admin/iap/packages/${id}`);
    return response.data.data;
  }
};
