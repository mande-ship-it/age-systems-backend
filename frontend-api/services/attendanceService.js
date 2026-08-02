import apiClient from '../axiosConfig';

const attendanceService = {
    recordAttendance: async (data) => {
        const response = await apiClient.post('/attendance/record', data);
        return response.data;
    },

    getHistory: async (filters) => {
        const response = await apiClient.get('/attendance/history', { params: filters });
        return response.data;
    },

    getSessionDetails: async (id) => {
        const response = await apiClient.get(`/attendance/session/${id}`);
        return response.data;
    },

    getAnalytics: async () => {
        const response = await apiClient.get('/attendance/analytics');
        return response.data;
    }
};

export default attendanceService;
