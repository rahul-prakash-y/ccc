import { create } from 'zustand';
import { api } from './authStore';
import { API } from '../components/SuperAdmin/constants';

export const useRoundStore = create((set, get) => ({
    rounds: [],
    loading: false,
    lastFetched: 0,

    fetchRounds: async (force = false) => {
        const now = Date.now();
        const { lastFetched, loading, rounds } = get();

        // Cache for 10 seconds unless forced or empty
        if (!force && loading) return;
        if (!force && (now - lastFetched < 10000) && rounds.length > 0) return;

        set({ loading: true });
        try {
            const res = await api.get(`${API}/rounds`);
            set({
                rounds: res.data.data || [],
                lastFetched: now,
                loading: false
            });
        } catch (e) {
            console.error("Failed to fetch rounds:", e);
            set({ loading: false });
        }
    },

    setRounds: (rounds) => set({ rounds, lastFetched: Date.now() }),

    updateRound: (roundId, updatedData) => {
        set((state) => ({
            rounds: state.rounds.map((r) => r._id === roundId ? { ...r, ...updatedData } : r)
        }));
    },

    removeRound: (roundId) => {
        set((state) => ({
            rounds: state.rounds.filter((r) => r._id !== roundId)
        }));
    },

    filterRounds: (predicate) => {
        set((state) => ({
            rounds: state.rounds.filter(predicate)
        }));
    }
}));
