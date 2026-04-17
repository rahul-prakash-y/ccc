import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, api } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Lock, AlertCircle, Loader2, Wifi } from 'lucide-react';
import SubmitButton from './SubmitButton';

const Login = () => {
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // Shows the "waking up the arena" banner only if the health ping is slow
    const [isWakingUp, setIsWakingUp] = useState(false);

    const login = useAuthStore(state => state.login);
    const navigate = useNavigate();

    // ─── Backend Wake-Up Ping ────────────────────────────────────────────────────
    // Fires a GET /health the instant this page mounts. This triggers Render's
    // free-tier container to start spinning up immediately, rather than waiting
    // for the student to finish typing and click "Sign In".
    //
    // If the ping takes longer than 2 seconds (cold start in progress) we show
    // a small, non-intrusive banner. Once the ping resolves, the banner vanishes.
    // If the ping fails entirely, we silently swallow it — this is a warm-up call,
    // not a gating check.
    useEffect(() => {
        let bannerTimer = null;
        // AbortController lets us cancel the fetch if the component unmounts
        const controller = new AbortController();

        const wakeUp = async () => {
            // Show the "waking up" banner only after 2s of waiting
            bannerTimer = setTimeout(() => setIsWakingUp(true), 2000);

            try {
                await api.get('/health', { signal: controller.signal });
            } catch {
                // Silently ignore — timeout, network error, or 404 all acceptable.
                // The wake-up goal is achieved either way (TCP handshake → spin-up).
            } finally {
                clearTimeout(bannerTimer);
                setIsWakingUp(false);
            }
        };

        wakeUp();

        return () => {
            controller.abort();     // Cancel in-flight request on unmount
            clearTimeout(bannerTimer);
            setIsWakingUp(false);
        };
    }, []); // Empty deps — runs exactly once on mount


    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { studentId, password });
            const data = response.data;

            login(data.token, data.user);

            // Decode the JWT token to find if a server is allocated
            let allocatedServer = null;
            try {
                if (data.token) {
                    const base64Url = data.token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    const decoded = JSON.parse(jsonPayload);
                    allocatedServer = decoded?.allocatedServer;
                }
            } catch (e) {
                console.error("Failed to decode token", e);
            }

            if (data.user.role === 'SUPER_ADMIN' || data.user.role === "SUPER_MASTER") {
                navigate('/superadmin', { replace: true });
            } else if (data.user.role === 'ADMIN') {
                navigate('/admin', { replace: true });
            } else {
                if (allocatedServer) {
                    localStorage.setItem('allocatedServer', allocatedServer);
                } else {
                    localStorage.removeItem('allocatedServer');
                }
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">

            {/* ── Wake-Up Banner ─────────────────────────────────────────────────
                 Appears only if the backend cold-start takes > 2s. Positioned as
                 a fixed pill at the bottom so it never disrupts the login form. */}
            <AnimatePresence>
                {isWakingUp && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.3 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900/90 backdrop-blur-sm text-white rounded-2xl shadow-2xl border border-white/10"
                    >
                        <Loader2 size={15} className="animate-spin text-indigo-400 shrink-0" />
                        <span className="text-xs font-bold whitespace-nowrap">
                            Waking up the arena… please wait a moment.
                        </span>
                        <Wifi size={13} className="text-indigo-400 shrink-0" />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden"
            >
                {/* Top accent */}
                <div className="h-1.5 bg-linear-to-r from-violet-500 via-indigo-500 to-cyan-500" />

                <div className="p-8">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 text-center sm:text-left">
                        <div className="p-2 sm:p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                            <Terminal size={22} className="sm:size-[26px]" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">Code Circle Club</h1>
                            <p className="text-[9px] sm:text-xs text-gray-400 font-mono tracking-widest uppercase mt-0.5">Participant Login</p>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Student ID</label>
                            <input
                                type="text"
                                required
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all uppercase font-mono tracking-wider"
                                placeholder="EX: CODE-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                            >
                                <AlertCircle size={16} className="text-red-500 shrink-0" />
                                <p className="text-red-600 text-sm font-medium">{error}</p>
                            </motion.div>
                        )}

                        <SubmitButton
                            type="submit"
                            disabled={isLoading}
                            isLoading={isLoading}
                            loadingText="Signing in…"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-md hover:shadow-indigo-200 hover:shadow-lg flex items-center justify-center"
                        >
                            Sign In
                        </SubmitButton>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
