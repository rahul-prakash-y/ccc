import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Clock, Play, CheckCircle, LogOut, ArrowRight, Sparkles } from 'lucide-react';
import OtpGate from './OtpGate';
import { useAuthStore, api } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const statusConfig = {
    LOCKED: { 
        icon: Lock, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', 
        badge: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Classified' 
    },
    WAITING_FOR_OTP: { 
        icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', 
        badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Awaiting Auth' 
    },
    RUNNING: { 
        icon: Play, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', 
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Arena Live' 
    },
    COMPLETED: { 
        icon: CheckCircle, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200', 
        badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Mission Accomplished' 
    }
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [rounds, setRounds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState(null);
    const [isOtpOpen, setIsOtpOpen] = useState(false);

    const fetchRounds = useCallback(async () => {
        try {
            const res = await api.get('/rounds');
            setRounds(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch rounds:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRounds();
    }, [fetchRounds]);

    const handleRoundClick = (round) => {
        if (round.status === 'WAITING_FOR_OTP' || (round.status === 'RUNNING' && !round.mySubmissionStatus)) {
            setSelectedRound(round);
            setIsOtpOpen(true);
        } else if (round.status === 'RUNNING' || round.mySubmissionStatus === 'IN_PROGRESS') {
            navigate(`/arena/${round._id}`);
        }
    };

    const handleOtpUnlock = () => {
        setIsOtpOpen(false);
        if (selectedRound) {
            navigate(`/arena/${selectedRound._id}`);
        }
        setSelectedRound(null);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700 relative overflow-hidden">
            
            {/* Ambient Background Glows for "Arena" feel */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Glassmorphism Header */}
            <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 shadow-sm transition-all">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Code Circuit <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md text-sm border border-indigo-100">Fint & Friends</span>
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Operative: <span className="font-mono font-bold text-slate-700">{user?.name || 'Unknown'}</span> ({user?.studentId})
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">System Live</span>
                        </div>
                        <button 
                            onClick={logout}
                            className="group flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-xl px-4 py-2 transition-all shadow-sm active:scale-95"
                        >
                            <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" /> 
                            <span className="hidden sm:inline">Disconnect</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 relative z-10 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Sparkles className="text-indigo-500" size={28} />
                            Available Arenas
                        </h2>
                        <p className="text-slate-500 text-sm mt-2 max-w-xl leading-relaxed">
                            {loading ? 'Scanning server nodes for active deployments...' : 'Select an active round to initialize your session. Ensure you have the required access keys.'}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Grid...</p>
                    </div>
                ) : rounds.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-300 rounded-3xl bg-white/50 backdrop-blur-sm"
                    >
                        <Lock size={48} className="text-slate-300 mb-4" />
                        <p className="text-lg font-black text-slate-600">NO ACTIVE ARENAS</p>
                        <p className="text-sm text-slate-400 mt-2">Stand by for administrator deployment.</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {rounds.map((round, index) => {
                                const config = statusConfig[round.status];
                                const Icon = config.icon;
                                const isInteractable = round.status === 'WAITING_FOR_OTP' || round.status === 'RUNNING';
                                const isLive = round.status === 'RUNNING';

                                return (
                                    <motion.div
                                        key={round._id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05, ease: "easeOut" }}
                                        whileHover={isInteractable ? { y: -6, scale: 1.02 } : {}}
                                        whileTap={isInteractable ? { scale: 0.98 } : {}}
                                        onClick={() => handleRoundClick(round)}
                                        className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 bg-white
                                            ${isInteractable ? 'cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10' : 'opacity-75 cursor-not-allowed shadow-sm grayscale-[0.2]'}
                                            ${isLive ? 'border-2 border-emerald-400/50' : 'border border-slate-200'}
                                        `}
                                    >
                                        {/* Subtle internal gradient for live rounds */}
                                        {isLive && <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent pointer-events-none" />}

                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-8">
                                                <div className={`p-3 rounded-2xl border ${config.bg} ${config.border} ${config.color} transition-transform group-hover:scale-110`}>
                                                    <Icon size={24} />
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${config.badge}`}>
                                                    {config.label}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{round.name}</h3>
                                                
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                                    <Clock size={14} className="text-slate-400" />
                                                    {round.durationMinutes} Minutes Limit
                                                </div>
                                            </div>
                                        </div>

                                        {/* Interactive Footer */}
                                        <div className={`mt-8 pt-4 border-t transition-colors flex items-center justify-between
                                            ${isLive ? 'border-emerald-100/50' : 'border-slate-100'}
                                        `}>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                {round.status === 'LOCKED' ? 'Access Restricted' :
                                                 round.status === 'COMPLETED' ? 'Data Sealed' :
                                                 round.status === 'WAITING_FOR_OTP' ? 'Requires Auth Key' :
                                                 'Session Ready'}
                                            </p>
                                            
                                            {isInteractable && (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isLive ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            <OtpGate
                isOpen={isOtpOpen}
                roundId={selectedRound?._id}
                roundName={selectedRound?.name}
                onClose={() => setIsOtpOpen(false)}
                onUnlock={handleOtpUnlock}
            />
        </div>
    );
};

export default StudentDashboard;