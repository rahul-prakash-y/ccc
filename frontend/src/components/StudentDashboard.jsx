import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
    Lock, Clock, Play, CheckCircle, LogOut, ArrowRight, Sparkles, UserCheck, 
    Loader2, AlertTriangle, Check, ShieldAlert, Power, Award, Timer,
    LayoutDashboard, CheckCircle2, AlertCircle, BarChart3
} from 'lucide-react';
import OtpGate from './OtpGate';
import ProfileModal from './ProfileModal';
import { useAuthStore, api } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { SkeletonGrid } from './Skeleton';

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
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
    const [attendanceOtp, setAttendanceOtp] = useState('');
    const [marking, setMarking] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState(null); // 'success', 'error', null
    const [attendanceMessage, setAttendanceMessage] = useState('');

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

            // The "Active" round is the first one they haven't completed
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

        if (end && now > end) {
            return { label: 'Test Window Closed', type: 'CLOSED', color: 'text-slate-400' };
        }

        if (end) {
            const diff = end - now;
            const mins = Math.floor(diff / 60000);
            if (mins < 60) return { label: 'Ending soon', value: `${mins}m left`, type: 'ENDING', color: 'text-red-500' };
            const hours = Math.floor(mins / 60);
            if (hours < 24) return { label: 'Ends today', value: `${hours}h left`, type: 'ENDING', color: 'text-indigo-500' };
        }

        return null;
    };

    const handleRoundClick = (round) => {
        const windowStatus = getTimeWindowStatus(round);
        if (windowStatus?.type === 'WAITING') {
            alert(`This assessment is scheduled to start at ${new Date(round.startTime).toLocaleString()}.`);
            return;
        }
        if (windowStatus?.type === 'CLOSED' && round.mySubmissionStatus !== 'IN_PROGRESS') {
            alert('The testing window for this assessment has closed.');
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
        if (selectedRound) {
            navigate(`/arena/${selectedRound._id}`);
        }
        setSelectedRound(null);
    };

    const handleDownloadCertificate = async (roundId, roundName) => {
        try {
            const res = await api.get(`/rounds/${roundId}/certificate`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${roundName.replace(/\s+/g, '_')}_certificate.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error('Failed to download certificate:', e);
            alert('Failed to download certificate. Please contact administrator.');
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700 relative overflow-hidden">

            {/* Ambient Background Glows for "Arena" feel */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Glassmorphism Header */}
            <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 shadow-sm transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Code Circle Club <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md text-sm border border-indigo-100">Fint & Friends</span>
                        </h1>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1">
                            Student: <span className="font-mono font-bold text-slate-700">{user?.name || 'Unknown'}</span> ({user?.studentId})
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Profile Button */}
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
                        >
                            <UserCheck size={14} />
                            My Profile
                        </button>

                        {/* Practice Test Button */}
                        <button
                            onClick={() => {
                                const practiceRound = displayRounds.find(r => r.type === 'PRACTICE' && (r.status === 'RUNNING' || r.status === 'WAITING_FOR_OTP'));
                                if (practiceRound) {
                                    handleRoundClick(practiceRound);
                                } else {
                                    import('react-hot-toast').then(({ default: toast }) => toast.error("No active Practice Test available at the moment."));
                                }
                            }}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#f59e0b] bg-[#fef3c7] border border-[#fde68a] rounded-xl hover:bg-[#f59e0b] hover:text-white transition-all active:scale-95 shadow-sm"
                        >
                            <Play size={14} />
                            <span className="hidden sm:inline">Practice Test</span>
                            <span className="inline sm:hidden">Practice</span>
                        </button>

                        {/* Standalone Attendance Button */}
                        <button
                            onClick={() => setIsAttendanceOpen(true)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm"
                        >
                            <UserCheck size={14} />
                            <span className="hidden sm:inline">Mark Attendance</span>
                            <span className="inline sm:hidden">Attend</span>
                        </button>

                        <div className="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">System Live</span>
                        </div>

                        {/* Performance Report Link */}
                        <Link
                            to="/performance"
                            className="hidden xs:flex items-center gap-2 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm"
                        >
                            <BarChart3 size={14} />
                            <span className="hidden sm:inline">Report</span>
                        </Link>

                        <button
                            onClick={logout}
                            className="group flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-xl px-3 sm:px-4 py-2 transition-all shadow-sm active:scale-95"
                        >
                            <Power size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span className="hidden xs:inline sm:inline">Disconnect</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Sparkles className="text-indigo-500" size={28} />
                            Available Assessments
                        </h2>
                        <p className="text-slate-500 text-sm mt-2 max-w-xl leading-relaxed">
                            {loading ? 'Scanning server nodes for active deployments...' : 'Select an active assessment to initialize your session. Ensure you have the required access keys.'}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-4">
                        <SkeletonGrid count={6} />
                    </div>
                ) : displayRounds.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-300 rounded-3xl bg-white/50 backdrop-blur-sm"
                    >
                        <Lock size={48} className="text-slate-300 mb-4" />
                        <p className="text-lg font-black text-slate-600">NO ACTIVE ASSESSMENTS</p>
                        <p className="text-sm text-slate-400 mt-2">Stand by for administrator deployment.</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {displayRounds.map((round, index) => {
                                const eligibility = round.eligibility || { eligible: true };
                                const isEligible = eligibility.eligible !== false;

                                let config = isEligible ? statusConfig[round.status] : {
                                    icon: ShieldAlert,
                                    label: 'RESTRICTED',
                                    bg: 'bg-red-50',
                                    border: 'border-red-100',
                                    color: 'text-red-500',
                                    badge: 'border-red-200 bg-red-50 text-red-600'
                                };

                                if (isEligible && (round.mySubmissionStatus === 'SUBMITTED' || round.mySubmissionStatus === 'COMPLETED')) {
                                    config = {
                                        ...statusConfig['COMPLETED'],
                                        label: round.mySubmissionStatus === 'SUBMITTED' ? 'Response Locked' : 'Mission Accomplished'
                                    };
                                }

                                const Icon = config.icon;
                                const windowStatus = getTimeWindowStatus(round);
                                const isWindowRestricted = windowStatus?.type === 'WAITING' || (windowStatus?.type === 'CLOSED' && round.mySubmissionStatus !== 'IN_PROGRESS');
                                const isInteractable = (round.status === 'WAITING_FOR_OTP' || round.status === 'RUNNING') && isEligible && !isWindowRestricted;
                                const isLive = round.status === 'RUNNING' && isEligible && !isWindowRestricted;

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
                                        {isLive && <div className="absolute inset-0 bg-linear-to-br from-emerald-50/50 to-transparent pointer-events-none" />}

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

                                                {!isEligible ? (
                                                    <div className="bg-red-50/50 rounded-xl p-3 border border-red-100/50">
                                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none mb-1">Rank Requirement Failed</p>
                                                        <p className="text-xs font-bold text-red-800 leading-tight">
                                                            Top {eligibility.maxRank} only. Your rank: #{eligibility.rank}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                                            <Clock size={14} className="text-slate-400" />
                                                            {round.testDurationMinutes || round.durationMinutes} Minutes Limit
                                                            {round.totalSections > 1 && (
                                                                <>
                                                                    <span className="text-slate-300">|</span>
                                                                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500 bg-indigo-50 px-2 rounded-md">
                                                                        {round.totalSections} Sections
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {(() => {
                                                            const windowStatus = getTimeWindowStatus(round);
                                                            if (!windowStatus) return null;
                                                            return (
                                                                <div className={`flex items-center gap-1.5 text-[11px] font-bold ${windowStatus.color}`}>
                                                                    <Timer size={12} />
                                                                    {windowStatus.label}
                                                                    {windowStatus.value && <span className="opacity-60 ml-1">({windowStatus.value})</span>}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Interactive Footer */}
                                        <div className={`mt-8 pt-4 border-t transition-colors flex items-center justify-between
                                            ${isLive ? 'border-emerald-100/50' : 'border-slate-100'}
                                        `}>
                                            {round.hasCertificate ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownloadCertificate(round._id, round.name);
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black transition-all active:scale-95"
                                                >
                                                    <Award size={12} />
                                                    DOWNLOAD CERTIFICATE
                                                </button>
                                            ) : round.type === 'PRACTICE' && isInteractable ? (
                                                <button
                                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-md shadow-amber-200 animate-pulse"
                                                >
                                                    <Sparkles size={12} />
                                                    ATTEND PRACTICE
                                                </button>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    {!isEligible ? 'Access Locked' :
                                                        round.mySubmissionStatus === 'COMPLETED' ? 'Evaluation Complete' :
                                                            round.mySubmissionStatus === 'SUBMITTED' ? 'Awaiting Evaluation' :
                                                                round.status === 'LOCKED' ? 'Access Restricted' :
                                                                    round.status === 'COMPLETED' ? 'Data Sealed' :
                                                                        round.status === 'WAITING_FOR_OTP' ? 'Requires Auth Key' :
                                                                            round.type === 'PRACTICE' ? 'Practice Mode' : 'Session Ready'}
                                                </p>
                                            )}

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

            <ProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />

            {/* Attendance Modal */}
            <AnimatePresence>
                {isAttendanceOpen && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                        <UserCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 leading-none">Mark Attendance</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                                            Roll Call Protocol
                                        </p>
                                    </div>
                                </div>

                                {attendanceStatus === 'success' ? (
                                    <div className="py-4 text-center space-y-3">
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                            <Check size={24} />
                                        </div>
                                        <h4 className="font-black text-slate-900">Attendance Marked!</h4>
                                        <p className="text-sm text-slate-500 font-medium">{attendanceMessage}</p>
                                        <button
                                            onClick={() => {
                                                setIsAttendanceOpen(false);
                                                setAttendanceStatus(null);
                                            }}
                                            className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 transition-colors"
                                        >
                                            CONTINUE
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                Enter Attendance Key
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={attendanceOtp}
                                                onChange={e => setAttendanceOtp(e.target.value.toUpperCase())}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-center text-2xl font-mono font-black tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                                placeholder="••••••"
                                                autoFocus
                                            />
                                            {attendanceStatus === 'error' && (
                                                <p className="text-red-500 text-[10px] font-bold mt-2 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> {attendanceMessage}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => setIsAttendanceOpen(false)}
                                                className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-100 transition-colors border border-slate-100"
                                            >
                                                CANCEL
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    setMarking(true);
                                                    setAttendanceStatus(null);
                                                    try {
                                                        const res = await api.post('/attendance/mark', { otp: attendanceOtp });
                                                        setAttendanceStatus('success');
                                                        setAttendanceMessage(res.data.message);
                                                    } catch (e) {
                                                        setAttendanceStatus('error');
                                                        setAttendanceMessage(e.response?.data?.error || 'Validation failed');
                                                    } finally {
                                                        setMarking(false);
                                                    }
                                                }}
                                                disabled={marking || attendanceOtp.length < 6}
                                                className="flex-2 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {marking ? <Loader2 size={14} className="animate-spin" /> : 'VERIFY & MARK'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentDashboard;