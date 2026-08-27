import api from "./api";

/**
 * Read-only ledger reconciliation.
 *
 * Every endpoint here is a GET and nothing it calls writes to the database.
 * The range contract is shared with the backend: presets, plus `custom` with
 * `from`/`to` as plain calendar dates. A calendar `to` covers that whole day —
 * the server converts it to an exclusive bound, so callers never do date maths.
 */
const financeAuditService = {
  /**
   * @param {object} params
   * @param {string} [params.range]   all | today | 7d | 30d | this_month | last_month | ytd | custom
   * @param {string} [params.from]    YYYY-MM-DD, custom range only
   * @param {string} [params.to]      YYYY-MM-DD, custom range only (inclusive of that day)
   * @param {string[]} [params.only]  run a subset of checks
   * @param {boolean} [params.refresh] bypass the 15-minute server cache
   */
  async getAudit({ range = "all", from, to, only, refresh } = {}) {
    const response = await api.get("/admin/finance/audit", {
      params: {
        range,
        from: range === "custom" ? from || undefined : undefined,
        to: range === "custom" ? to || undefined : undefined,
        only: only && only.length ? only.join(",") : undefined,
        refresh: refresh ? 1 : undefined,
      },
    });
    return response.data.data;
  },

  /** The full money-flow picture: buying → gifting → cash-out → conversion. */
  async getFlow({ range = "all", from, to, refresh } = {}) {
    const response = await api.get("/admin/finance/flow", {
      params: {
        range,
        from: range === "custom" ? from || undefined : undefined,
        to: range === "custom" ? to || undefined : undefined,
        refresh: refresh ? 1 : undefined,
      },
    });
    return response.data.data;
  },

  /** Money tracking report for a date range. */
  async getTracking({ range = "all", from, to, buckets, refresh } = {}) {
    const response = await api.get("/admin/finance/tracking", {
      params: {
        range,
        from: range === "custom" ? from || undefined : undefined,
        to: range === "custom" ? to || undefined : undefined,
        buckets: buckets && buckets.length ? buckets.join(",") : undefined,
        refresh: refresh ? 1 : undefined,
      },
    });
    return response.data.data;
  },

  /** The same report as a CSV file. Returns a Blob. */
  async exportTrackingCsv({ range = "all", from, to, buckets } = {}) {
    const response = await api.get("/admin/finance/tracking/export.csv", {
      params: {
        range,
        from: range === "custom" ? from || undefined : undefined,
        to: range === "custom" ? to || undefined : undefined,
        buckets: buckets && buckets.length ? buckets.join(",") : undefined,
      },
      responseType: "blob",
    });
    return response.data;
  },

  /** Follow one payment: username, email, store receipt, PayPal id or withdrawal id. */
  async trace(query) {
    const response = await api.get("/admin/finance/trace", { params: { query } });
    return response.data.data;
  },

  /** One named check, for drill-through. */
  async getCheck(check, { range = "all", from, to, refresh } = {}) {
    const response = await api.get(`/admin/finance/audit/${check}`, {
      params: {
        range,
        from: range === "custom" ? from || undefined : undefined,
        to: range === "custom" ? to || undefined : undefined,
        refresh: refresh ? 1 : undefined,
      },
    });
    return response.data.data;
  },
};

export default financeAuditService;
