import api from './api';

/** Test accounts: purchases excluded from Money Flow revenue. Backend: /admin/test-accounts */
export const testAccountService = {
  /** @returns {{ items, total, page, limit }} */
  async list({ page = 1, limit = 200 } = {}) {
    const response = await api.get('/admin/test-accounts', { params: { page, limit } });
    return response.data.data;
  },

  /** ref: user id, email or username */
  async add(ref, note = '') {
    const response = await api.post('/admin/test-accounts', { user: ref, note });
    return response.data.data;
  },

  /** ref: user id, email or username */
  async remove(ref) {
    const response = await api.delete(`/admin/test-accounts/${encodeURIComponent(ref)}`);
    return response.data.data;
  },
};
