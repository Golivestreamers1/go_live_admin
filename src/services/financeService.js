import api from "./api";

const financeService = {
  /**
   * @param {object} params
   * @param {string} [params.from]     ISO date
   * @param {string} [params.to]       ISO date
   * @param {'month'|'day'} [params.groupBy]
   * @param {string[]} [params.buckets] revenue buckets to count in the headline
   */
  async getOverview({ from, to, groupBy = "month", buckets } = {}) {
    const response = await api.get("/admin/finance/overview", {
      params: {
        from: from || undefined,
        to: to || undefined,
        groupBy,
        buckets: buckets && buckets.length ? buckets.join(",") : undefined,
      },
    });
    return response.data.data;
  },
};

export default financeService;
