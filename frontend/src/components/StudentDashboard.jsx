import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, Clock, Play, CheckCircle, LogOut } from 'lucide-react';
import OtpGate from './OtpGate';
import { useAuthStore, api } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const statusConfig = {
    LOCKED: { icon: Lock, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-500 border-gray-200', label: 'Locked' },
    WAITING_FOR_OTP: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Waiting for OTP' },
    RUNNING: { icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Running' },
    COMPLETED: { icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Submitted' }
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
        // If it's a RUNNING round BUT the student hasn't legally started it yet (no submission), 
        // they MUST go through the OTP gate to initialize their timer/session.
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
        <div className="min-h-screen bg-slate-50 text-gray-900 font-sans">
            {/* Top nav bar */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">Code Circuit Club</h1>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">Welcome back, {user?.name || 'Participant'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-700 tracking-wide">LIVE</span>
                        </div>
                        <button onClick={logout}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-50"
                        >
                            <LogOut size={14} /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">Mission Objectives</h2>
                    <p className="text-gray-400 text-sm">
                        {loading ? 'Analyzing active environments...' : 'Click on an available round to enter.'}
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : rounds.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 font-mono border-2 border-dashed border-gray-200 rounded-3xl">
                        NO ACTIVE ROUNDS FOUND. AWAIT COMMAND.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {rounds.map((round, index) => {
                            const config = statusConfig[round.status];
                            const Icon = config.icon;
                            const isInteractable = round.status === 'WAITING_FOR_OTP' || round.status === 'RUNNING';

                            return (
                                <motion.div
                                    key={round._id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.07 }}
                                    whileHover={isInteractable ? { y: -4, scale: 1.015 } : {}}
                                    onClick={() => handleRoundClick(round)}
                                    className={`relative overflow-hidden rounded-2xl p-6 border-2 transition-all duration-300 bg-white
                                    ${config.border}
                                    ${isInteractable ? 'cursor-pointer hover:shadow-lg' : 'opacity-70 cursor-default'}
                                `}
                                >
                                    {/* Top accent line matching status */}
                                    <div className={`absolute top-0 left-0 right-0 h-1 ${round.status === 'RUNNING' ? 'bg-emerald-400' :
                                        round.status === 'WAITING_FOR_OTP' ? 'bg-amber-400' :
                                            round.status === 'COMPLETED' ? 'bg-indigo-400' : 'bg-gray-200'
                                        }`} />

                                    <div className="flex justify-between items-start mb-6 mt-1">
                                        <div className={`p-2.5 rounded-xl border ${config.bg} ${config.border} ${config.color}`}>
                                            <Icon size={20} />
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.badge}`}>
                                            {config.label}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-800 mb-1">{round.name}</h3>
                                    <p className="text-sm text-gray-400">
                                        {round.status === 'LOCKED' ? 'Access denied. Await admin signal.' :
                                            round.status === 'COMPLETED' ? 'Mission accomplished.' :
                                                round.status === 'WAITING_FOR_OTP' ? 'Enter OTP to unlock.' :
                                                    'In progress — click to resume.'}
                                    </p>
                                </motion.div>
                            );
                        })}
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
