import { create } from 'zustand';
import { api } from './authStore';
import { API } from '../components/SuperAdmin/constants';

export const useAuditStore = create((set, get) => ({
    auditLogs: [],
    loading: false,
    pagination: { totalPages: 1, totalRecords: 0 },
    lastFetched: null,

    fetchAuditLogs: async (params = {}, force = false) => {
        const { lastFetched } = get();
        const now = Date.now();
        if (!force && lastFetched && now - lastFetched < 10000 && Object.keys(params).length === 1 && params.page === 1) {
            return;
        }

        set({ loading: true });
        try {
            const queryParams = new URLSearchParams(params);
            const res = await api.get(`${API}/audit-logs?${queryParams.toString()}`);
            set({
                auditLogs: res.data.data || [],
                pagination: res.data.pagination || { totalPages: 1, totalRecords: 0 },
                loading: false,
                lastFetched: now
            });
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
            set({ loading: false });
        }
    },

    removeAuditLog: (submissionId) => {
        set((state) => ({
            auditLogs: state.auditLogs.filter((log) => log._id !== submissionId),
            pagination: {
                ...state.pagination,
                totalRecords: state.pagination.totalRecords - 1
            }
        }));
    },

    updateAuditLog: (submissionId, updatedData) => {
        set((state) => ({
            auditLogs: state.auditLogs.map((log) =>
                log._id === submissionId ? { ...log, ...updatedData } : log
            )
        }));
    }
}));
