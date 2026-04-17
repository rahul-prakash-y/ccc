/**
 * ============================================================
 *  CLIENT-SIDE LOAD BALANCER  —  apiConfig.js
 *  Strategy: Random assignment on first visit, then sticky
 *  sessions pinned to localStorage for the full 3-day event.
 * ============================================================
 *
 *  Required .env variables (add to Vercel → Settings → Env Vars):
 *    VITE_API_URL_1=https://frontend-frenzy-backend-1.onrender.com/api
 *    VITE_API_URL_2=https://frontend-frenzy-backend-2.onrender.com/api
 *    VITE_API_URL_3=https://frontend-frenzy-backend-3.onrender.com/api
 *    VITE_API_URL_4=https://frontend-frenzy-backend-4.onrender.com/api
 *    VITE_DEV_API_URL=http://localhost:5000/api
 */

// ─── 1.  Pool of production backend URLs ───────────────────────────────────────
// Vite statically replaces import.meta.env at build time, so keep all 4 vars.
const BACKEND_POOL = [
    "https://frontend-frenzy-backend.onrender.com",
    'https://frontend-frenzy-backend-ajsn.onrender.com',
    'https://frontend-frenzy-backend-3.onrender.com',
    'https://frontend-frenzy-backend-8zj1.onrender.com',
    'https://frontend-frenzy-backend-1-sff6.onrender.com',
    'https://frontend-frenzy-backend-3ei3.onrender.com',
    'https://frontend-frenzy-backend-1-8e61.onrender.com',
    'https://frontend-frenzy-backend-1-7hw2.onrender.com'
].filter(Boolean); // Silently drops any undefined vars (e.g. during local dev)

const DEV_URL = import.meta.env.VITE_DEV_API_URL || 'http://localhost:5000';
const IS_DEV = import.meta.env.VITE_FRONTEND_MODE === 'development';

// ─── 2.  Production env-var guard ──────────────────────────────────────────────
// Runs once at module load time. If this is a production build and zero backend
// URLs were injected, we surface a loud, actionable error immediately — rather
// than silently serving 404s or CORS errors to 400 students.
//
// FIX: Go to Vercel → Project → Settings → Environment Variables and ensure
// VITE_API_URL_1 through VITE_API_URL_4 are set for the Production environment,
// then trigger a fresh redeploy.
if (!IS_DEV && BACKEND_POOL.length === 0) {
    console.error(
        '[apiConfig] 🚨 DEPLOYMENT ERROR: No backend URLs configured.\n' +
        'The following Vercel environment variables are missing or empty:\n' +
        '  • VITE_API_URL_1\n' +
        '  • VITE_API_URL_2\n' +
        '  • VITE_API_URL_3\n' +
        '  • VITE_API_URL_4\n' +
        'All API calls will fail. Add these vars in Vercel → Settings → ' +
        'Environment Variables and redeploy.'
    );
}

// ─── 2.  localStorage key ──────────────────────────────────────────────────────
const STICKY_SESSION_KEY = 'ff_sticky_backend';

/**
 * getBaseUrl()
 *
 * Returns the base URL this student is pinned to.
 *
 * Algorithm:
 *  - In development → always return the local dev URL.
 *  - On first visit  → pick a random backend from the pool,
 *                       persist the index to localStorage.
 *  - On all subsequent page loads → read the index from localStorage
 *                       and return the same backend (sticky session).
 *
 * This guarantees a student never hops between backends, keeping
 * any in-memory caches (leaderboard data, session state) coherent.
 */
export function getBaseUrl() {
    // ── Check for allocated server override first ─────────────────────────
    let allocatedServer = localStorage.getItem('allocatedServer');
    if (allocatedServer) {
        // Strip trailing slash and '/api' because authStore interceptor appends '/api'
        allocatedServer = allocatedServer.replace(/\/+$/, "");
        if (allocatedServer.endsWith('/api')) {
            allocatedServer = allocatedServer.slice(0, -4);
        }
        return allocatedServer;
    }

    // ── Dev shortcut ────────────────────────────────────────────────────────────
    if (IS_DEV) return DEV_URL;

    // ── Fallback if pool is empty (mis-configured .env) ─────────────────────────
    if (BACKEND_POOL.length === 0) {
        console.warn('[LB] No backend URLs found in env vars. Falling back to DEV URL.');
        return DEV_URL;
    }

    // ── Read existing sticky assignment ─────────────────────────────────────────
    const stored = localStorage.getItem(STICKY_SESSION_KEY);
    if (stored !== null) {
        const idx = parseInt(stored, 10);
        // Guard against stale index if the pool shrinks mid-event
        if (!Number.isNaN(idx) && idx >= 0 && idx < BACKEND_POOL.length) {
            return BACKEND_POOL[idx];
        }
    }

    // ── First visit: assign randomly and persist ─────────────────────────────────
    const randomIdx = Math.floor(Math.random() * BACKEND_POOL.length);
    localStorage.setItem(STICKY_SESSION_KEY, String(randomIdx));

    console.info(`[LB] Student assigned to backend #${randomIdx + 1}: ${BACKEND_POOL[randomIdx]}`);
    return BACKEND_POOL[randomIdx];
}

/**
 * clearStickySession()
 *
 * Call this on logout so the student gets a fresh random assignment
 * on next login. Prevents a dead backend from being permanently stuck.
 */
export function clearStickySession() {
    localStorage.removeItem(STICKY_SESSION_KEY);
}

/**
 * getStickyInfo()
 *
 * Utility for debugging — returns the current sticky assignment details.
 * Remove in production or gate behind an admin flag.
 */
export function getStickyInfo() {
    const idx = localStorage.getItem(STICKY_SESSION_KEY);
    return {
        assignedIndex: idx !== null ? parseInt(idx, 10) : null,
        assignedUrl: idx !== null ? BACKEND_POOL[parseInt(idx, 10)] : null,
        poolSize: BACKEND_POOL.length,
    };
}
