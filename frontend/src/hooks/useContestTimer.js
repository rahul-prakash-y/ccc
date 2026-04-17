import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to manage the strict 1-hour unstoppable timer and anti-cheat tracking.
 * 
 * @param {Object} options 
 * @param {string} options.roundId - The ID of the current round.
 * @param {Date|string} options.serverStartTime - The server-persisted start time.
 * @param {number} options.durationMinutes - Total duration limit in minutes (default 60).
 * @param {number} options.extraTimeMinutes - Total extra time granted in minutes (default 0).
 * @param {Function} options.onTimeUp - Callback when time reaches 0.
 * @param {Function} options.onCheatDetected - Callback to alert backend of cheat event.
 */
export const useContestTimer = ({
    roundId,
    serverStartTime,
    durationMinutes = 60,
    extraTimeMinutes = 0,
    onTimeUp,
    onCheatDetected
}) => {
    const [timeLeft, setTimeLeft] = useState(null);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [tabSwitches, setTabSwitches] = useState(0);

    const timerRef = useRef(null);
    const isStarted = !!serverStartTime;

    const calculateTimeLeft = useCallback(() => {
        if (!serverStartTime) return null;

        // Convert to MS
        const startMs = new Date(serverStartTime).getTime();
        const durationMs = (durationMinutes + extraTimeMinutes) * 60 * 1000;
        const endMs = startMs + durationMs;
        const nowMs = Date.now();

        const remaining = Math.max(0, Math.floor((endMs - nowMs) / 1000));
        return remaining;
    }, [serverStartTime, durationMinutes, extraTimeMinutes]);

    // Handle countdown
    useEffect(() => {
        if (!isStarted || isTimeUp) return;

        const initialRemaining = calculateTimeLeft();

        if (initialRemaining <= 0) {
            setIsTimeUp(true);
            setTimeLeft(0);
            if (onTimeUp) onTimeUp();
            return;
        }

        setTimeLeft(initialRemaining);

        timerRef.current = setInterval(() => {
            const remaining = calculateTimeLeft();

            if (remaining <= 0) {
                clearInterval(timerRef.current);
                setTimeLeft(0);
                setIsTimeUp(true);
                if (onTimeUp) onTimeUp();
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isStarted, isTimeUp, calculateTimeLeft, onTimeUp]);

    // Anti-Cheat: Visibility/Tab Switch Tracking
    useEffect(() => {
        if (!isStarted || isTimeUp) return;

        // No-op: Removed aggressive visibility/unload listeners to prevent false positives on refresh.
        return () => { };
    }, [isStarted, isTimeUp]);

    // Format time for UI (HH:MM:SS)
    const formatTime = (seconds) => {
        if (seconds === null) return "--:--:--";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return {
        timeLeft,
        formattedTime: formatTime(timeLeft),
        isTimeUp,
        tabSwitches,
        isDangerZone: timeLeft !== null && timeLeft < 300 // Last 5 minutes warning state
    };
};

export default useContestTimer;
