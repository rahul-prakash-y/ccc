import React, { useState, useEffect, useCallback } from 'react';
import Split from 'react-split';
import Editor from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, CheckCircle, HelpCircle, Code2,
    BookOpen, AlertTriangle, Power, ArrowLeft, Sparkles, Eye, EyeOff, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../store/authStore';
import { SkeletonCodeArena } from './Skeleton';

/**
 * PracticeArena — a read-only preview of a round's questions.
 *
 * Key differences from CodeArena:
 *  • No anti-cheat event listeners (paste, copy, devtools, etc.)
 *  • No countdown timer — replaced with a static "Practice Mode" badge
 *  • Answers are LOCAL ONLY — nothing is saved to the server
 *  • No OTP submission flow — replaced with a "Back to Dashboard" button
 *  • Prominent banner: "PRACTICE MODE — Answers are NOT saved"
 */
const PracticeArena = ({ language = 'javascript' }) => {
    const { roundId } = useParams();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [roundInfo, setRoundInfo] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [showPreview, setShowPreview] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < 1024 : false
    );

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Data loading ──────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const res = await api.get(`/rounds/${roundId}/practice-questions`);
                setQuestions(res.data.data.questions);
                setRoundInfo(res.data.data.round);
                
                const initialAnswers = {};
                res.data.data.questions.forEach(qItem => (initialAnswers[qItem._id] = ''));
                setAnswers(initialAnswers);
            } catch (err) {
                if (err.response?.status === 403) {
                    setLoadError(err.response.data.message || 'Questions are not available for practice yet.');
                } else {
                    setLoadError('Failed to load practice questions.');
                }
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [roundId]);

    // ── Autosave ──────────────────────────────────────────────────────────────
    const saveTimeoutRef = React.useRef(null);

    const debouncedSave = useCallback((newAnswers) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await api.post(`/rounds/${roundId}/practice-autosave`, { answers: newAnswers });
                setLastSaved(new Date());
            } catch (e) {
                console.error('Autosave failed:', e);
            }
        }, 2000);
    }, [roundId]);


    const handleAnswerChange = useCallback((questionId, value) => {
        setAnswers(prev => {
            const next = { ...prev, [questionId]: value };
            debouncedSave(next);
            return next;
        });
    }, [debouncedSave]);

    const handleFinalSubmit = async () => {
        const totalQuestions = questions.length;
        const answeredCount = questions.filter(qItem => {
            const ans = answers[qItem._id];
            if (!ans) return false;
            if (typeof ans === 'string') return ans.trim().length > 0;
            if (Array.isArray(ans)) return ans.length > 0;
            return true;
        }).length;

        const completionRate = (answeredCount / totalQuestions) * 100;

        if (completionRate < 80) {
            const requiredCount = Math.ceil(totalQuestions * 0.8);
            toast.error(
                `Submission Blocked: Minimum 80% completion required (${requiredCount} questions). You have only answered ${answeredCount} questions so far (${Math.round(completionRate)}%).`,
                {
                    duration: 4000,
                    position: 'top-center',
                    style: {
                        borderRadius: '20px',
                        background: '#1e293b',
                        color: '#fff',
                        fontWeight: '800',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: '1px solid #334155',
                        padding: '16px 24px'
                    }
                }
            );
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/rounds/${roundId}/practice-submit`, { answers });
            navigate('/dashboard', { state: { practiceSubmitted: true } });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit practice test');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Pre-render calculations ───────────────────────────────────────────────
    const q = questions[activeIdx];
    const currentAnswer = answers[q?._id] || '';

    const answeredCount = questions.filter(item => {
        const ans = answers[item._id];
        if (!ans) return false;
        if (typeof ans === 'string') return ans.trim().length > 0;
        if (Array.isArray(ans)) return ans.length > 0;
        return true;
    }).length;
    const completionRate = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    const isRequirementMet = completionRate >= 80;

    // ── Loading/Error states ──────────────────────────────────────────────────
    if (isLoading) return <SkeletonCodeArena />;
    if (loadError) {
        return (
            <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center font-sans p-10 text-center">
                <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
                    <BookOpen size={44} />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase mb-3">Practice Unavailable</h1>
                <p className="text-slate-500 text-base max-w-md mb-8">{loadError}</p>
                <button onClick={() => navigate('/dashboard')} className="px-8 py-3.5 bg-indigo-600 text-white font-black rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-[#f8fafc] text-slate-700 font-sans flex flex-col overflow-hidden selection:bg-amber-100">
            {/* Banner */}
            <div className="shrink-0 bg-amber-400 text-amber-900 text-[11px] font-black uppercase tracking-widest text-center py-2 flex items-center justify-center gap-2 shadow-sm">
                <Sparkles size={13} />
                Practice Mode — Answers are saved and will be evaluated.
                <Sparkles size={13} />
            </div>

            {/* Header */}
            <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                        <BookOpen size={17} />
                    </div>
                    <div>
                        <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate max-w-[160px] sm:max-w-none">
                            {roundInfo?.name || 'Practice Session'}
                        </h1>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-black text-[9px] uppercase tracking-wide">Practice</span>
                            <span className="text-slate-300">|</span>
                            <span>Q{activeIdx + 1}/{questions.length}</span>
                            {lastSaved && (
                                <>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                                        <CheckCircle size={10} /> Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-black border bg-amber-50 border-amber-200 text-amber-700 shadow-sm">
                        <Sparkles size={15} />
                        <span>Practice Evaluation Enabled</span>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black tracking-wide transition-all shadow-sm active:scale-95 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm">
                        <Power size={15} />
                        <span className="hidden sm:inline">Exit</span>
                    </button>
                </div>
            </header>

            <Split
                sizes={isMobile ? [40, 60] : [52, 48]}
                minSize={isMobile ? [200, 300] : [425, 375]}
                gutterSize={6}
                direction={isMobile ? 'vertical' : 'horizontal'}
                className={`flex-1 flex w-full overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}
                cursor={isMobile ? 'row-resize' : 'col-resize'}
            >
                {/* Left Pane */}
                <div className="flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                        <button disabled={activeIdx === 0} onClick={() => setActiveIdx(p => p - 1)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm group active:scale-95">
                            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Previous</span>
                        </button>

                        <div className="flex justify-center gap-1.5 px-4 items-center">
                            {questions.map((_, idx) => (
                                <button key={idx} onClick={() => setActiveIdx(idx)} className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all border shadow-sm ${activeIdx === idx ? 'bg-amber-500 border-amber-600 text-white scale-110 shadow-amber-200' : answers[questions[idx]._id] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'}`}>
                                    {idx + 1}
                                </button>
                            ))}
                        </div>

                        <button disabled={activeIdx === questions.length - 1} onClick={() => setActiveIdx(p => p + 1)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm group active:scale-95">
                            <span className="text-xs font-black uppercase tracking-widest">Next</span>
                            <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIdx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${q?.difficulty === 'HARD' ? 'bg-red-50 text-red-600 border-red-100' : q?.difficulty === 'MEDIUM' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {q?.difficulty}
                                </span>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">{q?.category}</span>
                                <span className="ml-auto text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">{q?.points} Pts</span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4 tracking-tight leading-tight">{q?.title}</h2>
                            <div className="prose prose-slate max-w-none text-sm font-medium leading-relaxed whitespace-pre-wrap mb-8">{q?.description}</div>

                            {q?.problemImage && (
                                <div className="mb-8 p-1 bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden group shadow-sm">
                                    <div className="relative overflow-hidden rounded-2xl aspect-video bg-white flex items-center justify-center">
                                       <img src={q.problemImage} alt="Design Reference" className="w-full h-full object-contain cursor-zoom-in" onClick={() => window.open(q.problemImage, '_blank')} />
                                       <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 text-white text-[10px] font-black uppercase tracking-widest rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Click to expand</div>
                                    </div>
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Eye size={12} className="text-amber-500" />Design Protocol Artifact</div>
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
                                                    <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">{q?.inputFormat}</div>
                                                </div>
                                            )}
                                            {q?.outputFormat && (
                                                <div>
                                                    <h4 className="text-emerald-600 font-black uppercase text-[10px] tracking-widest mb-2 flex items-center gap-1.5"><CheckCircle size={12} /> Output Expected</h4>
                                                    <div className="text-xs text-slate-600 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">{q?.outputFormat}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {(q?.sampleInput || q?.sampleOutput) && (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            {q?.sampleInput && (
                                                <div>
                                                    <h4 className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-2">Sample Input</h4>
                                                    <pre className="text-slate-800 bg-slate-100 p-4 rounded-xl border border-slate-200 font-mono text-xs overflow-x-auto">{q?.sampleInput}</pre>
                                                </div>
                                            )}
                                            {q?.sampleOutput && (
                                                <div>
                                                    <h4 className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-2">Sample Output</h4>
                                                    <pre className="text-indigo-800 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100 font-mono text-xs overflow-x-auto">{q?.sampleOutput}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Right Pane */}
                <div className="h-full flex flex-col bg-white overflow-hidden border-l border-slate-200">
                    <div className="h-10 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 uppercase">
                            <Code2 size={14} className="text-amber-400" />
                            <span>{q?.type === 'MCQ' ? 'Selection_Matrix' : 'Answer_Input'}</span>
                        </div>
                        {(q?.category === 'HTML' || q?.category === 'CSS') && (
                            <button onClick={() => setShowPreview(p => !p)} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                                {showPreview ? <EyeOff size={12} /> : <Eye size={12} />} {showPreview ? 'Hide' : 'Show'} Preview
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col relative">
                        {q?.type === 'MCQ' ? (
                            <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                                <div className="max-w-xl mx-auto space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Answer</h3>
                                    {q?.options?.map((opt, i) => (
                                        <button key={i} onClick={() => handleAnswerChange(q?._id, opt)} className={`w-full p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${currentAnswer === opt ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'}`}>
                                            <div className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${currentAnswer === opt ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'}`}>
                                                {currentAnswer === opt && <CheckCircle size={14} strokeWidth={3} />}
                                            </div>
                                            <span className="text-sm font-medium">{opt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (q?.type === 'UI_UX' || q?.type === 'MINI_HACKATHON' || roundInfo?.type === 'UI_UX_CHALLENGE' || roundInfo?.type === 'MINI_HACKATHON') ? (
                            <div className="p-8 h-full overflow-y-auto flex flex-col items-center justify-center bg-slate-50/50">
                                <div className="max-w-xl w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Code2 size={32} /></div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Submission (Practice)</h3>
                                        <p className="text-slate-500 text-sm mt-2 font-medium">Provide your project details for practice.</p>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">URL Link</label>
                                            <input type="url" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" value={currentAnswer || ''} onChange={(e) => handleAnswerChange(q?._id, e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">PDF Upload</label>
                                            <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${pdfUrl ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:bg-amber-50 bg-slate-50'}`}>
                                                <input type="file" accept=".pdf" className="hidden" onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file && file.type === 'application/pdf') {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => { setPdfUrl(reader.result); toast.success("PDF Attached"); };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }} />
                                                {pdfUrl ? <span className="text-sm font-bold text-emerald-700">✓ PDF Snapshot Attached</span> : <span className="text-sm font-bold text-slate-700">Select PDF File</span>}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-[10px] text-amber-800 font-black uppercase tracking-tight"><AlertTriangle size={16} />Simulation Mode: Files are NOT uploaded.</div>
                                </div>
                            </div>
                        ) : (q?.type === 'CODE' || q?.type === 'DEBUG' || q?.type === 'MISSING_BLOCK') ? (
                            <Editor
                                height="100%"
                                language={q?.category === 'SQL' ? 'sql' : q?.category === 'HTML' ? 'html' : q?.category === 'CSS' ? 'css' : 'javascript'}
                                theme="light"
                                value={currentAnswer || (q?.type === 'DEBUG' || q?.type === 'MISSING_BLOCK' ? q?.sampleInput : '')}
                                onChange={val => handleAnswerChange(q?._id, val)}
                                options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }}
                            />
                        ) : (
                            <div className="p-6 h-full flex flex-col">
                                <textarea className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 outline-none focus:ring-4 focus:ring-amber-500/10 resize-none font-mono text-sm shadow-sm" placeholder="// Enter your answer here..." value={currentAnswer} onChange={e => handleAnswerChange(q?._id, e.target.value)} />
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={11} /> Autosave Active</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="h-1 w-20 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-500 ${isRequirementMet ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${completionRate}%` }} />
                                </div>
                                <span className={`text-[9px] font-black font-mono ${isRequirementMet ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    {answeredCount}/{questions.length} ({Math.round(completionRate)}%)
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={() => isRequirementMet ? setShowConfirmModal(true) : handleFinalSubmit()} disabled={isSubmitting} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${isRequirementMet ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white border border-slate-200 text-slate-400 hover:text-amber-600'}`}>
                                <CheckCircle size={14} /> {isSubmitting ? 'Finalizing...' : 'Finalize Practice'}
                            </button>
                        </div>
                    </div>
                </div>
            </Split>

            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                         <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><CheckCircle size={32} /></div>
                         <h3 className="text-2xl font-black text-center mb-2">Finalize Practice?</h3>
                         <p className="text-slate-500 text-center mb-8">Once submitted, answers cannot be modified.</p>
                         <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3.5 rounded-xl font-black text-slate-500 border border-slate-200 hover:bg-slate-50">Cancel</button>
                            <button onClick={() => { setShowConfirmModal(false); handleFinalSubmit(); }} className="flex-1 py-3.5 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700">Confirm</button>
                         </div>
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                .gutter { background-color: #f1f5f9; cursor: col-resize; display: flex; align-items: center; justify-content: center; position: relative; }
                .gutter::after { content: ''; position: absolute; height: 30px; width: 3px; background-color: #cbd5e1; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}} />
        </div>
    );
};

export default PracticeArena;
