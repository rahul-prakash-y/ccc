import React, { useState } from 'react';
import { api } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Terminal, ArrowRight } from 'lucide-react';

const OtpGate = ({ roundId, roundName, isOpen, onClose, onUnlock }) => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError('OTP must be exactly 6 characters.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await api.post(`/rounds/${roundId}/start`, { startOtp: otp });
            onUnlock(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'System Error. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0d0d14] border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
                >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-lg bg-cyan-950/50 border border-cyan-900/50 text-cyan-400">
                                <ShieldAlert size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-white">Authorization Required</h2>
                                <p className="text-sm text-cyan-500/80 font-mono text-nowrap truncate">{roundName}</p>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Enter the 6-digit cryptographic sequence provided by the Admin to unlock this environment. Time begins immediately upon verification.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Terminal size={18} className="text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.toUpperCase())}
                                        className="block w-full pl-12 pr-4 py-4 bg-black/50 border border-gray-700/50 rounded-xl rounded-b-none border-b-cyan-500/50 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all font-mono text-center tracking-[0.5em] text-2xl uppercase"
                                        placeholder="------"
                                        disabled={loading}
                                        autoComplete="off"
                                        autoFocus
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 h-px bg-cyan-400/20 blur-sm group-focus-within:h-1 transition-all"></div>
                                </div>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-3 text-red-400 text-sm font-medium flex items-center gap-2"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        {error}
                                    </motion.p>
                                )}
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium transition-colors"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || otp.length !== 6}
                                    className="flex-1 relative group px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? 'Verifying...' : 'Initialize'}
                                        {!loading && <ArrowRight size={18} />}
                                    </span>
                                    {!loading && (
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default OtpGate;
