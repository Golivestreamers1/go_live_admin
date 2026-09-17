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

  // Admin force-end a live stream
  endLiveStream: async (streamId) => {
    const response = await api.post(`/admin/live-streams/${streamId}/end`);
    return response.data.data;
  },

  // Full active stream rows for moderation page
  getActiveLiveStreams: async () => {
    const response = await api.get('/admin/live-streams/active');
    return response.data.data;
  },

  searchStreamers: async (q) => {
    const response = await api.get(`/admin/users?search=${encodeURIComponent(q)}&limit=8`);
    return response.data.data?.users || [];
  },

  // Stream order management
  getStreamOrderConfig: async () => {
    const response = await api.get('/admin/stream-order/pinned');
    return response.data.data;
  },
  getStreamSchedules: async () => {
    const response = await api.get('/admin/stream-order/schedules');
    return response.data.data;
  },
  createStreamSchedule: async ({ streamerId, priority, startsAt, endsAt }) => {
    const response = await api.post('/admin/stream-order/schedules', { streamerId, priority, startsAt, endsAt });
    return response.data.data;
  },
  deleteStreamSchedule: async (id) => {
    const response = await api.delete(`/admin/stream-order/schedules/${id}`);
    return response.data.data;
  },
  pinManualStream: async (streamerId, priority) => {
    const response = await api.put('/admin/stream-order/manual', { streamerId, priority });
    return response.data.data;
  },
  unpinStream: async (streamId) => {
    const response = await api.delete(`/admin/stream-order/pinned/${streamId}`);
    return response.data.data;
  },
  previewStreamOrder: async () => {
    const response = await api.get('/admin/stream-order/preview');
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