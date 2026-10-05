import api from "./api.js";

export const getUserJourney = async (userId = "", range = "24h", limit = 100, cursor = "", startDate = "", endDate = "") => {
  let url = `/admin/analytics/user-journey?limit=${limit}`;
  if (range) url += `&range=${range}`;
  if (userId) url += `&userId=${userId}`;
  if (cursor) url += `&cursor=${cursor}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  const response = await api.get(url);
  return response.data;
};

// { start, end } are YYYY-MM-DD Eastern days (inclusive); cohort is all | new | old.
// Without `action`, deferred actions come back with histogram: null — fetch each by key.
export const getRetention = async ({ start, end, cohort, action }) => {
  const response = await api.get("/admin/analytics/retention", { params: { start, end, cohort, action } });
  return response.data.data;
};
