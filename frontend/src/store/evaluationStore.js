import { create } from 'zustand';
import { api } from './authStore';
import { API } from '../components/SuperAdmin/constants';

export const useEvaluationStore = create((set, get) => ({
    evaluationQueue: [],
    loading: false,
    error: null,
    pagination: { totalPages: 1, totalRecords: 0 },
    lastFetched: null,

    fetchQueue: async (params = {}, force = false) => {
        const { lastFetched } = get();
        const now = Date.now();
        if (!force && lastFetched && now - lastFetched < 10000 && Object.keys(params).length === 1 && params.page === 1) {
            return;
        }

        set({ loading: true, error: null });
        try {
            const queryParams = new URLSearchParams(params);
            const res = await api.get(`${API}/manual-evaluations?${queryParams.toString()}`);
            set({
                evaluationQueue: res.data.data || [],
                pagination: res.data.pagination || { totalPages: 1, totalRecords: 0 },
                loading: false,
                lastFetched: now,
                error: null
            });
        } catch (error) {
            console.error('Failed to fetch evaluation queue:', error);
            set({
                loading: false,
                error: error.response?.data?.error || 'Failed to fetch evaluation queue'
            });
        }
    },

    updateEvaluation: (submissionId, questionId, scoreData) => {
        set((state) => ({
            evaluationQueue: state.evaluationQueue.map((sub) => {
                if (sub._id === submissionId) {
                    return {
                        ...sub,
                        questions: sub.questions.map((q) =>
                            q.question._id === questionId ? { ...q, existingScore: scoreData } : q
                        )
                    };
                }
                return sub;
            })
        }));
    },

    removeQuestionFromEvaluation: (submissionId, questionId) => {
        set((state) => ({
            evaluationQueue: state.evaluationQueue.map((sub) => {
                if (sub._id === submissionId) {
                    const remaining = sub.questions.filter((q) => q.question._id !== questionId);
                    return remaining.length > 0 ? { ...sub, questions: remaining } : null;
                }
                return sub;
            }).filter(Boolean)
        }));
    }
}));
