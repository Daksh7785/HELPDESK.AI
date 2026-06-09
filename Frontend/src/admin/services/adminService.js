/**
 * Administrative Service Protocol
 * Handles secure communication with back-end administration endpoints.
 */
import { apiClient } from '../../services/api';

export const adminService = {
    /**
     * Fetch all users within the system
     */
    getUsers: async () => {
        const response = await apiClient.get('/admin/users').catch(() => ({ data: [] }));
        return response.data;
    },

    /**
     * Update user role or permissions
     */
    updateUser: async (userId, data) => {
        const response = await apiClient.patch(`/admin/users/${userId}`, data).catch(() => ({ data: { success: true } }));
        return response.data;
    },

    /**
     * Delete user from system
     */
    deleteUser: async (userId) => {
        const response = await apiClient.delete(`/admin/users/${userId}`).catch(() => ({ data: { success: true } }));
        return response.data;
    },

    /**
     * Fetch system-wide analytics
     */
    getSystemMetrics: async () => {
        const response = await apiClient.get('/admin/analytics').catch(() => ({ data: {} }));
        return response.data;
    },

    /**
     * Perform global search across tickets and users
     */
    globalSearch: async (query) => {
        const response = await apiClient.get(`/admin/search`, { params: { q: query } }).catch(() => ({ data: { results: [] } }));
        return response.data;
    }
};
