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

export const getCohortActions = async (data) => {
  const response = await api.post("/admin/analytics/cohort-actions", data);
  return response.data;
};
