import { create } from 'zustand';
import { api } from './authStore';
import { API } from '../components/SuperAdmin/constants';

export const useActivityStore = create((set, get) => ({
    logs: [],
    loading: false,
    pagination: { totalPages: 1, totalRecords: 0 },
    lastFetched: null,

    fetchLogs: async (params = {}, force = false) => {
        const { lastFetched } = get();
        const now = Date.now();
        // Logs are dynamic, but we can cache for 5 seconds to prevent rapid trigger
        if (!force && lastFetched && now - lastFetched < 5000 && Object.keys(params).length === 1 && params.page === 1) {
            return;
        }

        set({ loading: true });
        try {
            const queryParams = new URLSearchParams(params);
            const res = await api.get(`${API}/activity-logs?${queryParams.toString()}`);
            set({
                logs: res.data.data || [],
                pagination: res.data.pagination || { totalPages: 1, totalRecords: 0 },
                loading: false,
                lastFetched: now
            });
        } catch (error) {
            console.error('Failed to fetch activity logs:', error);
            set({ loading: false });
        }
    }
}));
