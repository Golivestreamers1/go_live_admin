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
  getReconciliationSummary: async () => {
    const response = await api.get('/admin/reconciliation/summary');
    return response.data.data;
  },

  getReconciliationHistory: async (params) => {
    const response = await api.get('/admin/reconciliation/history', { params });
    return response.data.data;
  },

  searchUsers: async (q) => {
    const response = await api.get('/admin/platform-audit/users/search', { params: { q } });
    return response.data.data;
  },

  getBalanceProof: async (userId) => {
    const response = await api.get(`/admin/platform-audit/users/${userId}/balance-proof`);
    return response.data.data;
  },

  investigate: async (q) => {
    const response = await api.get('/admin/platform-audit/investigate', { params: { q } });
    return response.data.data;
  },

  getAuditLogs: async (params) => {
    const response = await api.get('/admin/platform-audit/audit-logs', { params });
    return response.data.data;
  },

  getAlerts: async (params) => {
    const response = await api.get('/admin/platform-audit/alerts', { params });
    return response.data.data;
  },

  getAlert: async (id) => {
    const response = await api.get(`/admin/platform-audit/alerts/${id}`);
    return response.data.data;
  },

  updateAlert: async (id, payload) => {
    const response = await api.patch(`/admin/platform-audit/alerts/${id}`, payload);
    return response.data.data;
  },

  generateReport: async (payload) => {
    const response = await api.post('/admin/platform-audit/reports/generate', payload);
    return response.data.data;
  },

  listReports: async (params) => {
    const response = await api.get('/admin/platform-audit/reports', { params });
    return response.data.data;
  },

  getReport: async (id) => {
    const response = await api.get(`/admin/platform-audit/reports/${id}`);
    return response.data.data;
  },

  downloadReportCsv: async (id, title = 'report') => {
    const response = await api.get(`/admin/platform-audit/reports/${id}/download`, {
      params: { format: 'csv' },
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = String(title).replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
    link.download = `${safeTitle}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getSettings: async () => {
    const response = await api.get('/admin/platform-audit/settings');
    return response.data.data;
  },

  updateSettings: async (payload) => {
    const response = await api.patch('/admin/platform-audit/settings', payload);
    return response.data.data;
  },

  /** Quick platform-economy CSV export from dashboard (Phase 7.4). */
  exportDashboardReport: async (dateRange) => {
    const payload = { type: 'platform-economy' };
    if (dateRange?.from) payload.from = dateRange.from;
    if (dateRange?.to) payload.to = dateRange.to;
    const gen = await api.post('/admin/platform-audit/reports/generate', payload);
    const report = gen.data.data;
    const response = await api.get(`/admin/platform-audit/reports/${report.id}/download`, {
      params: { format: 'csv' },
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'platform-economy.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return report;
  },
};

export default platformAuditService;
