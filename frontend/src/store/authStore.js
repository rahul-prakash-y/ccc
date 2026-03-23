import { create } from 'zustand';
import axios from 'axios';

// Create a configured axios instance for the application
export const api = axios.create({
    baseURL: import.meta.env.VITE_FRONTEND_MODE === "development" ? 'http://localhost:5000/api' : '/api', // General API base
});

// Interceptor to auto-inject the Auth token and dynamically route to allocated server
api.interceptors.request.use((config) => {
    const state = useAuthStore.getState();
    const token = state.token;
    const user = state.user;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Dynamic Server Allocation Logic
    // If the student has an assigned backend server, redirect all API calls there
    if(import.meta.env.VITE_FRONTEND_MODE === "development"){
        config.baseURL = 'http://localhost:5000/api';
        return config;
    }
    if (user?.role === 'STUDENT' && user?.allocatedServer) {
        // Ensure the allocated URL has /api appended if missing, to maintain convention
        let base = user.allocatedServer;
        if (!base.endsWith('/api')) {
            base = base.replace(/\/$/, '') + '/api';
        }
        config.baseURL = base;
    }

    return config;
}, (error) => Promise.reject(error));

export const useAuthStore = create((set, get) => ({
    user: null,
    token: null,
    loading: true,

    // Initialization: pull directly from LocalStorage on refresh
    initialize: () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                set({ user: JSON.parse(storedUser), token, loading: false });
                return;
            } catch (error) {
                console.error("Failed to parse stored user data:", error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        set({ user: null, token: null, loading: false });
    },

    login: (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        set({ user: userData, token });
    },

    updateUser: (userData) => {
        const currentUser = get().user;
        const updatedUser = { ...currentUser, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
    },

    onboard: async (name, email, linkedinProfile, githubProfile, phone, bio, dob, password, department, gender, accommodation) => {
        try {
            const res = await api.post('/auth/onboard', { name, email, linkedinProfile, githubProfile, phone, bio, dob, password, department, gender, accommodation });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            set({ user, token });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Onboarding failed' };
        }
    },

    updateProfile: async (name, email, linkedinProfile, githubProfile, phone, bio, dob, password, department, gender, accommodation) => {
        try {
            const res = await api.put('/auth/profile', { name, email, linkedinProfile, githubProfile, phone, bio, dob, password, department, gender, accommodation });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            set({ user, token });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Profile update failed' };
        }
    },

    logout: async () => {
        const { token } = get();
        if (token) {
            try {
                // Ping backend to trace organic logout
                await api.post('/auth/logout');
            } catch (err) {
                console.error('Logout request failed:', err);
            }
        }

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null });
    }
}));
