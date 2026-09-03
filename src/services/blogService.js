import api from './api';

const BASE = '/admin/blogs';
const CATEGORY_BASE = '/admin/blog-categories';

export const blogService = {
  async listPosts(params = {}) {
    const { data } = await api.get(BASE, { params });
    return data?.data ?? { blogs: [], pagination: {} };
  },

  async getPost(id) {
    const { data } = await api.get(`${BASE}/${id}`);
    return data?.data?.blog ?? null;
  },

  async createPost(body) {
    const { data } = await api.post(BASE, body);
    return data?.data?.blog ?? null;
  },

  async updatePost(id, body) {
    const { data } = await api.put(`${BASE}/${id}`, body);
    return data?.data?.blog ?? null;
  },

  async setStatus(id, body) {
    const { data } = await api.patch(`${BASE}/${id}/status`, body);
    return data?.data?.blog ?? null;
  },

  async setFeatured(id, body) {
    const { data } = await api.patch(`${BASE}/${id}/featured`, body);
    return data?.data?.blog ?? null;
  },

  async deletePost(id) {
    await api.delete(`${BASE}/${id}`);
    return { _id: id };
  },

  /** Returns { slug, available } for the normalized slug. */
  async checkSlug(slug, excludeId) {
    const { data } = await api.get(`${BASE}/slug-available`, {
      params: { slug, ...(excludeId ? { excludeId } : {}) },
    });
    return data?.data ?? { slug, available: false };
  },

  /**
   * Uploads an image and returns { url, previewUrl }. Store `url` on the post;
   * `previewUrl` is a short-lived link only good for showing a thumbnail.
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`${BASE}/upload-image`, formData);
    return data?.data ?? { url: null, previewUrl: null };
  },
};

export const blogCategoryService = {
  async getCategories() {
    const { data } = await api.get(CATEGORY_BASE);
    return data?.data?.categories ?? [];
  },

  async createCategory(body) {
    const { data } = await api.post(CATEGORY_BASE, body);
    return data?.data?.category ?? null;
  },

  async updateCategory(id, body) {
    const { data } = await api.put(`${CATEGORY_BASE}/${id}`, body);
    return data?.data?.category ?? null;
  },

  /** `reassignTo` moves posts off the category so it can be removed. */
  async deleteCategory(id, reassignTo) {
    await api.delete(`${CATEGORY_BASE}/${id}`, {
      params: reassignTo ? { reassignTo } : undefined,
    });
    return { _id: id };
  },
};
