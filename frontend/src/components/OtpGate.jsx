import React, { useState, useRef, useEffect } from 'react';
import { api } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ArrowRight, X, KeySquare } from 'lucide-react';

const OtpGate = ({ roundId, roundName, isOpen, onClose, onUnlock }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef([]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
            setError(null);
            // Auto-focus first input on mount
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [isOpen]);

    const handleChange = (index, value) => {
        // Only allow alphanumeric characters
        if (!/^[a-zA-Z0-9]*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.toUpperCase();
        setOtp(newOtp);

        // Auto-advance to next input
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Auto-retreat on backspace if current is empty
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text/plain').slice(0, 6).toUpperCase();
        if (!/^[A-Z0-9]+$/.test(pastedData)) return;

        const newOtp = [...otp];
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);

        // Focus the appropriate box after paste
        const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
        inputRefs.current[focusIndex]?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');

        if (otpString.length !== 6) {
            setError('Access Key must be exactly 6 characters.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await api.post(`/rounds/${roundId}/start`, { startOtp: otpString });
            onUnlock(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid Key. Authorization Denied.');
            // Clear inputs on error for rapid retry
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {/* The backdrop remains slightly dark to draw focus to the light modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.15)]"
                >
                    {/* Animated Top Scanner Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[scan_2s_ease-in-out_infinite]" />

                    <div className="p-8">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-200 blur-md opacity-50 rounded-full" />
                                    <div className="relative p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
                                        <KeySquare size={24} />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight text-slate-900">Secure Enclave</h2>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1 truncate max-w-[200px]">{roundName}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200">
                                <X size={16} />
                            </button>
                        </div>

                        <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
                            Enter the 6-character cryptographic sequence provided by your Administrator. Session limits will engage upon verification.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <div className="flex justify-center sm:justify-between gap-1 sm:gap-2" onPaste={handlePaste}>
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={el => inputRefs.current[index] = el}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            disabled={loading}
                                            autoComplete="off"
                                            className="w-10 h-13 xs:w-12 xs:h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-black font-mono text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none disabled:opacity-50 selection:bg-indigo-100"
                                        />
                                    ))}
                                </div>

                                {/* Error Output */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            className="text-red-600 text-xs font-bold flex items-center justify-center gap-2 bg-red-50 py-3 rounded-xl border border-red-200"
                                        >
                                            <ShieldAlert size={16} />
                                            {error}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold transition-all disabled:opacity-50 shadow-sm hover:border-slate-300"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || otp.join('').length !== 6}
                                    className="flex-[2] relative group px-4 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black tracking-wide disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all overflow-hidden shadow-lg shadow-indigo-200"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? (
                                            <span className="animate-pulse">DECRYPTING...</span>
                                        ) : (
                                            <>
                                                INITIALIZE <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>

                {/* CSS Animation Keyframes for the scanner line */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes scan {
                        0% { transform: translateX(-100%); }
                        50% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                    }
                `}} />
            </div>
        </AnimatePresence>
    );
};

export default OtpGate;