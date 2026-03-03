import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Clock, Play, CheckCircle } from 'lucide-react';
import OtpGate from './OtpGate'; // Added import for OTP Gate

const roundsData = [
    { id: 1, name: 'SQL Contest', status: 'COMPLETED' },
    { id: 2, name: 'HTML/CSS Quiz', status: 'RUNNING' },
    { id: 3, name: 'UI/UX Challenge', status: 'WAITING_FOR_OTP' },
    { id: 4, name: 'Debug Challenge', status: 'LOCKED' },
    { id: 5, name: 'Mini Hackathon', status: 'LOCKED' }
];

const statusConfig = {
    LOCKED: { icon: Lock, color: 'text-gray-500', bg: 'bg-gray-800/50', border: 'border-gray-700', label: 'Locked 🔒' },
    WAITING_FOR_OTP: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/50', label: 'Waiting for OTP' },
    RUNNING: { icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/50', label: 'Running' },
    COMPLETED: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/50', label: 'Submitted' }
};

const StudentDashboard = () => {
    const [rounds, setRounds] = useState(roundsData);
    const [selectedRound, setSelectedRound] = useState(null);
    const [isOtpOpen, setIsOtpOpen] = useState(false);

    const handleRoundClick = (round) => {
        if (round.status === 'WAITING_FOR_OTP') {
            setSelectedRound(round);
            setIsOtpOpen(true);
        } else if (round.status === 'RUNNING') {
            console.log(`Resume ${round.name}... navigating to environment.`);
        }
    };

    const handleOtpUnlock = () => {
        // In a real app, this updates backend status to RUNNING
        setRounds(rounds.map(r => r.id === selectedRound.id ? { ...r, status: 'RUNNING' } : r));
        setIsOtpOpen(false);
        setSelectedRound(null);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-8 font-sans selection:bg-purple-500/30 relative">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-8">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400 bg-clip-text text-transparent"
                        >
                            Code Circuit Club
                        </motion.h1>
                        <p className="mt-2 text-gray-400 font-medium">Welcome back, Hacker. System online.</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center space-x-4 bg-gray-900/50 px-6 py-3 rounded-full border border-gray-800 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-sm font-semibold text-emerald-400 tracking-wider">SECURE CONNECTION</span>
                    </div>
                </header>

                {/* Rounds Grid */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <span className="text-cyan-400">{'//'}</span> Mission Objectives
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rounds.map((round, index) => {
                            const config = statusConfig[round.status];
                            const Icon = config.icon;
                            const isInteractable = round.status === 'WAITING_FOR_OTP' || round.status === 'RUNNING';

                            return (
                                <motion.div
                                    key={round.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={isInteractable ? { scale: 1.02, y: -5 } : {}}
                                    onClick={() => handleRoundClick(round)}
                                    className={`relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl border border-white/5 transition-all duration-300
                    ${config.bg} ${isInteractable ? 'cursor-pointer hover:border-white/20 hover:shadow-2xl' : 'opacity-80'}
                  `}
                                >
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                                    <div className="flex justify-between items-start mb-8">
                                        <div className={`p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/5 ${config.color}`}>
                                            <Icon size={24} />
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${config.border} ${config.color} bg-black/40`}>
                                            {config.label}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-gray-100 mb-2">{round.name}</h3>
                                        <p className="text-sm text-gray-400 truncate">
                                            {round.status === 'LOCKED' ? 'Access Denied. Await Admin Signal.' :
                                                round.status === 'COMPLETED' ? 'Mission Accomplished.' :
                                                    'System Ready. Proceed with caution.'}
                                        </p>
                                    </div>

                                    {round.status === 'RUNNING' && (
                                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
                                    )}
                                    {round.status === 'WAITING_FOR_OTP' && (
                                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl"></div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            </div>

            <OtpGate
                isOpen={isOtpOpen}
                roundName={selectedRound?.name}
                onClose={() => setIsOtpOpen(false)}
                onUnlock={handleOtpUnlock}
            />
        </div>
    );
};

export default StudentDashboard;
