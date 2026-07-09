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

  getCoinLedger: (params) => api.get('/admin/platform-audit/coin-ledger', { params }),

  getRubyLedger: (params) => api.get('/admin/platform-audit/ruby-ledger', { params }),

  getPurchases: (params) => api.get('/admin/platform-audit/purchases', { params }),

  getStreamSettlements: (params) => api.get('/admin/platform-audit/stream-settlements', { params }),

  getWithdrawals: (params) => api.get('/admin/platform-audit/withdrawals', { params }),

  getReferrals: (params) => api.get('/admin/platform-audit/referrals', { params }),

  getAdminActions: (params) => api.get('/admin/platform-audit/admin-actions', { params }),

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
