import apiClient from '../axiosConfig';

const aiService = {
    chat: async (message, currentPage = 'Global', targetId = null) => {
        const response = await apiClient.post('/ai/chat', {
            message,
            currentPage,
            targetId
        });
        return response.data;
    }
};

export default aiService;
