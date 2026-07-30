import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Clock, Play, CheckCircle, ArrowRight, Sparkles, Loader2, AlertTriangle, ShieldAlert, FileDown, Timer, Users, Send, RefreshCw, XCircle, BookOpen, CalendarClock } from 'lucide-react';
import OtpGate from './OtpGate';
import { useAuthStore, api } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { SkeletonGrid } from './Skeleton';
import toast from 'react-hot-toast';
import { formatFullIST } from '../utils/dateUtils';

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
    const { user } = useAuthStore();
    const [rounds, setRounds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState(null);
    const [isOtpOpen, setIsOtpOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('ASSESSMENTS'); // 'ASSESSMENTS' or 'PRACTICE'

    // Team enrollment request state
    const [teamRequestStatus, setTeamRequestStatus] = useState(user?.teamRequest?.status || 'NONE');
    const [teamRequestMsg, setTeamRequestMsg] = useState(user?.teamRequest?.message || '');
    const [submittingRequest, setSubmittingRequest] = useState(false);

    // High-end animation variants for staggered entry
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 30 },
        visible: { 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: {
                type: "spring",
                damping: 20,
                stiffness: 100
            }
        }
    };

    // Guard: recovery logic must only run once per page session.
    const hasFiredRecovery = useRef(false);

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

    // Fallback recovery
    useEffect(() => {
        if (loading || hasFiredRecovery.current) return;
        hasFiredRecovery.current = true;

        const attemptRecovery = async () => {
            const backupKeys = Object.keys(localStorage).filter(k =>
                k.startsWith('backup_submission_')
            );
            if (backupKeys.length === 0) return;

            const statusMap = {};
            rounds.forEach(r => { statusMap[r._id] = r.mySubmissionStatus; });

            for (const key of backupKeys) {
                let backup;
                try {
                    backup = JSON.parse(localStorage.getItem(key));
                } catch {
                    localStorage.removeItem(key);
                    continue;
                }

                if (!backup?.roundId || !backup?.payload) {
                    localStorage.removeItem(key);
                    continue;
                }

                if (statusMap[backup.roundId] === 'COMPLETED') {
                    localStorage.removeItem(key);
                } else {
                    try {
                        await api.post(`/rounds/${backup.roundId}/submit`, backup.payload);
                        const updatedRes = await api.get('/rounds');
                        const updated = (updatedRes.data.data || []).find(
                            r => r._id === backup.roundId
                        );
                        if (updated?.mySubmissionStatus === 'COMPLETED') {
                            localStorage.removeItem(key);
                            setRounds(updatedRes.data.data || []);
                        }
                    } catch (err) {
                        console.error(`[Recovery] Re-fire failed for round ${backup.roundId}:`, err);
                    }
                }
            }
        };

        attemptRecovery();
    }, [loading, rounds]);

    const displayRounds = React.useMemo(() => {
        const groups = {};
        const singles = [];

        rounds.forEach(r => {
            if (r.testGroupId) {
                if (!groups[r.testGroupId]) groups[r.testGroupId] = [];
                groups[r.testGroupId].push(r);
            } else {
                singles.push(r);
            }
        });

        const result = [...singles];

        Object.values(groups).forEach(groupRounds => {
            groupRounds.sort((a, b) => (a.roundOrder || 1) - (b.roundOrder || 1));
            let activeRound = groupRounds[groupRounds.length - 1];
            for (const r of groupRounds) {
                if (r.mySubmissionStatus !== 'COMPLETED') {
                    activeRound = r;
                    break;
                }
            }
            const displayName = activeRound.name.split(' - Section')[0] || activeRound.name;
            result.push({
                ...activeRound,
                name: displayName,
                totalSections: groupRounds.length
            });
        });

        return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [rounds]);

    const getTimeWindowStatus = (round) => {
        const now = new Date();
        const start = round.startTime ? new Date(round.startTime) : null;
        const end = round.endTime ? new Date(round.endTime) : null;

        if (start && now < start) {
            const diff = start - now;
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(mins / 60);
            if (hours > 24) return { label: `Starts In ${Math.floor(hours / 24)}d`, type: 'WAITING', color: 'text-amber-500' };
            if (hours > 0) return { label: `Starts In ${hours}h ${mins % 60}m`, type: 'WAITING', color: 'text-amber-500' };
            return { label: `Starts In ${mins}m`, type: 'WAITING', color: 'text-amber-500' };
        }

        if (end && now > end) return { label: 'Test Window Closed', type: 'CLOSED', color: 'text-slate-400' };

        if (end) {
            const diff = end - now;
            const mins = Math.floor(diff / 60000);
            if (mins < 60) return { label: 'Ending soon', value: `${mins}m left`, type: 'ENDING', color: 'text-red-500' };
            const hours = Math.floor(mins / 60);
            if (hours < 24) return { label: 'Ends today', value: `${hours}h left`, type: 'ENDING', color: 'text-indigo-500' };
        }
        return null;
    };

    // ── Slot-based gating ────────────────────────────────────────────────────
    const getSlotStatus = (round) => {
        if (!round.mySlot) return null;
        const now = new Date();
        const start = new Date(round.mySlot.startTime);
        const end = new Date(round.mySlot.endTime);
        if (now < start) {
            const diff = start - now;
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(mins / 60);
            const label = hours > 0 ? `Slot in ${hours}h ${mins % 60}m` : `Slot in ${mins}m`;
            return { type: 'WAITING', label, color: 'text-amber-500' };
        }
        if (now > end) return { type: 'CLOSED', label: 'Slot Ended', color: 'text-slate-400' };
        return { type: 'ACTIVE', label: round.mySlot.label, color: 'text-emerald-500' };
    };

    const handleRoundClick = (round) => {
        const isPractice = round.type === 'PRACTICE' || round.type === 'PRACTISE';

        // If it's a practice round, bypass OTP/status checks and start session
        if (isPractice) {
            if (round.myPracticeStatus === 'SUBMITTED' || round.myPracticeStatus === 'COMPLETED') {
                toast.success('Practice session complete.');
                return;
            }
            if (round.myPracticeStatus === 'IN_PROGRESS') {
                navigate(`/practice/${round._id}`);
            } else {
                handlePracticeStart(round._id);
            }
            return;
        }

        const windowStatus = getTimeWindowStatus(round);
        if (windowStatus?.type === 'WAITING') {
            toast.error(`Assessment starts at ${formatFullIST(round.startTime)}.`);
            return;
        }
        if (windowStatus?.type === 'CLOSED' && round.mySubmissionStatus !== 'IN_PROGRESS') {
            toast.error('The testing window for this assessment has closed.');
            return;
        }

        // Slot gating
        const slotStatus = getSlotStatus(round);
        if (slotStatus?.type === 'WAITING') {
            toast.error(`Your slot hasn't started yet. ${slotStatus.label}.`);
            return;
        }
        if (slotStatus?.type === 'CLOSED' && round.mySubmissionStatus !== 'IN_PROGRESS') {
            toast.error('Your assigned slot has ended.');
            return;
        }

        if (round.mySubmissionStatus === 'SUBMITTED' || round.mySubmissionStatus === 'COMPLETED') {
            toast.success('Session complete. Assessment data is sealed.');
            return;
        }

        if (round.status === 'WAITING_FOR_OTP' || (round.status === 'RUNNING' && !round.mySubmissionStatus)) {
            setSelectedRound(round);
            setIsOtpOpen(true);
        } else if (round.status === 'RUNNING' || round.mySubmissionStatus === 'IN_PROGRESS') {
            navigate(`/arena/${round._id}`);
        }
    };

    const handleOtpUnlock = () => {
        setIsOtpOpen(false);
        if (selectedRound) navigate(`/arena/${selectedRound._id}`);
        setSelectedRound(null);
    };

    const handlePracticeStart = async (roundId) => {
        try {
            await api.post(`/rounds/${roundId}/practice-start`);
            navigate(`/practice/${roundId}`);
        } catch (e) {
            toast.error(e.response?.data?.message || e.response?.data?.error || 'Failed to start practice session.');
        }
    };

    const handleTeamRequest = async () => {
        setSubmittingRequest(true);
        try {
            await api.post('/auth/team-request');
            setTeamRequestStatus('PENDING');
            setTeamRequestMsg('');
            toast.success('Team enrollment request submitted successfully.');
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to submit request.');
        } finally {
            setSubmittingRequest(false);
        }
    };

    return (
        <>
            {/* Header Section */}
            <header className="h-24 bg-white/70 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-8 shrink-0 shadow-sm relative z-40">
                <div className="flex items-center gap-4">
                
                    <img src="./codecirclelogo.png" className="size-10" />
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">CodeCircle <span className="text-indigo-600">Arena</span></h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Terminal Protocol Active</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1">
                            Student: <span className="font-mono font-bold text-slate-700">{user?.name || 'Unknown'}</span> ({user?.studentId})
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">System Live</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto relative z-10 px-4 sm:px-6 py-8 sm:py-12 scrollbar-hide">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Team Enrollment Banner */}
                    {!user?.team && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4
                                ${teamRequestStatus === 'PENDING' ? 'bg-amber-50 border-amber-200' :
                                teamRequestStatus === 'REJECTED' ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-200'}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-xl ${teamRequestStatus === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                                    teamRequestStatus === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {teamRequestStatus === 'PENDING' ? <Loader2 size={18} className="animate-spin" /> :
                                        teamRequestStatus === 'REJECTED' ? <XCircle size={18} /> : <Users size={18} />}
                                </div>
                                <div>
                                    <p className={`font-black text-sm ${teamRequestStatus === 'PENDING' ? 'text-amber-800' :
                                        teamRequestStatus === 'REJECTED' ? 'text-red-800' : 'text-indigo-800'}`}>
                                        {teamRequestStatus === 'PENDING' ? 'Team Enrollment Request Pending' :
                                            teamRequestStatus === 'REJECTED' ? 'Team Enrollment Request Rejected' : 'No Team Assigned'}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${teamRequestStatus === 'PENDING' ? 'text-amber-600' :
                                        teamRequestStatus === 'REJECTED' ? 'text-red-600' : 'text-indigo-500'}`}>
                                        {teamRequestStatus === 'PENDING' ? 'Your request has been submitted. Awaiting admin review.' :
                                            teamRequestStatus === 'REJECTED' ? (teamRequestMsg || 'Your request was rejected.') :
                                                'You are not assigned to any team. Request enrollment to participate.'}
                                    </p>
                                </div>
                            </div>
                            {teamRequestStatus === 'NONE' && (
                                <button onClick={handleTeamRequest} disabled={submittingRequest} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-sm disabled:opacity-60">
                                    {submittingRequest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enrollment Request
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* Highlighted Team Identity Card */}
                    {user?.team && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border border-slate-200/60 rounded-4xl p-6 sm:p-8 shadow-xl shadow-slate-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-8 text-indigo-50/50 -rotate-12 transition-transform group-hover:rotate-0">
                                <Users size={120} />
                            </div>
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="p-4 bg-linear-to-tr from-indigo-500 to-indigo-700 text-white rounded-3xl shadow-lg shadow-indigo-200">
                                    <Users size={32} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                                        Assigned Squad
                                    </h2>
                                    <p className="text-3xl font-black text-slate-800 tracking-tight capitalize leading-tight">
                                        {user.team.name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:items-end gap-3 relative z-10 w-full sm:w-auto">
                                <div className="px-5 py-2 bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest rounded-2xl border border-emerald-100/50 shadow-sm shadow-emerald-100/30 flex items-center gap-2 self-start sm:self-auto">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    Active Deployment
                                </div>
                                
                                {user.team.members?.length > 0 && (
                                    <div className="flex flex-col sm:items-end gap-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Squad Roster</p>
                                        <div className="flex flex-wrap sm:justify-end gap-2 max-w-sm sm:max-w-md">
                                            {user.team.members.map((member, i) => (
                                                <div 
                                                    key={i} 
                                                    className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300
                                                        ${member._id === user._id 
                                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-100 scale-105' 
                                                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200 hover:text-slate-700'}`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${member._id === user._id ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
                                                    {member.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl mt-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team Reference</span>
                                    <span className="text-[10px] font-bold font-mono text-slate-600 tracking-tight">#{user.team._id?.slice(-8).toUpperCase() || 'ROOT-NODE'}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div>
                        <div className="flex items-center gap-6 mb-6 border-b border-slate-100">
                            <button
                                onClick={() => setActiveTab('ASSESSMENTS')}
                                className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'ASSESSMENTS' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Active Assessments
                                {activeTab === 'ASSESSMENTS' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                            </button>
                            {user?.role === 'STUDENT' && (
                                <button
                                    onClick={() => setActiveTab('PRACTICE')}
                                    className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'PRACTICE' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Practice Mode
                                    {activeTab === 'PRACTICE' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                                </button>
                            )}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Sparkles className="text-indigo-500" size={28} />
                            {activeTab === 'ASSESSMENTS' ? 'Available Assessments' : 'Practice Protocol'}
                        </h2>
                        <p className="text-slate-500 text-sm mt-2 max-w-xl leading-relaxed">
                            {loading ? 'Scanning server nodes...' : activeTab === 'ASSESSMENTS' ? 'Select an active assessment to initialize your session.' : 'Hone your skills with these designated practice rounds.'}
                        </p>
                    </div>

                    {loading ? <SkeletonGrid count={6} /> : (() => {
                        const filteredRounds = displayRounds.filter(r => {
                            const isPractice = r.type === 'PRACTICE' || r.type === 'PRACTISE';
                            if (activeTab === 'PRACTICE') return isPractice;
                            // Assessments tab only shows non-practice rounds
                            return !isPractice;
                        });

                        if (filteredRounds.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-300 rounded-3xl bg-white/50">
                                    <Lock size={48} className="text-slate-300 mb-4" />
                                    <p className="text-lg font-black text-slate-600 uppercase">{activeTab === 'ASSESSMENTS' ? 'NO ACTIVE ASSESSMENTS' : 'NO PRACTICE ROUNDS AVAILABLE'}</p>
                                </div>
                            );
                        }

                        return (
                            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <AnimatePresence mode="popLayout">
                                    {filteredRounds.map((round) => {
                                    const eligibility = round.eligibility || { eligible: true };
                                    const isEligible = eligibility.eligible !== false;
                                    const isPractice = round.type === 'PRACTICE' || round.type === 'PRACTISE';
                                    
                                    let config = isEligible ? statusConfig[round.status] : {
                                        icon: ShieldAlert, label: 'RESTRICTED', bg: 'bg-red-50', border: 'border-red-100', color: 'text-red-500', badge: 'border-red-200 bg-red-50 text-red-600'
                                     };

                                    if (isEligible && (round.mySubmissionStatus === 'SUBMITTED' || round.mySubmissionStatus === 'COMPLETED')) {
                                        config = { ...statusConfig['COMPLETED'], label: 'Session Complete' };
                                    }

                                    // For practice rounds, we use a simpler status
                                    if (isPractice) {
                                        const isFinished = round.myPracticeStatus === 'SUBMITTED' || round.myPracticeStatus === 'COMPLETED';
                                        config = {
                                            icon: BookOpen,
                                            label: isFinished ? 'Completed' : round.myPracticeStatus === 'IN_PROGRESS' ? 'In Progress' : 'Available',
                                            bg: isFinished ? 'bg-emerald-50' : 'bg-indigo-50',
                                            border: isFinished ? 'border-emerald-200' : 'border-indigo-100',
                                            color: isFinished ? 'text-emerald-500' : 'text-indigo-600',
                                            badge: isFinished ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                        };
                                    }

                                    const Icon = config.icon;
                                    const windowStatus = getTimeWindowStatus(round);
                                    const slotStatus = getSlotStatus(round);
                                    const isWindowRestricted = !isPractice && (
                                        windowStatus?.type === 'WAITING' ||
                                        (windowStatus?.type === 'CLOSED' && round.mySubmissionStatus !== 'IN_PROGRESS') ||
                                        slotStatus?.type === 'WAITING' ||
                                        (slotStatus?.type === 'CLOSED' && round.mySubmissionStatus !== 'IN_PROGRESS')
                                    );
                                    const isFinished = isPractice ? (round.myPracticeStatus === 'SUBMITTED' || round.myPracticeStatus === 'COMPLETED') : (round.mySubmissionStatus === 'SUBMITTED' || round.mySubmissionStatus === 'COMPLETED');
                                    const isInteractable = isPractice ? !isFinished : ((round.status === 'WAITING_FOR_OTP' || round.status === 'RUNNING') && isEligible && !isWindowRestricted && !isFinished);
                                    const isLive = !isPractice && round.status === 'RUNNING' && isEligible && !isWindowRestricted && !isFinished;

                                    return (
                                        <motion.div
                                            key={round._id} layout variants={itemVariants}
                                            whileHover={isInteractable ? { scale: 1.03, translateY: -8 } : { dropShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
                                            onClick={() => handleRoundClick(round)}
                                            className={`group relative overflow-hidden rounded-4xl p-8 transition-all duration-500 
                                                ${isInteractable 
                                                    ? 'cursor-pointer shadow-xl bg-white/70 border border-white/40 hover:bg-white/80' 
                                                    : 'shadow-sm opacity-60 grayscale cursor-not-allowed bg-white/40 border border-slate-100'} 
                                                ${isLive ? 'border-2 border-emerald-400 ring-8 ring-emerald-50/50' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-8">
                                                <div className={`p-3 rounded-2xl border ${config.bg} ${config.border} ${config.color}`}><Icon size={24} /></div>
                                                <div className="flex flex-col items-end gap-2 text-right">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${config.badge}`}>{config.label}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="text-xl font-black text-slate-900 leading-tight">{round.name}</h3>
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                        <Clock size={14} /> {round.durationMinutes} Minutes
                                                        {round.totalSections > 1 && <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500 bg-indigo-50 px-2 rounded-md">{round.totalSections} Sections</span>}
                                                    </div>
                                                    {!isPractice && windowStatus && <div className={`flex items-center gap-1.5 text-[11px] font-bold ${windowStatus.color}`}><Timer size={12} /> {windowStatus.label}</div>}
                                                    {!isPractice && round.mySlot && (
                                                        <div className={`flex items-center gap-1.5 text-[11px] font-bold ${slotStatus?.color || 'text-indigo-500'}`}>
                                                            <CalendarClock size={12} />
                                                            <span>{round.mySlot.label}</span>
                                                            <span className="text-[9px] text-slate-400 font-medium ml-0.5">
                                                                {new Date(round.mySlot.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                                                                –{new Date(round.mySlot.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                    {isPractice ? (isFinished ? 'Verdict: Sealed' : 'Mode: Manual Validation') : `Status: ${config.label}`}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {isInteractable && <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white transform group-hover:translate-x-1"><ArrowRight size={14} /></div>}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })()}
                </div>
            </main>

            <OtpGate isOpen={isOtpOpen} roundId={selectedRound?._id} roundName={selectedRound?.name} onClose={() => setIsOtpOpen(false)} onUnlock={handleOtpUnlock} />
        </>
    );
};

export default StudentDashboard;