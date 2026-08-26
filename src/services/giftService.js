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

  /** Lottie JSON (.json), GIF / WebP / PNG / JPEG, MP4 / MOV / WebM, or platform videos (videoUrlIos / videoUrlAndroid). */
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

  // ── Gift asset processing (color + alpha → Android/iOS/thumbnail → preview → approve) ──
  /** Upload the two source videos; backend runs FFmpeg in the background. Returns { processingId }. */
  async processGift({
    colorFile,
    alphaFile,
    name,
    coinValue,
    category,
    heroHeightPercent,
    animationDurationSec,
  }) {
    const fd = new FormData();
    fd.append('color_input', colorFile);
    fd.append('alpha_input', alphaFile);
    if (name != null) fd.append('name', name);
    if (coinValue != null) fd.append('coinValue', String(coinValue));
    if (category) fd.append('category', category);
    if (heroHeightPercent != null && heroHeightPercent !== '') {
      fd.append('heroHeightPercent', String(heroHeightPercent));
    }
    if (animationDurationSec != null && animationDurationSec !== '') {
      fd.append('animationDurationSec', String(animationDurationSec));
    }
    // Large color+alpha uploads to a remote API can take minutes; don't use the default axios timeout.
    const { data } = await api.post(`${BASE}/process`, fd, {
      timeout: 180_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return data?.data;
  },

  async getProcessingStatus(processingId) {
    const { data } = await api.get(`${BASE}/process/${processingId}`);
    return data?.data;
  },

  async approveProcessing(processingId) {
    const { data } = await api.post(`${BASE}/process/${processingId}/approve`);
    return data?.data;
  },

  async rejectProcessing(processingId) {
    const { data } = await api.post(`${BASE}/process/${processingId}/reject`);
    return data?.data;
  },

  async getCategories() {
    const { data } = await api.get(`${BASE}/categories`);
    return data?.data ?? { categories: [] };
  },

  async saveCategories(categories) {
    const { data } = await api.put(`${BASE}/categories`, { categories });
    return data?.data ?? { categories: [] };
  },
};
