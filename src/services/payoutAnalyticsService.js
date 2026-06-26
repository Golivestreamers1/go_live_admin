import api from "./api";

export const payoutAnalyticsService = {
  async getStreamers(params = {}) {
    const response = await api.get("/admin/payout-analytics/streamers", { params });
    return response.data.data;
  },

  async getStreamerDetails(streamerId, params = {}) {
    const response = await api.get(`/admin/payout-analytics/streamers/${streamerId}`, {
      params,
    });
    return response.data.data;
  },

  async getGifterDetails(gifterId, params = {}) {
    const response = await api.get(`/admin/payout-analytics/gifters/${gifterId}`, { params });
    return response.data.data;
  },

  async getGifterRecipientsByEmail(email, params = {}) {
    const response = await api.get("/admin/payout-analytics/gifters/recipients", {
      params: { email, ...params },
    });
    return response.data.data;
  },

  async getStreamDetails(streamId) {
    const response = await api.get(`/admin/payout-analytics/streams/${streamId}`);
    return response.data.data;
  },

  async rejectGiftTransaction(giftId, reason) {
    const response = await api.patch(`/admin/payout-analytics/gifts/${giftId}/reject`, { reason });
    return response.data.data;
  },

  async rejectAllStreamGiftTransactions(streamId, reason) {
    const response = await api.patch(`/admin/payout-analytics/streams/${streamId}/reject-all-gifts`, {
      reason,
    });
    return response.data.data;
  },

  async rejectStreamGiftTransactionsByGifters(streamId, gifterIds, reason) {
    const response = await api.patch(
      `/admin/payout-analytics/streams/${streamId}/reject-gifts-by-gifters`,
      {
        gifterIds,
        reason,
      }
    );
    return response.data.data;
  },

  // Unassigned (unsettled) stream rubies — reconciliation + manual assignment.
  async getStreamerUnassignedRubies(streamerId) {
    const response = await api.get(
      `/admin/payout-analytics/streamers/${streamerId}/unassigned-rubies`
    );
    return response.data.data;
  },

  async assignStreamRubies(streamerId, streamId, reason) {
    const response = await api.post(
      `/admin/payout-analytics/streamers/${streamerId}/streams/${streamId}/assign-rubies`,
      { reason }
    );
    return response.data.data;
  },

  async assignAllStreamerRubies(streamerId, reason) {
    const response = await api.post(
      `/admin/payout-analytics/streamers/${streamerId}/assign-all-rubies`,
      { reason }
    );
    return response.data.data;
  },

  // Transfer unassigned rubies (+ stream/gift records) to ANOTHER user by email.
  async transferStreamRubies(streamerId, streamId, { email, reason }) {
    const response = await api.post(
      `/admin/payout-analytics/streamers/${streamerId}/streams/${streamId}/transfer-rubies`,
      { email, reason }
    );
    return response.data.data;
  },

  async transferAllStreamerRubies(streamerId, { email, reason }) {
    const response = await api.post(
      `/admin/payout-analytics/streamers/${streamerId}/transfer-all-rubies`,
      { email, reason }
    );
    return response.data.data;
  },
};

export default payoutAnalyticsService;
