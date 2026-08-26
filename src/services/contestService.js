import api from './api';

const BASE = '/admin/contests';

export const contestService = {
  async getContests(params = {}) {
    const { data } = await api.get(BASE, { params });
    return data?.data ?? { contests: [], pagination: {} };
  },

  /** Returns { contest, standings } — standings is { total, page, limit, list }. */
  async getContest(id, params = {}) {
    const { data } = await api.get(`${BASE}/${id}`, { params });
    return data?.data;
  },

  async getLeaderboard(id, params = {}) {
    const { data } = await api.get(`${BASE}/${id}/leaderboard`, { params });
    return data?.data ?? { total: 0, page: 1, limit: 20, list: [] };
  },

  async createContest(body) {
    const { data } = await api.post(BASE, body);
    return data?.data;
  },

  async updateContest(id, body) {
    const { data } = await api.put(`${BASE}/${id}`, body);
    return data?.data;
  },

  async deleteContest(id) {
    await api.delete(`${BASE}/${id}`);
    return { _id: id };
  },

  async finalizeContest(id) {
    const { data } = await api.post(`${BASE}/${id}/finalize`);
    return data?.data;
  },

  /** Manually pay out the coin prize for one rank of a finalized contest. */
  async disbursePrize(id, rank) {
    const { data } = await api.post(`${BASE}/${id}/prizes/${rank}/disburse`);
    return data?.data;
  },

  /** App-wide stream-time stats over [start, end). */
  async getStreamTimeStats(params = {}) {
    const { data } = await api.get('/admin/stream-time-stats', { params });
    return data?.data ?? { totalMs: 0, streamCount: 0, streamerCount: 0, list: [] };
  },
};
