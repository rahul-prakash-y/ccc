import { create } from 'zustand';
import { api } from './authStore';
import { API } from '../components/SuperAdmin/constants';

export const useStudentStore = create((set, get) => ({
    students: [],
    loading: false,
    pagination: { totalPages: 1, totalRecords: 0 },
    lastFetched: null,

    fetchStudents: async (params = {}, force = false) => {
        const { lastFetched } = get();
        const now = Date.now();
        // 10 second cache unless forced
        if (!force && lastFetched && now - lastFetched < 10000 && Object.keys(params).length === 0) {
            return;
        }

        set({ loading: true });
        try {
            const queryParams = new URLSearchParams(params);
            const res = await api.get(`${API}/students?${queryParams.toString()}`);
            set({
                students: res.data.data || [],
                pagination: res.data.pagination || { totalPages: 1, totalRecords: 0 },
                loading: false,
                lastFetched: now
            });
        } catch (error) {
            console.error('Failed to fetch students:', error);
            set({ loading: false });
        }
    },

    addStudent: (student) => {
        set((state) => ({
            students: [student, ...state.students],
            pagination: {
                ...state.pagination,
                totalRecords: state.pagination.totalRecords + 1
            }
        }));
    },

    updateStudent: (studentId, updatedData) => {
        set((state) => ({
            students: state.students.map((s) =>
                s._id === studentId ? { ...s, ...updatedData } : s
            )
        }));
    },

    removeStudent: (studentId) => {
        set((state) => ({
            students: state.students.filter((s) => s._id !== studentId),
            pagination: {
                ...state.pagination,
                totalRecords: state.pagination.totalRecords - 1
            }
        }));
    }
}));
