import api from './api';

const BASE = '/admin/banners';

export const bannerService = {
  async list() {
    const { data } = await api.get(BASE);
    const payload = data?.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.list)) return payload.list;
    return [];
  },

  async create(body) {
    const { data } = await api.post(BASE, body);
    return data?.data;
  },

  async update(id, body) {
    const { data } = await api.put(`${BASE}/${id}`, body);
    return data?.data;
  },

  async remove(id) {
    await api.delete(`${BASE}/${id}`);
    return { _id: id };
  },

  async uploadImage(file) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(`${BASE}/upload-image`, form);
    return data?.data?.url || data?.data?.previewUrl || '';
  },
};
