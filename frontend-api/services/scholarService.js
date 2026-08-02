import apiClient from '../axiosConfig';

const scholarService = {
    getAll: async () => {
        const response = await apiClient.get('/scholars');
        return response.data;
    },

    getById: async (id) => {
        const response = await apiClient.get(`/scholars/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await apiClient.post('/scholars', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await apiClient.put(`/scholars/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await apiClient.delete(`/scholars/${id}`);
        return response.data;
    },

    getAlumni: async () => {
        const response = await apiClient.get('/scholars/alumni');
        return response.data;
    },

    getStats: async () => {
        const response = await apiClient.get('/scholars/stats');
        return response.data;
    }
};

export default scholarService;
