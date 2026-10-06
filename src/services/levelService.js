import api from './api';
import { giftService } from './giftService';

const BASE = '/admin/levels';

export const levelService = {
  async getLevels() {
    const { data } = await api.get(BASE);
    return data?.data ?? { seeded: false, levels: [], tiers: [], totalXpToLevel100: 0 };
  },

  async updateLevel(level, body) {
    const { data } = await api.patch(`${BASE}/${level}`, body);
    return data?.data;
  },

  async saveTiers(tiers) {
    const { data } = await api.put(`${BASE}/tiers`, { tiers });
    return data?.data;
  },

  uploadVideo: (file) => giftService.uploadAnimation(file),
};
