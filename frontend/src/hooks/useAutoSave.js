import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../store/authStore';

/**
 * Custom hook for debounced automatic saving during the active session.
 * 
 * @param {any} data - The current answers or code state.
 * @param {string} roundId - The currently active round ID.
 * @param {number} delayMs - Milliseconds to debounce (default 5000 = 5 seconds)
 * @param {boolean} isLocked - Stops saving if true.
 * @returns {string} The auto-save status (e.g., 'SAVED', 'SAVING', 'ERROR').
 */
export const useAutoSave = (data, roundId, delayMs = 5000, isLocked = false, onSaveSuccess = null) => {
    const [saveStatus, setSaveStatus] = useState('SAVED'); // 'SAVED' | 'SAVING' | 'ERROR'
    const isFirstRender = useRef(true);
    const syncTimerRef = useRef(null);

    const performSave = useCallback(async (content) => {
        if (isLocked) return;

        setSaveStatus('SAVING');

        try {
            // API call to Express/Fastify backend to silently upsert the draft
            // If it's an object, we send it as 'answers', otherwise as 'codeContent'
            const payload = typeof content === 'object' ? { answers: content } : { codeContent: content };
            const response = await api.post(`/rounds/${roundId}/autosave`, payload);

            if (onSaveSuccess && response.data) {
                onSaveSuccess(response.data);
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
    }, [roundId, isLocked, onSaveSuccess]);

    useEffect(() => {
        // Prevent auto-save on initial mount mounting
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (isLocked) {
            return;
        }

        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
        }

        syncTimerRef.current = setTimeout(() => {
            performSave(data);
        }, delayMs);

        return () => clearTimeout(syncTimerRef.current);
    }, [data, delayMs, isLocked, performSave]);

    const statusToReturn = isLocked ? 'LOCKED' : saveStatus;

    return { saveStatus: statusToReturn, performSave };
};

export default useAutoSave;
