import api from './api';

// API client for /api/v1/admin/fraud-cascade.
// Routes 404 when the backend FRAUD_CASCADE_ENABLED flag is off — callers
// surface that as "feature disabled" in the UI.

export const fraudCascadeService = {
  async list(params = {}) {
    const { status, page = 1, limit = 20 } = params;
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(status ? { status } : {}),
    });
    const res = await api.get(`/admin/fraud-cascade?${qs.toString()}`);
    return res.data.data;
  },

  async getById(id) {
    const res = await api.get(`/admin/fraud-cascade/${id}`);
    return res.data.data;
  },

  async plan({ rootTransactionId, reason, notifyAffectedUsers = true }) {
    const res = await api.post(`/admin/fraud-cascade/plan`, {
      rootTransactionId,
      reason,
      notifyAffectedUsers,
    });
    return res.data.data;
  },

  async execute(cascadeId) {
    const res = await api.post(`/admin/fraud-cascade/${cascadeId}/execute`);
    return res.data.data;
  },

  async undo(cascadeId, reason) {
    const res = await api.post(`/admin/fraud-cascade/${cascadeId}/undo`, {
      reason,
    });
    return res.data.data;
  },
};
