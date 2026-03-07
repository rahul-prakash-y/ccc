import { create } from 'zustand';
import { api } from './authStore';

export const useAttendanceStore = create((set, get) => ({
    attendanceRecords: [],
    loading: false,
    pagination: { totalPages: 1, totalRecords: 0 },
    activeOtp: null,
    timeLeft: 0,
    otpLoading: false,
    lastFetched: null,

    fetchAttendance: async (params = {}, force = false) => {
        const { lastFetched } = get();
        const now = Date.now();
        if (!force && lastFetched && now - lastFetched < 10000 && Object.keys(params).length === 1 && params.page === 1) {
            return;
        }

        set({ loading: true });
        try {
            const queryParams = new URLSearchParams(params);
            const res = await api.get(`/attendance/records?${queryParams.toString()}`);
            set({
                attendanceRecords: res.data.data || [],
                pagination: res.data.pagination || { totalPages: 1, totalRecords: 0 },
                loading: false,
                lastFetched: now
            });
        } catch (error) {
            console.error('Failed to fetch attendance records:', error);
            set({ loading: false });
        }
    },

    fetchActiveOtp: async () => {
        try {
            const res = await api.get('/attendance/active');
            if (res.data.success) {
                set({
                    activeOtp: res.data.data.otp,
                    timeLeft: res.data.data.secondsLeft
                });
            } else {
                set({ activeOtp: null, timeLeft: 0 });
            }
        } catch (error) {
            console.error('Failed to fetch active attendance OTP:', error);
        }
    },

    generateOtp: async () => {
        set({ otpLoading: true });
        try {
            const res = await api.post('/attendance/generate');
            set({
                activeOtp: res.data.data.otp,
                timeLeft: res.data.data.secondsLeft,
                otpLoading: false
            });
        } catch (error) {
            console.error('Failed to generate attendance OTP:', error);
            set({ otpLoading: false });
        }
    },

    removeAttendance: (id) => {
        set((state) => ({
            attendanceRecords: state.attendanceRecords.filter((r) => r._id !== id),
            pagination: {
                ...state.pagination,
                totalRecords: state.pagination.totalRecords - 1
            }
        }));
    },

    decrementTimer: () => {
        const { timeLeft, activeOtp } = get();
        if (timeLeft <= 0) {
            if (activeOtp) set({ activeOtp: null, timeLeft: 0 });
            return;
        }
        set({ timeLeft: timeLeft - 1 });
    }
}));
