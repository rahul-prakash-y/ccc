import React, { useState, useEffect } from 'react';
import Split from 'react-split';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Terminal, Lock, Send, AlertTriangle, Save, Loader2,
    ChevronLeft, ChevronRight, CheckCircle, Circle, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../store/authStore';

import useContestTimer from '../hooks/useContestTimer';
import useAutoSave from '../hooks/useAutoSave';

const MOCK_START_TIME = new Date(Date.now() - 5000).toISOString();

const CodeArena = ({ roundId = 'mock_round_id', language = 'javascript' }) => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [roundInfo, setRoundInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [endOtp, setEndOtp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get(`/rounds/${roundId}/questions`);
                setQuestions(res.data.data.questions);
                setRoundInfo(res.data.data.round);

                const draft = localStorage.getItem(`draft_${roundId}`);
                if (draft) {
                    try {
                        setAnswers(JSON.parse(draft));
                    } catch (_) {
                        // Recover legacy string draft into first question if it exists
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
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [roundId]);

    const { formattedTime, isTimeUp, isDangerZone } = useContestTimer({
        roundId,
        serverStartTime: MOCK_START_TIME,
        durationMinutes: roundInfo?.durationMinutes || 60,
        onTimeUp: () => setIsSubmitModalOpen(true),
        onCheatDetected: (flags) => console.log('Cheat detected:', flags)
    });

    const { saveStatus } = useAutoSave(answers, roundId, 5000, isTimeUp);

    const handleAnswerChange = (questionId, value) => {
        if (!isTimeUp) {
            setAnswers(prev => ({ ...prev, [questionId]: value }));
        }
    };

    const handleFinalSubmit = async (e) => {
        if (e) e.preventDefault();
        if (endOtp.length !== 6) {
            setSubmitError('OTP must be exactly 6 digits.');
            return;
        }
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            await api.post(`/rounds/${roundId}/submit`, { endOtp, answers });
            alert("Submission Successful! Return to Dashboard.");
            navigate('/dashboard');
        } catch (err) {
            setSubmitError(err.response?.data?.error || 'System Error. Try again.');
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-[#0a0a0f] flex items-center justify-center text-cyan-500 gap-3 font-mono">
                <Loader2 className="animate-spin" size={32} /> Initializing Environment...
            </div>
        );
    }

    const q = questions[activeIdx];
    const currentAnswer = answers[q?._id] || '';

    return (
        <div className="h-screen w-full bg-[#0a0a0f] text-gray-300 font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">
            {/* Header */}
            <header className="h-16 shrink-0 border-b border-gray-800 bg-[#0d0d14] flex items-center justify-between px-6 z-10 shadow-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
                        <Terminal size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-gray-100 tracking-wider">
                            {roundInfo?.name || 'Challenge'}
                            <span className="ml-2 px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400 uppercase tracking-tighter border border-gray-700">
                                {roundInfo?.type?.replace(/_/g, ' ')}
                            </span>
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Question {activeIdx + 1} of {questions.length} | Environment Active
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-xs font-mono font-medium">
                        {saveStatus === 'SAVING' && <><Loader2 size={14} className="animate-spin text-cyan-400" /> <span className="text-cyan-400">Syncing...</span></>}
                        {saveStatus === 'PENDING' && <><Save size={14} className="text-gray-500" /> <span className="text-gray-500">Unsaved changes</span></>}
                        {saveStatus === 'SAVED' && <><Save size={14} className="text-emerald-400" /> <span className="text-emerald-400">Draft saved</span></>}
                        {saveStatus === 'LOCKED' && <><Lock size={14} className="text-red-400" /> <span className="text-red-400">Locked</span></>}
                    </div>

                    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg font-mono text-lg font-bold border ${isTimeUp ? 'bg-red-950/30 border-red-500/50 text-red-400' :
                        isDangerZone ? 'bg-orange-950/30 border-orange-500/50 text-orange-400 animate-pulse' :
                            'bg-gray-900 border-gray-700 text-gray-100'
                        }`}>
                        {isTimeUp ? <AlertTriangle size={20} className="animate-bounce" /> : <Lock size={18} className="opacity-50" />}
                        {isTimeUp ? '00:00:00 (LOCKED)' : formattedTime}
                    </div>

                    <button
                        onClick={() => setIsSubmitModalOpen(true)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] disabled:opacity-50"
                    >
                        <Send size={16} />
                        {isTimeUp ? 'FORCE SUBMIT' : 'Finish & Submit'}
                    </button>
                </div>
            </header>

            {/* Split UI */}
            <Split
                sizes={[40, 60]}
                minSize={[350, 450]}
                gutterSize={8}
                gutterAlign="center"
                direction="horizontal"
                className="flex-1 flex w-full overflow-hidden"
                cursor="col-resize"
            >
                {/* Left Side: Question Navigator & Content */}
                <div className="flex flex-col h-full bg-[#11111a] border-r border-gray-800 overflow-hidden">
                    {/* Navigation Bar */}
                    <div className="flex items-center justify-between p-4 bg-black/20 border-b border-gray-800/50">
                        <button
                            disabled={activeIdx === 0}
                            onClick={() => setActiveIdx(prev => prev - 1)}
                            className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-20 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex flex-wrap justify-center gap-1.5 px-4 overflow-x-auto scrollbar-hide max-h-12 items-center">
                            {questions.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveIdx(i)}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all border
                                        ${activeIdx === i ? 'bg-cyan-500 border-cyan-400 text-black scale-110' :
                                            answers[questions[i]._id] ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400' :
                                                'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={activeIdx === questions.length - 1}
                            onClick={() => setActiveIdx(prev => prev + 1)}
                            className="p-2 rounded-lg hover:bg-gray-800 disabled:opacity-20 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Question Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex-1 p-6 overflow-y-auto"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border
                                    ${q.difficulty === 'HARD' ? 'bg-red-950/30 text-red-500 border-red-500/30' :
                                        q.difficulty === 'MEDIUM' ? 'bg-orange-950/30 text-orange-500 border-orange-500/30' :
                                            'bg-emerald-950/30 text-emerald-500 border-emerald-500/30'}`}>
                                    {q.difficulty}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{q.category}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-100 mb-4 font-sans tracking-tight">{q.title}</h2>
                            <div className="prose prose-invert prose-p:text-gray-400 max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                                {q.description}
                            </div>

                            {q.type !== 'MCQ' && (
                                <div className="mt-8 space-y-6">
                                    {(q.inputFormat || q.outputFormat) && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {q.inputFormat && (
                                                <div>
                                                    <h4 className="text-cyan-400 font-medium uppercase text-[10px] tracking-widest mb-2 flex items-center gap-1.5"><HelpCircle size={12} /> Input Format</h4>
                                                    <p className="text-xs text-gray-500 bg-black/30 p-2 rounded border border-gray-800">{q.inputFormat}</p>
                                                </div>
                                            )}
                                            {q.outputFormat && (
                                                <div>
                                                    <h4 className="text-cyan-400 font-medium uppercase text-[10px] tracking-widest mb-2 flex items-center gap-1.5"><CheckCircle size={12} /> Output Format</h4>
                                                    <p className="text-xs text-gray-500 bg-black/30 p-2 rounded border border-gray-800">{q.outputFormat}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {(q.sampleInput || q.sampleOutput) && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {q.sampleInput && (
                                                <div>
                                                    <h4 className="text-gray-400 font-medium uppercase text-[10px] tracking-widest mb-2">Sample Input</h4>
                                                    <pre className="text-emerald-500 bg-black/50 p-3 rounded-lg border border-gray-800 font-mono text-xs">{q.sampleInput}</pre>
                                                </div>
                                            )}
                                            {q.sampleOutput && (
                                                <div>
                                                    <h4 className="text-gray-400 font-medium uppercase text-[10px] tracking-widest mb-2">Sample Output</h4>
                                                    <pre className="text-purple-400 bg-black/50 p-3 rounded-lg border border-gray-800 font-mono text-xs">{q.sampleOutput}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Right Side: Answer Input UI */}
                <div className="h-full flex flex-col bg-[#1e1e1e] overflow-hidden">
                    <div className="h-10 bg-[#181818] border-b border-[#2d2d2d] flex items-center px-4 shrink-0 justify-between">
                        <div className="flex space-x-2 bg-[#1e1e1e] px-4 py-1.5 rounded-t-md border-t border-x border-[#2d2d2d] border-b-0 text-sm font-mono text-gray-300 mt-2">
                            <span>{q.type === 'MCQ' ? 'Selection Matrix' : q.type === 'CODE' ? `solution.${language}` : 'Text Area'}</span>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
                        {isTimeUp && (
                            <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm pointer-events-none flex items-center justify-center">
                                <div className="px-6 py-3 bg-red-950/80 border border-red-500/50 rounded-xl flex items-center gap-3 backdrop-blur-md">
                                    <Lock className="text-red-500" />
                                    <span className="text-red-200 font-bold tracking-wider uppercase">Session Finalized</span>
                                </div>
                            </div>
                        )}

                        {q.type === 'MCQ' ? (
                            <div className="p-10 h-full overflow-y-auto">
                                <div className="max-w-xl mx-auto space-y-4">
                                    <h3 className="text-lg font-bold text-gray-200 mb-6">Choose the most accurate option:</h3>
                                    {q.options?.map((opt, i) => (
                                        <button
                                            key={i}
                                            disabled={isTimeUp}
                                            onClick={() => handleAnswerChange(q._id, opt)}
                                            className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all group
                                                ${currentAnswer === opt ?
                                                    'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]' :
                                                    'bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700 hover:bg-gray-900'}
                                                ${isTimeUp && currentAnswer !== opt ? 'opacity-30' : ''}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                                ${currentAnswer === opt ? 'border-cyan-400 bg-cyan-400 text-black' : 'border-gray-700 group-hover:border-gray-500'}`}>
                                                {currentAnswer === opt && <CheckCircle size={16} />}
                                            </div>
                                            <span className="text-sm font-medium">{opt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (q.type === 'CODE' || q.type === 'DEBUG') ? (
                            <Editor
                                height="100%"
                                language={q.category === 'SQL' ? 'sql' : language}
                                theme="vs-dark"
                                value={currentAnswer || (q.type === 'DEBUG' ? q.sampleInput : '')}
                                onChange={(val) => handleAnswerChange(q._id, val)}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                                    lineHeight: 24,
                                    padding: { top: 20 },
                                    scrollBeyondLastLine: false,
                                    smoothScrolling: true,
                                    cursorBlinking: "smooth",
                                    readOnly: isTimeUp
                                }}
                                loading={<div className="flex items-center justify-center h-full text-cyan-500 gap-3 font-mono"><Loader2 className="animate-spin" /> Preparing Environment...</div>}
                            />
                        ) : (
                            <div className="p-6 h-full flex flex-col">
                                <textarea
                                    disabled={isTimeUp}
                                    placeholder="Type your explanation or answer here..."
                                    className="flex-1 bg-black/20 border border-gray-800 rounded-2xl p-6 text-gray-300 font-sans focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none leading-relaxed transition-all"
                                    value={currentAnswer}
                                    onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                                />
                                <div className="mt-4 text-[10px] text-gray-600 font-mono uppercase tracking-widest text-right">
                                    {currentAnswer.length} characters written
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Split>

            {/* Submit Modal */}
            <AnimatePresence>
                {isSubmitModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0d0d14] border shadow-2xl ${isTimeUp ? 'border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.15)]' : 'border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]'}`}
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-linear-to-r ${isTimeUp ? 'from-transparent via-red-500 to-transparent' : 'from-transparent via-cyan-400 to-transparent'}`}></div>
                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`p-4 rounded-xl ${isTimeUp ? 'bg-red-950/50 text-red-500 border border-red-900/50' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50'}`}>
                                        {isTimeUp ? <AlertTriangle size={32} /> : <Lock size={32} />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">{isTimeUp ? 'Time Expired' : 'Secure Submission'}</h2>
                                        <p className={`text-sm tracking-wide ${isTimeUp ? 'text-red-400' : 'text-cyan-500'}`}>FINAL AUTHORIZATION</p>
                                    </div>
                                </div>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    {isTimeUp ? "The competition window has closed. Enter the Admin's Final End OTP immediately." : "Are you ready to submit your answers? Enter the 6-digit End OTP to finalize."}
                                </p>
                                <form onSubmit={handleFinalSubmit} className="space-y-6">
                                    <input
                                        type="text" maxLength={6}
                                        value={endOtp} onChange={(e) => setEndOtp(e.target.value.toUpperCase())}
                                        className={`block w-full px-4 py-4 bg-black/50 border border-gray-700/50 rounded-xl text-white font-mono text-center tracking-[0.5em] text-2xl uppercase ${isTimeUp ? 'focus:border-red-500 focus:ring-red-500/50' : 'focus:border-cyan-400 focus:ring-cyan-400/50'}`}
                                        placeholder="------" disabled={isSubmitting} autoComplete="off" autoFocus
                                    />
                                    {submitError && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 text-red-400 text-sm font-medium flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" />{submitError}</motion.p>}
                                    <div className="flex gap-4 pt-2">
                                        {!isTimeUp && <button type="button" onClick={() => setIsSubmitModalOpen(false)} disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium transition-colors">Cancel</button>}
                                        <button type="submit" disabled={isSubmitting || endOtp.length !== 6} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold disabled:opacity-50 transition-all ${isTimeUp ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-black'}`}>
                                            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : <><Send size={18} /> Confirm Override</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Required for react-split
const styleLink = document.createElement("style");
styleLink.innerHTML = `.gutter { background-color: #11111a; background-repeat: no-repeat; background-position: 50%; transition: background-color 0.2s; } .gutter:hover { background-color: #2dd4bf; } .gutter.gutter-horizontal { background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg=='); cursor: col-resize; }`;
document.head.appendChild(styleLink);

export default CodeArena;
