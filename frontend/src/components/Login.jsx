import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, api } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const login = useAuthStore(state => state.login);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { studentId, password });
            const data = response.data;

            login(data.token, data.user);
            if (data.user.role === 'SUPER_ADMIN') {
                navigate('/superadmin', { replace: true });
            } else if (data.user.role === 'ADMIN') {
                navigate('/admin', { replace: true });
            } else {
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
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden"
            >
                {/* Top accent */}
                <div className="h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />

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

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all mt-2 shadow-md hover:shadow-indigo-200 hover:shadow-lg"
                        >
                            {isLoading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
