import api from './api';

const reconciliationService = {
  async getSummary({ fleetScan = false } = {}) {
    const qs = fleetScan ? '' : '?fleetScan=false';
    const response = await api.get(`/admin/reconciliation/summary${qs}`);
    return response.data.data;
  },
};

export default reconciliationService;
