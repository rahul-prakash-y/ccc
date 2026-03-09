import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../store/authStore';

/**
 * Custom hook for interval-based automatic saving during the active session.
 * 
 * @param {any} data - The current answers or code state.
 * @param {string} roundId - The currently active round ID.
 * @param {number} intervalMs - Milliseconds between enforced saves (e.g., 60000 = 60s)
 * @param {boolean} isLocked - Stops saving if true.
 * @returns {string} The auto-save status (e.g., 'SAVED', 'SAVING', 'ERROR').
 */
export const useAutoSave = (data, roundId, intervalMs = 60000, isLocked = false, onSaveSuccess = null) => {
    const [saveStatus, setSaveStatus] = useState('SAVED'); // 'SAVED' | 'SAVING' | 'ERROR'
    const syncIntervalRef = useRef(null);
    const onSaveSuccessRef = useRef(onSaveSuccess);
    const dataRef = useRef(data);

    useEffect(() => {
        onSaveSuccessRef.current = onSaveSuccess;
    }, [onSaveSuccess]);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    const performSave = useCallback(async (content) => {
        if (isLocked) return;

        setSaveStatus('SAVING');

        try {
            // API call to Express/Fastify backend to silently upsert the draft
            // If it's an object, we send it as 'answers', otherwise as 'codeContent'
            const payload = typeof content === 'object' ? { answers: content } : { codeContent: content };
            const response = await api.post(`/rounds/${roundId}/autosave`, payload);

            if (onSaveSuccessRef.current && response.data) {
                onSaveSuccessRef.current(response.data);
            }

            // Fallback: Persistent Local Storage Draft in case of complete network outtage
            const stringified = typeof content === 'object' ? JSON.stringify(content) : content;
            localStorage.setItem(`draft_${roundId}`, stringified);

            // Artificial delay for UI feedback
            await new Promise(resolve => setTimeout(resolve, 600));

            setSaveStatus('SAVED');
        } catch (error) {
            console.error('AutoSave failed:', error);
            setSaveStatus('ERROR');
        }
    }, [roundId, isLocked]);

    useEffect(() => {
        if (isLocked) {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
            return;
        }

        // Setup strict interval
        syncIntervalRef.current = setInterval(() => {
            performSave(dataRef.current);
        }, intervalMs);

        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [intervalMs, isLocked, performSave]);

    const statusToReturn = isLocked ? 'LOCKED' : saveStatus;

    return { saveStatus: statusToReturn, performSave };
};

export default useAutoSave;
