import api from "./api";

export const promoService = {
  createPromoCode: async (data) => {
    const res = await api.post("/promo-code/admin/create", data);
    return res.data.data;
  },
  listPromoCodes: async (params) => {
    const res = await api.get("/promo-code/admin/list", { params });
    return res.data.data;
  },
  getRandomCode: async () => {
    const res = await api.get("/promo-code/admin/random-code");
    return res.data.data.code;
  },
  getPromoDetails: async (id, params) => {
    const res = await api.get(`/promo-code/admin/details/${id}`, { params });
    return res.data.data;
  },
  updatePromoCode: async (id, data) => {
    const res = await api.put(`/promo-code/admin/update/${id}`, data);
    return res.data?.data || res.data;
  },
  togglePromoStatus: async (id) => {
    const res = await api.patch(`/promo-code/admin/toggle-status/${id}`);
    return res.data?.data || res.data;
  },
  deletePromoCode: async (id) => {
    const res = await api.delete(`/promo-code/admin/delete/${id}`);
    return res.data?.data || res.data;
  },
};
