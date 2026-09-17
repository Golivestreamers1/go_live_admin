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
};
