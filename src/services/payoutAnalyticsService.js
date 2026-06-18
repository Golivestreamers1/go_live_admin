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
};

export default payoutAnalyticsService;
