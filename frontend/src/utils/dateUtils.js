/**
 * Standard utility for formatting dates into Indian Standard Time (IST).
 * 
 * Consistent use of en-IN locale and Asia/Kolkata timezone ensures 
 * that no matter where the client is located, they see the same 
 * canonical Indian times for tests and records.
 */

const IST_OPTIONS = {
    timeZone: 'Asia/Kolkata',
    hour12: true,
};

/**
 * Formats a Date into a full localized string (Date + Time) in IST.
 * Example: 4 Apr 2026, 7:34 pm
 */
export const formatFullIST = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
        ...IST_OPTIONS,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Formats a Date into just the date part in IST.
 * Example: 4 Apr 2026
 */
export const formatDateIST = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        ...IST_OPTIONS,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

/**
 * Formats a Date into just the time part in IST.
 * Example: 07:34 PM
 */
export const formatTimeIST = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-IN', {
        ...IST_OPTIONS,
        hour: '2-digit',
        minute: '2-digit',
    });
};
