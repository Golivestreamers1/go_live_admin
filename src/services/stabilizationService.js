import api from './api';

export const stabilizationService = {
  getNativeImagesMatrix: async () => {
    const response = await api.get('/admin/stabilization/native-images');
    return response.data.data;
  },

  getCameraMicStabilization: async () => {
    const response = await api.get('/admin/stabilization/camera-mic');
    return response.data.data;
  },

  getOptimizationImpact: async () => {
    const response = await api.get('/admin/stabilization/optimization-impact');
    return response.data.data;
  },
};

export default stabilizationService;
