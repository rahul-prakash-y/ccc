import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../store/authStore';

/**
 * Custom hook for periodic automatic saving and immediate local persistence during the active session.
 * 
 * @param {any} data - The current answers or code state.
 * @param {string} roundId - The currently active round ID.
 * @param {number} delayMs - Milliseconds for the API sync interval (default 60000 = 1 minute)
 * @param {boolean} isLocked - Stops saving if true.
 * @param {function} onSaveSuccess - Callback for successful API save.
 * @returns {object} The auto-save status and manual save trigger.
 */
export const useAutoSave = (data, roundId, delayMs = 60000, isLocked = false, onSaveSuccess = null) => {
    const [saveStatus, setSaveStatus] = useState('SAVED'); // 'SAVED' | 'SAVING' | 'ERROR' | 'PENDING'
    const isFirstRender = useRef(true);

    // Refs to hold latest data to avoid stale closures in the interval
    const latestData = useRef(data);
    const lastSavedData = useRef(null);

    // Update refs immediately when data changes
    useEffect(() => {
        latestData.current = data;

        // Don't save on the very first render to avoid clearing existing drafts unnecessarily
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Initialize lastSavedData with what we have to prevent immediate sync if no real change
            const stringifiedInitial = typeof data === 'object' ? JSON.stringify(data) : data;
            lastSavedData.current = stringifiedInitial;
            return;
        }

        if (isLocked) return;

        // 1. Immediate Local Persistance on every change
        const stringified = typeof data === 'object' ? JSON.stringify(data) : data;
        localStorage.setItem(`draft_${roundId}`, stringified);

    }, [data, roundId, isLocked]);

    const performSave = useCallback(async (contentToSave) => {
        if (isLocked) return;

        const stringified = typeof contentToSave === 'object' ? JSON.stringify(contentToSave) : contentToSave;

        // Skip API call if data hasn't changed since last successful save
        if (stringified === lastSavedData.current) {
            return;
        }

        setSaveStatus('SAVING');

        try {
            const payload = typeof contentToSave === 'object' ? { answers: contentToSave } : { codeContent: contentToSave };
            const response = await api.post(`/rounds/${roundId}/autosave`, payload);

            if (onSaveSuccess && response.data) {
                onSaveSuccess(response.data);
            }

            // Sync successful, update last saved reference
            lastSavedData.current = stringified;

            // Artificial delay for UI feedback
            await new Promise(resolve => setTimeout(resolve, 600));

            setSaveStatus('SAVED');
        } catch (error) {
            console.error('AutoSave failed:', error);
            setSaveStatus('ERROR');
        }
    }, [roundId, isLocked, onSaveSuccess]);

    // 2. Strict Interval for API Sync
    useEffect(() => {
        if (isLocked) return;

        const intervalId = setInterval(() => {
            // Pass the current data from the ref
            performSave(latestData.current);
        }, delayMs);

        return () => clearInterval(intervalId);
    }, [delayMs, isLocked, performSave]);

    // Note: status might be PENDING if data changed but interval hasn't fired yet
    const statusToReturn = isLocked ? 'LOCKED' : saveStatus;

    return { saveStatus: statusToReturn, performSave };
};

export default useAutoSave;
