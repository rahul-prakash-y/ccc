import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Terminal, Lock } from 'lucide-react';

const Login = () => {
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, password }),
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Login failed.');

            login(data.token, data.user);
            console.log("data:", data.user.role)
            if (data.user.role === "ADMIN") {
                navigate('/admin', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }

        } catch (err) {
            setError(err.message || 'Login failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 selection:bg-cyan-500/30">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-[#0d0d14] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden relative"
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500"></div>

                <div className="p-8">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="p-3 bg-black/50 border border-gray-800 rounded-xl text-cyan-400">
                            <Terminal size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 tracking-tight">Code Circuit Club</h1>
                            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">Operator Authentication</p>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5 font-mono">Student ID</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    required
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors uppercase"
                                    placeholder="EX: CODE-001"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5 font-mono">Password</label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-center gap-3">
                                <Lock size={16} className="text-red-400 shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'INITIATING HANDSHAKE...' : 'SECURE LOGIN'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
