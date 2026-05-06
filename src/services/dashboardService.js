import api from './api';

export const dashboardService = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data.data; // Unwrap to return inner data object
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  },

  // Get recent activity
  getActivity: async (limit = 10) => {
    try {
      const response = await api.get(`/dashboard/activity?limit=${limit}`);
      return response.data.data; // Unwrap array
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      throw error;
    }
  },

  // Get system metrics
  getMetrics: async () => {
    try {
      const response = await api.get('/dashboard/metrics');
      const metrics = response.data.data;

      // Backend provides all fields directly - no mapping needed
      return {
        databaseSize: metrics.databaseSize,
        activeSessions: metrics.activeSessions,
        apiRequestsPerHour: metrics.apiRequestsPerHour,
        averageResponse: metrics.averageResponse // Backend provides this field
      };
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      throw error;
    }
  },

  // Live snapshot: active streams, current viewers, top streams
  getLive: async () => {
    const response = await api.get('/dashboard/live');
    return response.data.data;
  },

  // All-time / range stream totals + peaks + averages
  getStreamTotals: async () => {
    const response = await api.get('/dashboard/streams/totals');
    return response.data.data;
  },

  // Host metrics: CPU / RAM / disk / heap / event-loop / uptime
  getHost: async () => {
    const response = await api.get('/dashboard/host');
    return response.data.data;
  },

  // Mongo metrics
  getMongo: async () => {
    const response = await api.get('/dashboard/mongo');
    return response.data.data;
  },

  // Backblaze B2 metrics
  getB2: async () => {
    const response = await api.get('/dashboard/infra/b2');
    return response.data.data;
  },

  // Agora usage metrics
  getAgora: async () => {
    const response = await api.get('/dashboard/infra/agora');
    return response.data.data;
  },

  // Real threshold-based alerts
  getDashboardAlerts: async () => {
    const response = await api.get('/dashboard/alerts');
    return response.data.data;
  }
};

export default dashboardService;