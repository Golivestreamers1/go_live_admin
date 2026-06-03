import api from './api';

const BASE = '/admin/stream-settings';

export const streamSettingsService = {
  async getSettings() {
    const { data } = await api.get(BASE);
    return data?.data;
  },

  async updateSettings(body) {
    const { data } = await api.patch(BASE, body);
    return data?.data;
  },
};
