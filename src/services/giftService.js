import api from './api';

const BASE = '/admin/gifts';

export const giftService = {
  async getGifts() {
    const { data } = await api.get(BASE);
    return data?.data ?? [];
  },

  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`${BASE}/upload-image`, formData);
    return data?.data ?? { url: null, previewUrl: null };
  },

  /** Lottie JSON (.json), GIF / WebP / PNG / JPEG, or MP4 / MOV / WebM — stored as gift.animationUrl */
  async uploadAnimation(file) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`${BASE}/upload-animation`, formData);
    return data?.data ?? { url: null, previewUrl: null };
  },

  async createGift(body) {
    const { data } = await api.post(BASE, body);
    return data?.data;
  },

  async updateGift(id, body) {
    const { data } = await api.put(`${BASE}/${id}`, body);
    return data?.data;
  },

  async deleteGift(id) {
    await api.delete(`${BASE}/${id}`);
    return { _id: id };
  },
};
