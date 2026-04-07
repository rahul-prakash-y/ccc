// ─── Shared API config ────────────────────────────────────────────────────────
export const API = '/superadmin';


// ─── Difficulty badge colours (Question Manager) ──────────────────────────────
export const DIFFICULTY_COLORS = {
    EASY: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    MEDIUM: 'text-amber-700   bg-amber-50   border-amber-200',
    HARD: 'text-red-700     bg-red-50     border-red-200',
};

// ─── Activity log colour coding ───────────────────────────────────────────────
export const ACTION_STYLES = {
    LOGIN: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    LOGOUT: { color: 'text-gray-500', bg: 'bg-gray-100 border-gray-300' },
    CREATED: { color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
    UPDATED: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    DELETED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    BULK_UPLOAD: { color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
    OTP_GENERATED: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
    SECTION_STARTED: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    SECTION_SUBMITTED: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    DISQUALIFIED: { color: 'text-red-500', bg: 'bg-red-950/50 border-red-700' },
};

export const ALL_ACTIONS = Object.keys(ACTION_STYLES);

// ─── Submission status colours (Audit Logs) ───────────────────────────────────
export const STATUS_COLORS = {
    SUBMITTED: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    IN_PROGRESS: 'bg-amber-50 border-amber-100 text-amber-600',
    DISQUALIFIED: 'bg-red-50 border-red-100 text-red-600',
    NOT_STARTED: 'bg-slate-50 border-slate-100 text-slate-400',
    COMPLETED: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    EVALUATED: 'bg-emerald-50 border-emerald-100 text-emerald-600',
};
