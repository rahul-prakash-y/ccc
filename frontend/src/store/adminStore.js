import { create } from 'zustand';
import { api } from './authStore';
import { API } from '../components/SuperAdmin/constants';

export const useAdminStore = create((set, get) => ({
    admins: [],
    loading: false,
    pagination: { totalPages: 1, totalRecords: 0 },
    lastFetched: null,

    fetchAdmins: async (params = {}, force = false) => {
        const { lastFetched } = get();
        const now = Date.now();
        if (!force && lastFetched && now - lastFetched < 10000 && Object.keys(params).length === 0) {
            return;
        }

        set({ loading: true });
        try {
            const queryParams = new URLSearchParams(params);
            const res = await api.get(`${API}/admins?${queryParams.toString()}`);
            set({
                admins: res.data.data || [],
                pagination: res.data.pagination || { totalPages: 1, totalRecords: 0 },
                loading: false,
                lastFetched: now
            });
        } catch (error) {
            console.error('Failed to fetch admins:', error);
            set({ loading: false });
        }
    },

    addAdmin: (admin) => {
        set((state) => ({
            admins: [admin, ...state.admins],
            pagination: {
                ...state.pagination,
                totalRecords: state.pagination.totalRecords + 1
            }
        }));
    },

    updateAdmin: (adminId, updatedData) => {
        set((state) => ({
            admins: state.admins.map((a) =>
                a._id === adminId ? { ...a, ...updatedData } : a
            )
        }));
    },

    removeAdmin: (adminId) => {
        set((state) => ({
            admins: state.admins.filter((a) => a._id !== adminId),
            pagination: {
                ...state.pagination,
                totalRecords: state.pagination.totalRecords - 1
            }
        }));
    }
}));
