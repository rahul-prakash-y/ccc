import { create } from 'zustand';
import { api } from './authStore';
import { API } from '../components/SuperAdmin/constants';

export const useTeamStore = create((set, get) => ({
    teams: [],
    loading: false,
    lastFetched: null,

    fetchTeams: async (force = false) => {
        const { lastFetched } = get();
        const now = Date.now();
        if (!force && lastFetched && now - lastFetched < 30000) {
            return;
        }

        set({ loading: true });
        try {
            const res = await api.get(`${API}/teams`);
            set({
                teams: res.data.data || [],
                loading: false,
                lastFetched: now
            });
        } catch (error) {
            console.error('Failed to fetch teams:', error);
            set({ loading: false });
        }
    },

    removeTeam: (teamId) => {
        set((state) => ({
            teams: state.teams.filter((t) => t._id !== teamId)
        }));
    }
}));
