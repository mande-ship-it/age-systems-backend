import apiClient from '../axiosConfig';

const academicService = {
    recordResults: async (data) => {
        const response = await apiClient.post('/academic/record', data);
        return response.data;
    },

    getScholarResults: async (scholarId, year) => {
        const response = await apiClient.get(`/academic/scholar/${scholarId}`, { params: { year } });
        return response.data;
    },

    getSubjects: async (level) => {
        const response = await apiClient.get('/academic/subjects', { params: { level } });
        return response.data;
    },

    getYearlyStats: async (year) => {
        const response = await apiClient.get(`/academic/stats/${year}`);
        return response.data;
    },

    getSchoolsWithResults: async () => {
        const response = await apiClient.get('/academic/schools-with-results');
        return response.data;
    }
};

export default academicService;
