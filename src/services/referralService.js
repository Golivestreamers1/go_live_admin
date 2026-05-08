import api from './api';

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.set(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

const normalizeRange = ({ period, startDate, endDate }) => {
  const hasCustom = Boolean(startDate || endDate);
  return {
    ...(hasCustom ? {} : { period: period || 'all' }),
    ...(startDate ? { startDate: new Date(startDate).toISOString() } : {}),
    ...(endDate ? { endDate: new Date(endDate).toISOString() } : {}),
  };
};

export const referralService = {
  async getStats({ period, startDate, endDate } = {}) {
    const q = buildQuery(normalizeRange({ period, startDate, endDate }));
    const res = await api.get(`/admin/referrals/stats${q}`);
    return res.data.data;
  },

  async getTopReferrers({ page = 1, limit = 20, period, startDate, endDate, sort, search } = {}) {
    const q = buildQuery({
      page,
      limit,
      sort,
      ...(search ? { search: String(search).trim() } : {}),
      ...normalizeRange({ period, startDate, endDate }),
    });
    const res = await api.get(`/admin/referrals/top${q}`);
    return res.data.data;
  },

  async getLogs({
    page = 1,
    limit = 25,
    period,
    startDate,
    endDate,
    sort,
    search,
    referrerId,
    referredUserId,
  } = {}) {
    const q = buildQuery({
      page,
      limit,
      sort,
      ...(search ? { search: String(search).trim() } : {}),
      ...(referrerId ? { referrerId } : {}),
      ...(referredUserId ? { referredUserId } : {}),
      ...normalizeRange({ period, startDate, endDate }),
    });
    const res = await api.get(`/admin/referrals/logs${q}`);
    return res.data.data;
  },

  async getAttempts({ page = 1, limit = 25, period, startDate, endDate, status, search } = {}) {
    const q = buildQuery({
      page,
      limit,
      ...(status && status !== 'all' ? { status } : {}),
      ...(search ? { search: String(search).trim() } : {}),
      ...normalizeRange({ period, startDate, endDate }),
    });
    const res = await api.get(`/admin/referrals/attempts${q}`);
    return res.data.data;
  },

  async getReferrerDetails(referrerId, { page = 1, limit = 25, period, startDate, endDate } = {}) {
    const q = buildQuery({
      page,
      limit,
      ...normalizeRange({ period, startDate, endDate }),
    });
    const res = await api.get(`/admin/referrals/users/${referrerId}${q}`);
    return res.data.data;
  },
};
