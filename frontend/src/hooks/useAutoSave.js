import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for debounced automatic saving during the active session.
 * 
 * @param {string} code - The current editor code state.
 * @param {string} roundId - The currently active round ID.
 * @param {number} delayMs - Milliseconds to debounce (default 5000 = 5 seconds)
 * @param {boolean} isLocked - Stops saving if true.
 * @returns {string} The auto-save status (e.g., 'SAVED', 'SAVING', 'ERROR').
 */
export const useAutoSave = (code, roundId, delayMs = 5000, isLocked = false) => {
    const [saveStatus, setSaveStatus] = useState('SAVED'); // 'SAVED' | 'SAVING' | 'ERROR'
    const isFirstRender = useRef(true);
    const syncTimerRef = useRef(null);

    const performSave = useCallback(async (content) => {
        if (isLocked) return;

        setSaveStatus('SAVING');

        try {
            // API call to Express/Fastify backend to silently upsert the draft
            /*
            await fetch(`/api/rounds/${roundId}/autosave`, {
              method: 'POST',
              headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ codeContent: content })
            });
            */

            // Fallback: Persistent Local Storage Draft in case of complete network outtage
            localStorage.setItem(`draft_${roundId}`, content);

            // Artificial delay for UI feedback
            await new Promise(resolve => setTimeout(resolve, 600));

            setSaveStatus('SAVED');
        } catch (error) {
            console.error('AutoSave failed:', error);
            setSaveStatus('ERROR');
        }
    }, [roundId, isLocked]);

    useEffect(() => {
        // Prevent auto-save on initial mount mounting
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (isLocked) {
            setSaveStatus('LOCKED');
            return;
        }

        if (syncTimerRef.current) {
            clearTimeout(syncTimerRef.current);
        }

        setSaveStatus('PENDING'); // Visual clue it will save soon

        syncTimerRef.current = setTimeout(() => {
            performSave(code);
        }, delayMs);

        return () => clearTimeout(syncTimerRef.current);
    }, [code, delayMs, isLocked, performSave]);

    return { saveStatus, performSave };
};

export default useAutoSave;
