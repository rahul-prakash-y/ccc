import { create } from 'zustand';
import { api } from './authStore';
import { API } from '../components/SuperAdmin/constants';

export const useAdminStore = create((set, get) => ({
    admins: [],
    loading: false,
    pagination: { totalPages: 1, totalRecords: 0 },
    lastFetched: null,

    // Admin Contributions State
    contributions: [],
    contributionsLoading: false,
    lastFetchedContributions: null,
    
    // Admin Master Cache (Platform-wide Students)
    masterCache: { students: [], lastUpdated: null },
    masterLoading: false,
    
    // Global Dashboard Stats
    dashboardStats: { totalUsers: 0, totalSubmissions: 0, totalCheatFlags: 0, lastUpdated: null },
    statsLoading: false,

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

    fetchContributions: async (force = false) => {
        const { lastFetchedContributions } = get();
        const now = Date.now();
        if (!force && lastFetchedContributions && now - lastFetchedContributions < 10000) {
            return;
        }

        set({ contributionsLoading: true });
        try {
            const res = await api.get(`${API}/admin-contributions`);
            set({
                contributions: res.data.data || [],
                contributionsLoading: false,
                lastFetchedContributions: now
            });
        } catch (error) {
            console.error('Failed to fetch admin contributions:', error);
            set({ contributionsLoading: false });
        }
    },

    fetchDashboardStats: async () => {
        const { statsLoading } = get();
        if (statsLoading) return;

        set({ statsLoading: true });
        try {
            const res = await api.get('/admin/stats');
            set({
                dashboardStats: res.data.data,
                statsLoading: false
            });
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            set({ statsLoading: false });
        }
    },

    refreshDashboardStats: async () => {
        set({ statsLoading: true });
        try {
            const res = await api.post('/admin/refresh-stats');
            set({
                dashboardStats: res.data.data,
                statsLoading: false
            });
        } catch (error) {
            console.error('Failed to refresh dashboard stats:', error);
            set({ statsLoading: false });
            throw error;
        }
    },

    fetchMasterDashboard: async () => {
        set({ masterLoading: true });
        try {
            const res = await api.get('/admin/dashboard');
            set({
                masterCache: res.data.data,
                masterLoading: false
            });
        } catch (error) {
            console.error('Failed to fetch master dashboard:', error);
            set({ masterLoading: false });
        }
    },

    fetchStudentCode: async (studentId) => {
        try {
            const res = await api.get(`/admin/student/${studentId}/code`);
            return res.data.data;
        } catch (error) {
            console.error('Failed to fetch student code:', error);
            throw error;
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
