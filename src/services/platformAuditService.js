import api from './api';

/** Platform Audit API client — new `/admin/platform-audit/*` endpoints (Phase 2+). */
const platformAuditService = {
  health: async () => {
    const response = await api.get('/admin/platform-audit/health');
    return response.data.data;
  },

  getDashboard: async (params) => {
    const response = await api.get('/admin/platform-audit/dashboard', { params });
    return response.data.data;
  },

  getCoinLedger: async (params) => {
    const response = await api.get('/admin/platform-audit/coin-ledger', { params });
    return response.data.data;
  },

  getRubyLedger: async (params) => {
    const response = await api.get('/admin/platform-audit/ruby-ledger', { params });
    return response.data.data;
  },

  getPurchases: async (params) => {
    const response = await api.get('/admin/platform-audit/purchases', { params });
    return response.data.data;
  },

  getPurchaseDetail: async (id) => {
    const response = await api.get(`/admin/platform-audit/purchases/${id}`);
    return response.data.data;
  },

  getStreamSettlements: async (params) => {
    const response = await api.get('/admin/platform-audit/stream-settlements', { params });
    return response.data.data;
  },

  getStreamSettlementDetail: async (streamId) => {
    const response = await api.get(`/admin/platform-audit/stream-settlements/${streamId}`);
    return response.data.data;
  },

  getWithdrawals: async (params) => {
    const response = await api.get('/admin/platform-audit/withdrawals', { params });
    return response.data.data;
  },

  getReferrals: async (params) => {
    const response = await api.get('/admin/platform-audit/referrals', { params });
    return response.data.data;
  },

  getReferralDetail: async (id, recordType) => {
    const response = await api.get(`/admin/platform-audit/referrals/${id}`, {
      params: recordType ? { recordType } : undefined,
    });
    return response.data.data;
  },

  getAdminActions: async (params) => {
    const response = await api.get('/admin/platform-audit/admin-actions', { params });
    return response.data.data;
  },

  getAdminActionDetail: async (id) => {
    const response = await api.get(`/admin/platform-audit/admin-actions/${id}`);
    return response.data.data;
  },

  getFraud: (params) => api.get('/admin/platform-audit/fraud', { params }),

  /** Uses existing reconciliation API until platform-audit proxy is added. */
  getReconciliationSummary: () => api.get('/admin/reconciliation/summary'),

  getReconciliationHistory: (params) => api.get('/admin/reconciliation/history', { params }),

  searchUsers: (q) => api.get('/admin/platform-audit/users/search', { params: { q } }),

  getBalanceProof: (userId) => api.get(`/admin/platform-audit/users/${userId}/balance-proof`),

  investigate: (q) => api.get('/admin/platform-audit/investigate', { params: { q } }),

  getAuditLogs: (params) => api.get('/admin/platform-audit/audit-logs', { params }),

  getSettings: () => api.get('/admin/platform-audit/settings'),

  updateSettings: (payload) => api.patch('/admin/platform-audit/settings', payload),
};

export default platformAuditService;
