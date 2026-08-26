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

  async getReferrerDetails(
    referrerId,
    {
      page = 1,
      limit = 25,
      period,
      startDate,
      endDate,
      rewardStatus,
      listPeriod,
    } = {},
  ) {
    const q = buildQuery({
      page,
      limit,
      ...(rewardStatus && rewardStatus !== 'all' ? { rewardStatus } : {}),
      ...(listPeriod && listPeriod !== 'selected' ? { listPeriod } : {}),
      ...normalizeRange({ period, startDate, endDate }),
    });
    const res = await api.get(`/admin/referrals/users/${referrerId}${q}`);
    return res.data.data;
  },

  async getPending({ page = 1, limit = 25, search, status = 'pending', live = false } = {}) {
    const q = buildQuery({
      page,
      limit,
      status,
      ...(live ? { live: 'true' } : {}),
      ...(search ? { search: String(search).trim() } : {}),
    });
    const res = await api.get(`/admin/referrals/pending${q}`);
    return res.data.data;
  },

  async getJourney(referredUserId) {
    const res = await api.get(`/admin/referrals/journey/${referredUserId}`);
    return res.data.data;
  },

  async getUserReferrals(userId, { page = 1, limit = 20 } = {}) {
    const q = buildQuery({ page, limit });
    const res = await api.get(`/admin/users/${userId}/get/referrals${q}`);
    return res.data.data;
  },
};
