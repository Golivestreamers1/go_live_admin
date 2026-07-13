import api from './api';

export const iconRecruiterService = {
  async getApplications(params = {}) {
    const { page = 1, limit = 20, status = 'all', search } = params;
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status: status || 'all',
      ...(search && String(search).trim() ? { search: String(search).trim() } : {}),
    });
    const response = await api.get(`/admin/icon-recruiter/applications?${queryParams}`);
    return response.data.data;
  },

  async reviewApplication(id, payload) {
    const response = await api.patch(`/admin/icon-recruiter/applications/${id}`, payload);
    return response.data.data;
  },

  async getHosts(recruiterId) {
    const response = await api.get(`/admin/icon-recruiter/${recruiterId}/hosts`);
    return response.data.data;
  },

  /** Admin icon recruiter page — register user pre-verified (no OTP). */
  async registerVerifiedUser({ name, email, password, referralCode }) {
    const payload = {
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password,
    };
    if (referralCode?.trim()) {
      payload.referralCode = referralCode.trim().toUpperCase();
    }
    const response = await api.post('/admin/icon-recruiter/register-user', payload);
    return response.data;
  },
};
