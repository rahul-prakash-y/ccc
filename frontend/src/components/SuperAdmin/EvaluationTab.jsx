import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Loader2, ChevronDown, ClipboardCheck, ExternalLink, AlertTriangle, Check, ChevronUp, User, BookOpen, Star, CheckCircle2 } from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import Pagination from './components/Pagination';
import { SkeletonList } from '../Skeleton';

// ─── Single question evaluation row (inside a student's submission card) ─────
const QuestionEvalRow = ({ submissionId, questionEntry, onScoreSaved }) => {
    const { question, answer, existingScore } = questionEntry;
    const [score, setScore] = useState(existingScore?.score ?? '');
    const [feedback, setFeedback] = useState(existingScore?.feedback ?? '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(!!existingScore);
    const [error, setError] = useState('');

    const formatFigmaUrl = (url) => {
        if (!url || typeof url !== 'string') return url;
        const trimmed = url.trim();
        if (!trimmed) return trimmed;
        if (!trimmed.startsWith('http')) {
            return `https://${trimmed}`;
        }
        return trimmed;
    };



    const handleSave = async () => {
        const numScore = Number(score);
        if (score === '' || isNaN(numScore) || numScore < 0 || numScore > question.points) {
            setError(`Score must be between 0 and ${question.points}`);
            return;
        }
        setSaving(true);
        setError('');
        try {
            await api.post(`${API}/manual-evaluations/${submissionId}/score`, {
                questionId: question._id,
                score: numScore,
                feedback
            });
            setSaved(true);
            onScoreSaved();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save score');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Question Header */}
            <div className="px-4 py-2.5 bg-indigo-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-indigo-500" />
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{question.title}</p>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{question.points} Points Max</p>
            </div>

            <div className="p-4 space-y-4">
                {/* Answer Content */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Submitted Answer</p>
                    {answer !== null && answer !== undefined && String(answer).trim() !== '' ? (
                        <div>
                            {(question?.type === 'UI_UX' || question?.type === 'MINI_HACKATHON') ? (
                                <a
                                    href={formatFigmaUrl(String(answer))}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-indigo-600 hover:underline break-all"
                                >
                                    {String(answer)}
                                </a>
                            ) : (
                                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                                    {typeof answer === 'object' ? JSON.stringify(answer, null, 2) : String(answer)}
                                </pre>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic">No text answer submitted.</p>
                    )}
                </div>

                {/* Question Description for Admin context */}
                <div className="px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Grading Context</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed whitespace-pre-wrap">
                        {question.description}
                    </p>
                </div>

                {/* Score + feedback inputs */}
                <div className="grid grid-cols-[100px_1fr] gap-3 items-start">
                    <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                            Score <span className="text-slate-300">/ {question.points}</span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            max={question.points}
                            value={score}
                            onChange={e => { setScore(e.target.value); setSaved(false); }}
                            placeholder="0"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 shadow-sm text-center"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                            Feedback (optional)
                        </label>
                        <textarea
                            rows={2}
                            value={feedback}
                            onChange={e => { setFeedback(e.target.value); setSaved(false); }}
                            placeholder="Add remarks for the student..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none shadow-sm"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                        <AlertTriangle size={12} /> {error}
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${saved ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-100'}`}
                >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Check size={13} />}
                    {saving ? 'Saving...' : saved ? 'Update Score' : 'Save Score'}
                </button>
            </div>
        </div>
    );
};

// ─── Student Submission Card ──────────────────────────────────────────────────
const SubmissionEvalCard = ({ submission, onScoreSaved }) => {
    const [expanded, setExpanded] = useState(true);
    const gradedCount = submission.questions.filter(q => q.existingScore).length;

    const downloadPdf = (pdfBase64, filename) => {
        const link = document.createElement('a');
        link.href = pdfBase64;
        link.download = filename || 'submission.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <User size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-[14px] truncate">{submission.student?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {submission.student?.studentId} &bull; {submission.round?.name} &bull;{' '}
                            <span className="text-emerald-600">{gradedCount}/{submission.questions.length} questions graded</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                    {/* Progress bar */}
                    <div className="hidden sm:flex flex-col items-end gap-1">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-400 rounded-full transition-all"
                                style={{ width: submission.questions.length ? `${(gradedCount / submission.questions.length) * 100}%` : '0%' }}
                            />
                        </div>
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 overflow-hidden"
                    >
                        <div className="p-4 space-y-4 bg-slate-50/50">
                            {/* PDF Preview if available for this submission */}
                            {submission.pdfUrl && (
                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <ClipboardCheck size={12} /> Global Design Snapshot
                                        </p>
                                        <button
                                            onClick={() => downloadPdf(submission.pdfUrl, `UI_UX_${submission.student?.studentId || 'submission'}.pdf`)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            <ExternalLink size={12} />
                                            Download PDF
                                        </button>
                                    </div>
                                    <div className="w-full aspect-video bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative group">
                                        <iframe
                                            src={submission.pdfUrl}
                                            className="w-full h-full border-none"
                                            title="PDF Preview"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Question List */}
                            <div className="grid gap-4">
                                {submission.questions.map((qEntry, i) => (
                                    <QuestionEvalRow
                                        key={`${submission.submissionId}-${qEntry.question._id}-${i}`}
                                        submissionId={submission.submissionId}
                                        questionEntry={qEntry}
                                        student={submission.student}
                                        onScoreSaved={onScoreSaved}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Main Evaluation Tab ─────────────────────────────────────────────────────
const EvaluationTab = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [pagination, setPagination] = useState({ totalPages: 1, totalRecords: 0 });

    const fetchEvaluations = useCallback(async () => {
        setLoading(data.length === 0);
        setError('');
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('page', page);
            params.append('limit', limit);

            const res = await api.get(`${API}/manual-evaluations?${params.toString()}`);
            setData(res.data.data || []);
            setPagination(res.data.pagination || { totalPages: 1, totalRecords: 0 });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load evaluations');
        } finally {
            setLoading(false);
        }
    }, [search, page, limit, data.length]);

    useEffect(() => {
        setPage(1);
    }, [search]);

    useEffect(() => {
        fetchEvaluations();
    }, [fetchEvaluations]);

    const totalQuestions = data.reduce((sum, sub) => sum + sub.questions.length, 0);
    const totalGraded = data.reduce((sum, sub) =>
        sum + sub.questions.filter(q => q.existingScore).length, 0
    );

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Header stats */}
            <div className="flex max-md:flex-col max-md:gap-3 items-center justify-between bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                        <Star size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Manual Evaluation Queue</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            Students with questions assigned to you
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white border border-amber-200 rounded-xl pl-9 pr-4 py-2 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/50 shadow-sm w-64 placeholder:text-amber-200"
                        />
                    </div>
                    {!loading && (
                        <div className="text-right hidden sm:block border-l border-amber-200 pl-4">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Progress</p>
                            <p className="text-sm font-bold text-amber-800">{totalGraded} / {totalQuestions} items</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 space-y-3">
                {loading ? (
                    <SkeletonList count={8} />
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-red-200 rounded-2xl bg-red-50">
                        <AlertTriangle size={36} className="text-red-300 mb-3" />
                        <p className="text-sm font-bold text-red-500">{error}</p>
                        <button onClick={fetchEvaluations} className="mt-3 text-xs font-bold text-red-600 underline">Try Again</button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-amber-100 rounded-2xl bg-amber-50/30">
                        <ClipboardCheck size={48} className="text-amber-200 mb-3" />
                        <p className="text-sm font-bold text-slate-500">No Evaluation Assignments</p>
                        <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                            No submissions found for questions assigned to you.
                        </p>
                    </div>
                ) : (
                    data.map((submission, idx) => (
                        <SubmissionEvalCard
                            key={submission.submissionId || idx}
                            submission={submission}
                            onScoreSaved={fetchEvaluations}
                        />
                    ))
                )}
            </div>

            <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                totalRecords={pagination.totalRecords}
                limit={limit}
            />
        </div>
    );
};

export default EvaluationTab;
