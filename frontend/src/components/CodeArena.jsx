import React, { useState, useEffect, useCallback, useRef } from 'react';
import Split from 'react-split';
import Editor from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Terminal, Lock, Send, AlertTriangle, Save,
    ChevronLeft, ChevronRight, CheckCircle, HelpCircle, Code2, LogOut,
    Clock, ArrowRight,
    Loader2, Eye, EyeOff,
    Power
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { SkeletonCodeArena } from './Skeleton';
import SubmitButton from './SubmitButton';

import useContestTimer from '../hooks/useContestTimer';
import useAutoSave from '../hooks/useAutoSave';

const CodeArena = ({ language = 'javascript' }) => {
    const { roundId } = useParams();
    const navigate = useNavigate();
    const { updateUser } = useAuthStore();

    // Core State
    const [questions, setQuestions] = useState([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [pdfUrl, setPdfUrl] = useState(null);
    const [roundInfo, setRoundInfo] = useState(null);
    const [extraTimeMinutes, setExtraTimeMinutes] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
    const [showPreview, setShowPreview] = useState(true);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Anti-Cheat State
    const [isBanned, setIsBanned] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [isSubmittedBlock, setIsSubmittedBlock] = useState(false);

    // Submission State
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [endOtp, setEndOtp] = useState(['', '', '', '', '', '']); // Segmented State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const otpRefs = useRef([]);

    // --- Anti-Cheat Logic ---
    const handleCheatDetected = useCallback(async (cheatEvent) => {
        try {
            const res = await api.post(`/rounds/${roundId}/report-cheat`, cheatEvent);
            if (res.data.banned) {
                setIsBanned(true);
                setBanReason(res.data.reason);
                updateUser({ isBanned: true, banReason: res.data.reason });
            }
        } catch (err) {
            console.error("Anti-cheat sync failed:", err);
            if (err.response?.status === 403) {
                const reason = err.response?.data?.error || "Access Revoked";
                setIsBanned(true);
                setBanReason(reason);
                updateUser({ isBanned: true, banReason: reason });
            }
        }
    }, [roundId, updateUser]);

    // Round types where students must freely paste URLs (Figma / GitHub).
    // Anti-cheat listeners are completely skipped for these round types.
    const OPEN_ROUND_TYPES = ['UI_UX_CHALLENGE', 'MINI_HACKATHON'];

    useEffect(() => {
        // ── Open-round bypass ─────────────────────────────────────────────────
        // UI/UX and Mini Hackathon rounds require students to paste external URLs.
        // If roundInfo hasn't loaded yet, we also skip (no false positives on mount).
        if (!roundInfo || OPEN_ROUND_TYPES.includes(roundInfo.type)) return;

        const handlePaste = (e) => {
            e.preventDefault();
            handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'PASTE_DETECTED' });
        };
        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'TAB_SWITCH_DETECTED' });
            }
        };
        const handleBlur = () => {
            handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'WINDOW_BLUR_DETECTED' });
        };
        const blockAction = (e) => {
            e.preventDefault();
            handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'CONTEXT_MENU_DETECTED' });
        };
        const handleKeyDown = (e) => {
            // Block DevTools
            if (e.key === 'F12') {
                e.preventDefault();
                handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'DEV_TOOLS_DETECTED' });
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
                e.preventDefault();
                handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'DEV_TOOLS_DETECTED' });
            }
            // Block View Source
            if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
                e.preventDefault();
                handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'VIEW_SOURCE_DETECTED' });
            }
            // Block copy/paste/cut
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
                e.preventDefault();
                if (e.key === 'v') handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'PASTE_DETECTED' });
                else handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'COPY_CUT_DETECTED' });
            }
        };

        let initialWidth = window.innerWidth;
        const handleResize = () => {
            // If window width changes by more than 100px (loosened sensitivity), it's likely a split screen snap
            if (Math.abs(window.innerWidth - initialWidth) > 100) {
                handleCheatDetected({ type: 'CHEAT_FLAG', detail: 'SPLIT_SCREEN_DETECTED' });
                initialWidth = window.innerWidth; // Reset so we don't spam
            }
        };

        window.addEventListener('paste', handlePaste, { capture: true });
        window.addEventListener('copy', blockAction, { capture: true });
        window.addEventListener('cut', blockAction, { capture: true });
        window.addEventListener('contextmenu', blockAction, { capture: true });
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        window.addEventListener('resize', handleResize);
        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('paste', handlePaste, { capture: true });
            window.removeEventListener('copy', blockAction, { capture: true });
            window.removeEventListener('cut', blockAction, { capture: true });
            window.removeEventListener('contextmenu', blockAction, { capture: true });
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleCheatDetected, roundInfo]); // roundInfo in deps so guard re-evaluates after load

    // --- Data Loading ---
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setActiveIdx(0);
            try {
                // Attempt an auto-join first. If this is Round 2+, it inherits the clock and validates.
                // If this is Round 1, it will safely fail (403) and we proceed to load logic because StudentDashboard already unlocked it.
                await api.post(`/rounds/${roundId}/start`, { isAutoJoin: true }).catch(() => { });

                const res = await api.get(`/rounds/${roundId}/questions`);
                setQuestions(res.data.data.questions);
                setRoundInfo(res.data.data.round);
                setExtraTimeMinutes(res.data.data.round.extraTimeMinutes || 0);

                const draft = localStorage.getItem(`draft_${roundId}`);
                if (draft) {
                    try {
                        setAnswers(JSON.parse(draft));
                    } catch {
                        const initialAnswers = {};
                        res.data.data.questions.forEach((q, i) => initialAnswers[q._id] = i === 0 ? draft : '');
                        setAnswers(initialAnswers);
                    }
                } else {
                    const initialAnswers = {};
                    res.data.data.questions.forEach(q => initialAnswers[q._id] = '');
                    setAnswers(initialAnswers);
                }
            } catch (err) {
                if (err.response?.status === 403) {
                    if (err.response?.data?.reason === 'SUBMITTED_BLOCK') {
                        setIsSubmittedBlock(true);
                    } else {
                        setIsBanned(true);
                        setBanReason(err.response?.data?.reason || err.response?.data?.error || "Disqualified (Platform Security)");
                    }
                }
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [roundId]);

    // --- Hooks ---
    const { formattedTime, isTimeUp, isDangerZone } = useContestTimer({
        roundId,
        serverStartTime: roundInfo?.startTime,
        durationMinutes: roundInfo?.durationMinutes || 60,
        extraTimeMinutes,
        onTimeUp: () => setIsSubmitModalOpen(true),
        onCheatDetected: handleCheatDetected
    });

    const { saveStatus } = useAutoSave(answers, roundId, 60000, isTimeUp || isBanned, (responsePayload) => {
        if (responsePayload.extraTimeMinutes !== undefined && responsePayload.extraTimeMinutes !== extraTimeMinutes) {
            setExtraTimeMinutes(responsePayload.extraTimeMinutes);
        }
    });

    const handleAnswerChange = (questionId, value) => {
        if (!isTimeUp && !isBanned) {
            setAnswers(prev => {
                const newAnswers = { ...prev, [questionId]: value };
                localStorage.setItem(`draft_${roundId}`, JSON.stringify(newAnswers));
                return newAnswers;
            });
        }
    };

    // --- OTP Input Logic ---
    const handleOtpChange = (index, value) => {
        if (!/^[a-zA-Z0-9]*$/.test(value)) return;
        const newOtp = [...endOtp];
        newOtp[index] = value.toUpperCase();
        setEndOtp(newOtp);
        if (value && index < 5) otpRefs.current[index + 1].focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !endOtp[index] && index > 0) {
            otpRefs.current[index - 1].focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text/plain').slice(0, 6).toUpperCase();
        if (!/^[A-Z0-9]+$/.test(pastedData)) return;
        const newOtp = [...endOtp];
        for (let i = 0; i < pastedData.length; i++) newOtp[i] = pastedData[i];
        setEndOtp(newOtp);
        const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
        otpRefs.current[focusIndex]?.focus();
    };

    const handleFinalSubmit = async (e) => {
        if (e) e.preventDefault();

        // Only require End OTP if there is NO next round
        let otpString = '';
        if (!roundInfo?.hasNextRound) {
            otpString = endOtp.join('');
            if (otpString.length !== 6) {
                setSubmitError('Authorization sequence incomplete.');
                return;
            }
        }

        setIsSubmitting(true);
        setSubmitError(null);

        // ─── STEP 1: Save backup BEFORE the network request ───────────────────────
        // This runs synchronously. Even if the tab crashes immediately after,
        // the payload is already on disk. The key encodes roundId so multiple
        // in-progress rounds never overwrite each other's backups.
        const submissionPayload = { endOtp: otpString, answers, pdfUrl };
        const backupKey = `backup_submission_${roundId}`;
        try {
            localStorage.setItem(backupKey, JSON.stringify({
                roundId,
                payload: submissionPayload,
                savedAt: new Date().toISOString(),
            }));
        } catch (storageErr) {
            // localStorage can throw if storage is full — log and continue,
            // the real submission still fires.
            console.warn('[Backup] Could not write to localStorage:', storageErr);
        }

        // ─── STEP 2: Fire the real API request ────────────────────────────────────
        try {
            const res = await api.post(`/rounds/${roundId}/submit`, submissionPayload);

            // ─── STEP 3: Do NOT clear the backup yet ──────────────────────────────
            // A 200 OK only means the backend accepted the job into its async queue.
            // It does NOT confirm the DB write completed. We keep the backup alive.
            // StudentDashboard will clear it once it confirms the round is COMPLETED.

            if (res.data.nextRoundId) {
                // Mid-test section transition — navigate to next section
                navigate(`/arena/${res.data.nextRoundId}`);
            } else {
                toast.success("Transmission Successful. Disconnecting from Arena.");
                navigate('/dashboard');
            }
        } catch (err) {
            setSubmitError(err.response?.data?.error || 'Link failed. Verify code and retry.');
            setEndOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
            setIsSubmitting(false);
            // Keep the backup — the student can retry and the fallback in
            // StudentDashboard will also attempt a re-fire on next load.
        }
    };

    // --- Submitted Block State Render ---
    if (isSubmittedBlock) {
        return (
            <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center font-sans p-10 text-center">
                <div className="w-32 h-32 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(99,102,241,0.2)]">
                    <CheckCircle size={64} />
                </div>
                <h1 className="text-5xl font-black tracking-tight text-slate-900 uppercase">Test Submitted</h1>
                <div className="max-w-lg mt-6 space-y-6">
                    <p className="text-slate-500 text-lg leading-relaxed">
                        You have already submitted this assessment. If you need to re-enter, please request <b>Approval for Re-entry</b> from your administrator.
                    </p>
                </div>
                <button onClick={() => navigate('/dashboard')} className="mt-10 px-8 py-4 bg-indigo-600 text-white font-black tracking-wide rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 active:scale-95">
                    <Power size={18} /> Return to Dashboard
                </button>
            </div>
        );
    }

    // --- Banned State Render ---
    if (isBanned) {
        return (
            <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center font-sans p-10 text-center selection:bg-red-200">
                <div className="w-32 h-32 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_60px_rgba(239,68,68,0.2)]">
                    <AlertTriangle size={64} />
                </div>
                <h1 className="text-5xl font-black tracking-tight text-slate-900 uppercase">Connection Terminated</h1>
                <div className="max-w-lg mt-6 space-y-6">
                    <p className="text-slate-500 text-lg leading-relaxed">
                        Security protocols were triggered. Your session has been flagged and suspended by the proctoring engine. <b>Your current score has been recorded as ZERO.</b>
                    </p>
                    <div className="bg-white border-2 border-red-100 p-6 rounded-2xl shadow-xl shadow-red-500/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Violation Record</span>
                        <p className="text-slate-800 font-bold mt-2 text-lg">{banReason}</p>
                    </div>
                </div>
                <button onClick={() => navigate('/dashboard')} className="mt-10 px-8 py-4 bg-red-600 text-white font-black tracking-wide rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2 active:scale-95">
                    <Power size={18} /> Return to Base
                </button>
            </div>
        );
    }

    // --- Loading State Render ---
    if (isLoading) {
        return <SkeletonCodeArena />;
    }

    const q = questions[activeIdx];
    const currentAnswer = answers[q?._id] || '';

    return (
        <div className="h-screen w-full bg-[#f8fafc] text-slate-700 font-sans flex flex-col overflow-hidden selection:bg-indigo-100">
            {/* Top Command Bar (Light Theme) */}
            <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-10 shadow-sm relative">
                {isDangerZone && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />}

                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-inner">
                        <Code2 size={18} className="sm:size-20" />
                    </div>
                    <div>
                        <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate max-w-[120px] sm:max-w-none">
                            {roundInfo?.name || 'Active Assessment'}
                        </h1>
                        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5 flex-wrap">
                            {/* Section X of Y */}
                            {roundInfo?.roundNumber && roundInfo?.totalRounds && (
                                <>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-black text-[9px] sm:text-[10px] uppercase tracking-wide">
                                        S{roundInfo.roundNumber}/{roundInfo.totalRounds}
                                    </span>
                                    <span className="text-slate-300 hidden xs:inline">|</span>
                                </>
                            )}
                            {/* Question X of N */}
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Q{activeIdx + 1}/{questions.length}
                            </span>
                            <span className="text-slate-300 hidden sm:inline">|</span>
                            {/* Marks for current question */}
                            {questions[activeIdx]?.points !== undefined && (
                                <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-black text-[10px] uppercase tracking-wide">
                                    {questions[activeIdx]?.points} pts
                                </span>
                            )}
                            <span className="text-slate-300 hidden md:inline">|</span>
                            <span className="hidden md:inline uppercase tracking-widest font-bold">{roundInfo?.type?.replace(/_/g, ' ')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-6">
                    {/* Sync Status */}
                    <div className="hidden lg:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                        {saveStatus === 'SAVING' && <><Loader2 size={12} className="animate-spin text-indigo-500" /> <span className="text-indigo-600">Syncing</span></>}
                        {saveStatus === 'PENDING' && <><Save size={12} className="text-slate-400" /> <span className="text-slate-500">Unsaved</span></>}
                        {saveStatus === 'SAVED' && <><CheckCircle size={12} className="text-emerald-500" /> <span className="text-emerald-600">Draft Saved</span></>}
                        {saveStatus === 'LOCKED' && <><Lock size={12} className="text-red-500" /> <span className="text-red-600">Locked</span></>}
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-mono text-base sm:text-lg font-black border transition-colors shadow-sm ${isTimeUp ? 'bg-red-50 border-red-200 text-red-600' :
                        isDangerZone ? 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse' :
                            'bg-white border-slate-200 text-slate-800'
                        }`}>
                        {isTimeUp ? <AlertTriangle size={16} className="animate-bounce" /> : <Clock size={16} className={isDangerZone ? '' : 'text-slate-400'} />}
                        <span className="whitespace-nowrap">{isTimeUp ? '00:00:00' : formattedTime}</span>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={() => setIsSubmitModalOpen(true)}
                        disabled={isSubmitting}
                        className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50 ${isTimeUp ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                            }`}
                    >
                        <Send size={16} />
                        <span className="hidden sm:inline">{isTimeUp ? 'FORCE SUBMIT' : 'Finalize'}</span>
                    </button>
                </div>
            </header>

            {/* Split UI */}
            <Split
                sizes={isMobile ? [40, 60] : [52, 48]}
                minSize={isMobile ? [200, 300] : [425, 375]}
                gutterSize={6}
                gutterAlign="center"
                direction={isMobile ? "vertical" : "horizontal"}
                className={`flex-1 flex w-full overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}
                cursor={isMobile ? "row-resize" : "col-resize"}
            >
                {/* Left Side: Question Pane */}
                <div className="flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden relative">

                    {/* Navigation Strip */}
                    <div className="flex items-center justify-between p-3 bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
                        <button
                            disabled={activeIdx === 0}
                            onClick={() => setActiveIdx(prev => prev - 1)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm group active:scale-95"
                        >
                            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Previous</span>
                            <span className="text-xs font-black uppercase tracking-widest sm:hidden">Prev</span>
                        </button>

                        <div className="flex justify-center gap-1.5 px-4 items-center">
                            {(() => {
                                const maxVisible = 10;
                                let start = Math.max(0, activeIdx - Math.floor(maxVisible / 2));
                                let end = Math.min(questions.length, start + maxVisible);
                                if (end - start < maxVisible) {
                                    start = Math.max(0, end - maxVisible);
                                }

                                return questions.slice(start, end).map((q, idx) => {
                                    const actualIdx = start + idx;
                                    const isAns = answers[q._id];
                                    return (
                                        <button
                                            key={actualIdx}
                                            onClick={() => setActiveIdx(actualIdx)}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all border shadow-sm
                                                ${activeIdx === actualIdx ? 'bg-indigo-600 border-indigo-700 text-white scale-110 shadow-indigo-200' :
                                                    isAns ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                                        'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                                        >
                                            {actualIdx + 1}
                                        </button>
                                    );
                                });
                            })()}
                        </div>

                        <button
                            disabled={activeIdx === questions.length - 1}
                            onClick={() => setActiveIdx(prev => prev + 1)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm group active:scale-95"
                        >
                            <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Next</span>
                            <span className="text-xs font-black uppercase tracking-widest sm:hidden">Next</span>
                            <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>

                    {/* Question Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border
                                    ${q?.difficulty === 'HARD' ? 'bg-red-50 text-red-600 border-red-100' :
                                        q?.difficulty === 'MEDIUM' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {q?.difficulty}
                                </span>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                                    {q?.category}
                                </span>
                                <span className="ml-auto text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                    {q?.points} Pts
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4 sm:mb-6 tracking-tight leading-tight">{q?.title}</h2>

                            <div className="prose prose-slate max-w-none text-sm font-medium leading-relaxed whitespace-pre-wrap mb-8">
                                {q?.description}
                            </div>

                            {q?.problemImage && (
                                <div className="mb-8 p-1 bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden group shadow-sm transition-all hover:border-indigo-200">
                                    <div className="relative overflow-hidden rounded-2xl aspect-video bg-white flex items-center justify-center">
                                       <img 
                                           src={q.problemImage} 
                                           alt="Design Reference" 
                                           className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.05] cursor-zoom-in"
                                           onClick={() => window.open(q.problemImage, '_blank')}
                                       />
                                       <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                           Click to expand
                                       </div>
                                    </div>
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <Eye size={12} className="text-indigo-500" />
                                            Design Protocol Artifact
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 font-mono">REF://{q._id?.slice(-6).toUpperCase()}</span>
                                    </div>
                                </div>
                            )}

                            {q?.type !== 'MCQ' && (
                                <div className="space-y-6">
                                    {(q?.inputFormat || q?.outputFormat) && (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            {q?.inputFormat && (
                                                <div>
                                                    <h4 className="text-indigo-600 font-black uppercase text-[10px] tracking-widest mb-2 flex items-center gap-1.5"><HelpCircle size={12} /> Input Expected</h4>
                                                    <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm leading-relaxed">{q?.inputFormat}</div>
                                                </div>
                                            )}
                                            {q?.outputFormat && (
                                                <div>
                                                    <h4 className="text-emerald-600 font-black uppercase text-[10px] tracking-widest mb-2 flex items-center gap-1.5"><CheckCircle size={12} /> Output Expected</h4>
                                                    <div className="text-xs text-slate-600 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm leading-relaxed">{q?.outputFormat}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {(q?.sampleInput || q?.sampleOutput) && (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            {q?.sampleInput && (
                                                <div>
                                                    <h4 className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-2">Sample Input</h4>
                                                    <pre className="text-slate-800 bg-slate-100 p-4 rounded-xl border border-slate-200 font-mono text-xs shadow-inner overflow-x-auto">{q?.sampleInput}</pre>
                                                </div>
                                            )}
                                            {q?.sampleOutput && (
                                                <div>
                                                    <h4 className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-2">Sample Output</h4>
                                                    <pre className="text-indigo-800 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100 font-mono text-xs shadow-inner overflow-x-auto">{q?.sampleOutput}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Right Side: Answer Input UI (Light Theme IDE) */}
                <div className="h-full flex flex-col bg-white overflow-hidden relative shadow-[-10px_0_30px_rgba(0,0,0,0.03)] border-l border-slate-200">

                    {/* IDE Header */}
                    <div className="h-10 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
                        {/* Active Tab */}
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-t-lg border-t border-x border-slate-200 border-b-0 text-xs font-mono font-bold text-indigo-600 relative top-px">
                            <Terminal size={14} className="text-indigo-400" />
                            <span>
                                {q?.type === 'MCQ' ? 'Selection_Matrix.exe' :
                                    (q?.type === 'CODE' || q?.type === 'DEBUG' || q?.type === 'MISSING_BLOCK' || roundInfo?.type === 'HTML_CSS_QUIZ' || roundInfo?.type === 'HTML_CSS_DEBUG') ?
                                        `solution.${(q?.category === 'SQL' || roundInfo?.type === 'SQL_CONTEST') ? 'sql' :
                                            (q?.category === 'HTML' || roundInfo?.type === 'HTML_CSS_QUIZ' || roundInfo?.type === 'HTML_CSS_DEBUG') ? 'html' :
                                                q?.category === 'CSS' ? 'css' : language}` :
                                        'Text_Buffer.txt'}
                            </span>
                        </div>

                        {(q?.category === 'HTML' || q?.category === 'CSS') && (
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                            >
                                {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                                {showPreview ? 'Hide Preview' : 'Show Preview'}
                            </button>
                        )}
                    </div>

                    <div className="flex-1 relative overflow-hidden bg-slate-50/30 flex flex-col">
                        {/* Lock Overlay (Frosted Glass) */}
                        <AnimatePresence>
                            {isTimeUp && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-20 bg-white/60 backdrop-blur-md flex items-center justify-center"
                                >
                                    <div className="px-8 py-8 bg-white border border-red-100 rounded-3xl flex flex-col items-center gap-2 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.2)] text-center">
                                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 animate-pulse">
                                            <Lock size={32} />
                                        </div>
                                        <p className="text-slate-900 font-black tracking-tight text-xl uppercase">Input Locked</p>
                                        <p className="text-sm text-slate-500 font-medium">Session time has expired.</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {q?.type === 'MCQ' ? (
                            <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                                <div className="max-w-xl mx-auto space-y-4 pt-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Select optimal solution</h3>
                                    {q?.options?.map((opt, i) => (
                                        <button
                                            key={i}
                                            disabled={isTimeUp}
                                            onClick={() => handleAnswerChange(q?._id, opt)}
                                            className={`w-full p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-200 group
                                ${currentAnswer === opt ?
                                                    'bg-indigo-50/80 border-indigo-400 text-indigo-900 shadow-[0_8px_30px_-4px_rgba(79,70,229,0.15)]' :
                                                    'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:shadow-md hover:shadow-slate-200/50'}
                                ${isTimeUp && currentAnswer !== opt ? 'opacity-40 grayscale-[0.5]' : ''}`}
                                        >
                                            <div className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors
                                ${currentAnswer === opt ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                                {currentAnswer === opt && <CheckCircle size={14} strokeWidth={3} />}
                                            </div>
                                            <span className={`text-sm font-medium leading-relaxed ${currentAnswer === opt ? 'font-bold' : ''}`}>{opt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (q?.type === 'UI_UX' || q?.type === 'MINI_HACKATHON' || roundInfo?.type === 'UI_UX_CHALLENGE' || roundInfo?.type === 'MINI_HACKATHON') ? (
                            <div className="p-4 sm:p-8 h-full overflow-y-auto custom-scrollbar flex flex-col items-center justify-center bg-slate-50/50">
                                <div className="max-w-xl w-full space-y-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Code2 size={32} />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                            {(q?.type === 'MINI_HACKATHON' || roundInfo?.type === 'MINI_HACKATHON') ? 'Mini Hackathon Submission' : 'UI/UX Challenge Submission'}
                                        </h3>
                                        <p className="text-slate-500 text-sm mt-2">
                                            {(q?.type === 'MINI_HACKATHON' || roundInfo?.type === 'MINI_HACKATHON') ? 'Provide your GitHub repository link and upload a PDF abstract of your project.' : 'Provide your Figma project link and upload a PDF snapshot of your design.'}
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                {(q?.type === 'MINI_HACKATHON' || roundInfo?.type === 'MINI_HACKATHON') ? 'GitHub Repository URL' : 'Figma Project URL'}
                                            </label>
                                            <input
                                                type="url"
                                                disabled={isTimeUp}
                                                placeholder={(q?.type === 'MINI_HACKATHON' || roundInfo?.type === 'MINI_HACKATHON') ? "https://github.com/username/repo" : "https://www.figma.com/file/..."}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-slate-700"
                                                value={currentAnswer}
                                                onChange={(e) => handleAnswerChange(q?._id, e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                {(q?.type === 'MINI_HACKATHON' || roundInfo?.type === 'MINI_HACKATHON') ? 'Project Abstract / Screenshots (PDF)' : 'Design Snapshot (PDF)'}
                                            </label>
                                            <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${pdfUrl ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 bg-slate-50'} ${isTimeUp ? 'cursor-not-allowed opacity-60' : ''}`}>
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    className="hidden"
                                                    disabled={isTimeUp}
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file && file.type === 'application/pdf') {
                                                            if (file.size > 1 * 1024 * 1024) {
                                                                toast.error("File size must be less than 1MB");
                                                                return;
                                                            }
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setPdfUrl(reader.result);
                                                                toast.success("PDF attached successfully!");
                                                            };
                                                            reader.readAsDataURL(file);
                                                        } else if (file) {
                                                            toast.error("Please upload a valid PDF file");
                                                        }
                                                    }}
                                                />
                                                {pdfUrl ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <CheckCircle className="text-emerald-500" size={24} />
                                                        <span className="text-sm font-bold text-emerald-700">
                                                            {(q?.type === 'MINI_HACKATHON' || roundInfo?.type === 'MINI_HACKATHON') ? 'Project PDF Attached' : 'PDF Snapshot Attached'}
                                                        </span>
                                                        <span className="text-[10px] text-emerald-600/70 font-black uppercase tracking-widest">Click to replace</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Save className="text-slate-400" size={24} />
                                                        <span className="text-sm font-bold text-slate-700">Select PDF File</span>
                                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Max size 10MB</span>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (q?.type === 'CODE' || q?.type === 'DEBUG' || q?.type === 'MISSING_BLOCK' || roundInfo?.type === 'HTML_CSS_QUIZ' || roundInfo?.type === 'HTML_CSS_DEBUG') ? (
                            !q ? (
                                <div className="flex flex-col p-8 h-full w-full gap-6 animate-pulse bg-white">
                                    <div className="h-8 bg-slate-200 rounded-md w-1/3"></div>
                                    <div className="space-y-3">
                                        <div className="h-4 bg-slate-100 rounded-md w-full"></div>
                                        <div className="h-4 bg-slate-100 rounded-md w-5/6"></div>
                                        <div className="h-4 bg-slate-100 rounded-md w-4/6"></div>
                                    </div>
                                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl"></div>
                                </div>
                            ) : (
                                (q?.category === 'HTML' || q?.category === 'CSS' || roundInfo?.type === 'HTML_CSS_QUIZ' || roundInfo?.type === 'HTML_CSS_DEBUG' || roundInfo?.type === 'MINI_HACKATHON') && showPreview ? (
                                    <Split
                                        direction="vertical"
                                        sizes={[60, 40]}
                                        minSize={100}
                                        gutterSize={6}
                                        className="h-full flex flex-col overflow-hidden"
                                    >
                                        <div className="flex-1 overflow-hidden">
                                            <Editor
                                                height="100%"
                                                language={(q?.category === 'HTML' || roundInfo?.type === 'HTML_CSS_QUIZ' || roundInfo?.type === 'HTML_CSS_DEBUG' || roundInfo?.type === 'MINI_HACKATHON') ? 'html' : 'css'}
                                                theme="light"
                                                value={currentAnswer || (q?.type === 'DEBUG' || q?.type === 'MISSING_BLOCK' ? q?.sampleInput : '')}
                                                onChange={(val) => handleAnswerChange(q?._id, val)}
                                                options={{
                                                    minimap: { enabled: false },
                                                    fontSize: 14,
                                                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                                    lineHeight: 24,
                                                    padding: { top: 24 },
                                                    scrollBeyondLastLine: false,
                                                    smoothScrolling: true,
                                                    cursorBlinking: "smooth",
                                                    readOnly: isTimeUp,
                                                    renderLineHighlight: "all",
                                                    hideCursorInOverviewRuler: true
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 bg-white border-t border-slate-200 flex flex-col overflow-hidden">
                                            <div className="h-8 bg-slate-50 border-b border-slate-200 flex items-center px-4 shrink-0">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Preview</span>
                                            </div>
                                            <div className="flex-1 bg-white p-0">
                                                <iframe
                                                    title="preview"
                                                    srcDoc={q?.category === 'HTML' ? currentAnswer : `<style>${currentAnswer}</style>${q?.sampleInput || ''}`}
                                                    className="w-full h-full border-0 bg-white"
                                                    sandbox="allow-scripts"
                                                />
                                            </div>
                                        </div>
                                    </Split>
                                ) : (
                                    <Editor
                                        height="100%"
                                        language={(q?.category === 'SQL' || roundInfo?.type === 'SQL_CONTEST') ? 'sql' :
                                            (q?.category === 'HTML' || roundInfo?.type === 'HTML_CSS_QUIZ' || roundInfo?.type === 'HTML_CSS_DEBUG' || roundInfo?.type === 'MINI_HACKATHON') ? 'html' :
                                                q?.category === 'CSS' ? 'css' :
                                                    'javascript'}
                                        theme="light" // Switched to Monaco's built-in light theme
                                        value={currentAnswer || (q?.type === 'DEBUG' || q?.type === 'MISSING_BLOCK' ? q?.sampleInput : '')}
                                        onChange={(val) => handleAnswerChange(q?._id, val)}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                            lineHeight: 24,
                                            padding: { top: 24 },
                                            scrollBeyondLastLine: false,
                                            smoothScrolling: true,
                                            cursorBlinking: "smooth",
                                            readOnly: isTimeUp,
                                            renderLineHighlight: "all",
                                            hideCursorInOverviewRuler: true
                                        }}
                                        loading={
                                            <div className="flex flex-col p-8 h-full w-full gap-6 animate-pulse bg-white">
                                                <div className="h-8 bg-slate-200 rounded-md w-1/3"></div>
                                                <div className="space-y-3">
                                                    <div className="h-4 bg-slate-100 rounded-md w-full"></div>
                                                    <div className="h-4 bg-slate-100 rounded-md w-5/6"></div>
                                                    <div className="h-4 bg-slate-100 rounded-md w-4/6"></div>
                                                </div>
                                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl"></div>
                                            </div>
                                        }
                                    />
                                )
                            )
                        ) : (
                            <div className="p-6 h-full flex flex-col max-w-4xl mx-auto w-full">
                                <textarea
                                    disabled={isTimeUp}
                                    placeholder="// Initialize text stream here..."
                                    className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 text-slate-700 font-mono text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 resize-none leading-relaxed transition-all shadow-sm custom-scrollbar disabled:bg-slate-50 disabled:text-slate-400"
                                    value={currentAnswer}
                                    onChange={(e) => handleAnswerChange(q?._id, e.target.value)}
                                />
                                <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">
                                    Size: <span className="text-indigo-600 text-xs">{currentAnswer.length}</span> bytes
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Split>

            {/* Submission Modal */}
            <AnimatePresence>
                {isSubmitModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={`relative w-full max-w-md overflow-hidden rounded-3xl bg-white border shadow-2xl ${isTimeUp ? 'border-red-200' : 'border-indigo-200'}`}
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${isTimeUp ? 'from-transparent via-red-500 to-transparent' : 'from-transparent via-indigo-500 to-transparent'}`}></div>

                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`p-4 rounded-2xl ${isTimeUp ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                        {isTimeUp ? <AlertTriangle size={28} /> : (roundInfo?.hasNextRound ? <ArrowRight size={28} /> : <CheckCircle size={28} />)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-1">{isTimeUp ? 'Time Expired' : (roundInfo?.hasNextRound ? 'Section Complete' : 'Secure Transmission')}</h2>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isTimeUp ? 'text-red-500' : 'text-indigo-500'}`}>
                                            {roundInfo?.hasNextRound ? 'SEQUENCE CONTINUES' : 'FINAL AUTHORIZATION'}
                                        </p>
                                    </div>
                                </div>

                                <p className="text-slate-500 text-sm mb-6 leading-relaxed font-medium">
                                    {isTimeUp
                                        ? "Session closed. Enter the Final Authorization OTP to securely flush data to the server."
                                        : (roundInfo?.hasNextRound
                                            ? "You are about to submit this section. The timer will continue seamlessly into the next section. Ready to proceed?"
                                            : "Ready to commit? Enter the Final Authorization OTP provided by the Proctor to finalize your test submission.")}
                                </p>

                                <form onSubmit={handleFinalSubmit} className="space-y-6">
                                    {(!roundInfo?.hasNextRound || isTimeUp) && (
                                        <div>
                                            <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                                                {endOtp.map((digit, index) => (
                                                    <input
                                                        key={index}
                                                        ref={el => otpRefs.current[index] = el}
                                                        type="text"
                                                        maxLength={1}
                                                        value={digit}
                                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                        disabled={isSubmitting}
                                                        autoComplete="off"
                                                        className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black font-mono text-slate-900 bg-slate-50 border-2 rounded-xl focus:bg-white transition-all outline-none disabled:opacity-50 selection:bg-indigo-100
                                                            ${isTimeUp ? 'border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {submitError && (
                                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-red-600 text-xs font-bold flex items-center justify-center gap-2 bg-red-50 py-3 rounded-xl border border-red-200">
                                            <AlertTriangle size={14} className="shrink-0" />{submitError}
                                        </motion.p>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        {!isTimeUp && <button type="button" onClick={() => setIsSubmitModalOpen(false)} disabled={isSubmitting} className="flex-1 px-4 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold transition-all shadow-sm">Cancel</button>}
                                        <SubmitButton
                                            type="submit"
                                            disabled={isSubmitting || ((!roundInfo?.hasNextRound || isTimeUp) && endOtp.join('').length !== 6)}
                                            isLoading={isSubmitting}
                                            loadingText="Verifying"
                                            className={`flex-2 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-black transition-all shadow-lg text-sm ${isTimeUp ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}
                                        >
                                            {roundInfo?.hasNextRound && !isTimeUp ? <><Send size={16} /> Proceed to Next</> : <><Send size={16} /> Confirm Sequence</>}
                                        </SubmitButton>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Gutter Styling */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .gutter { background-color: #f1f5f9; border-left: 1px solid #e2e8f0; border-right: 1px solid #1e1e2e; transition: background-color 0.2s; display: flex; align-items: center; justify-content: center; } 
                .gutter:hover { background-color: #cbd5e1; } 
                .gutter.gutter-horizontal { cursor: col-resize; position: relative;}
                .gutter.gutter-horizontal::after { content: ''; position: absolute; height: 30px; width: 4px; border-radius: 4px; background-color: #94a3b8; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px;}
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />
        </div>
    );
};

export default CodeArena;