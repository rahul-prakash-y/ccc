import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, Loader2, ChevronDown, ClipboardCheck, ExternalLink, AlertTriangle, Check, ChevronUp, User, BookOpen, Star, CheckCircle2, Phone, Calendar, Linkedin, Github, User as UserIcon } from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import Pagination from './components/Pagination';
import toast from 'react-hot-toast';
import { useEvaluationStore } from '../../store/evaluationStore';
import { SkeletonList } from '../Skeleton';

// ─── Single question evaluation row (inside a student's submission card) ─────
const QuestionEvalRow = ({ submissionId, questionEntry, onScoreSaved, onTransfer }) => {
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
                <div className="flex items-center gap-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{question.points} Points Max</p>
                    <button
                        onClick={() => onTransfer(question)}
                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-amber-600 transition-all flex items-center gap-1 group"
                        title="Transfer Evaluation to another Admin"
                    >
                        <UserIcon size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Transfer</span>
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Answer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Student's Answer</p>
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

                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Correct / Expected Answer</p>
                        {question.correctAnswer ? (
                            <pre className="text-xs text-emerald-800 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                                {question.correctAnswer}
                            </pre>
                        ) : (
                            <p className="text-xs text-slate-400 italic">No reference answer provided for this question.</p>
                        )}
                    </div>
                </div>

                {/* Question Description for Admin context */}
                <div className="px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Grading Context / Instructions</p>
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

// ─── Transfer Evaluation Modal ────────────────────────────────────────────────
const TransferEvalModal = ({ question, isOpen, onClose, onTransferred }) => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const [selectedAdminId, setSelectedAdminId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            const fetchAdmins = async () => {
                setLoading(true);
                try {
                    const res = await api.get(`${API}/admins/list`);
                    setAdmins(res.data.data.filter(a => a._id !== JSON.parse(localStorage.getItem('user'))?.userId));
                } catch {
                    toast.error('Failed to load admin list');
                } finally {
                    setLoading(false);
                }
            };
            fetchAdmins();
        }
    }, [isOpen]);

    const handleTransfer = async () => {
        if (!selectedAdminId) return;
        setTransferring(true);
        setError('');
        try {
            await api.patch(`${API}/manual-evaluations/transfer/${question._id}`, {
                newAdminId: selectedAdminId
            });
            onTransferred();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to transfer evaluation');
        } finally {
            setTransferring(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                            <UserIcon size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 leading-none">Transfer Evaluation</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                                Reassigning: {question.title}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Target Admin</label>
                            {loading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="animate-spin text-indigo-500" size={24} />
                                </div>
                            ) : (
                                <div className="grid gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {admins.map(admin => (
                                        <button
                                            key={admin._id}
                                            onClick={() => setSelectedAdminId(admin._id)}
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${selectedAdminId === admin._id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">{admin.name}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{admin.studentId}</p>
                                            </div>
                                            {selectedAdminId === admin._id && <Check size={14} className="text-indigo-600" />}
                                        </button>
                                    ))}
                                    {admins.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-4 italic">No other active admins available.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleTransfer}
                        disabled={!selectedAdminId || transferring}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                        {transferring ? <Loader2 size={13} className="animate-spin" /> : <ClipboardCheck size={13} />}
                        {transferring ? 'Transferring...' : 'Confirm Transfer'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ─── Student Submission Card ──────────────────────────────────────────────────
const SubmissionEvalCard = ({ submission, onScoreSaved, onTransfer }) => {
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
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                {submission.student?.studentId} &bull; {submission.round?.name}
                            </p>
                            <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                                {submission.student?.phone && (
                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-500 overflow-hidden max-w-[100px]" title={submission.student.phone}>
                                        <Phone size={10} className="text-indigo-400" />
                                        <span className="truncate">{submission.student.phone}</span>
                                    </div>
                                )}
                                {submission.student?.dob && (
                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400">
                                        <Calendar size={10} />
                                        <span>{new Date(submission.student.dob).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 ml-1">
                                    {submission.student?.linkedinProfile && (
                                        <Linkedin size={10} className="text-slate-300 hover:text-blue-500 transition-colors" />
                                    )}
                                    {submission.student?.githubProfile && (
                                        <Github size={10} className="text-slate-300 hover:text-slate-600 transition-colors" />
                                    )}
                                </div>
                            </div>
                        </div>
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
                                        onTransfer={onTransfer}
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
    // 1. Global Store State
    const {
        evaluationQueue: data,
        loading,
        error,
        pagination,
        fetchQueue: fetchEvaluations,
        updateEvaluation,
        removeQuestionFromEvaluation
    } = useEvaluationStore();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [transferModal, setTransferModal] = useState({ isOpen: false, question: null, submissionId: null });

    // 1. Fetch Logic
    useEffect(() => {
        fetchEvaluations({ search, page, limit });
    }, [search, page, limit, fetchEvaluations]);

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
                            onScoreSaved={(questionId, scoreData) => {
                                updateEvaluation(submission._id, questionId, scoreData);
                            }}
                            onTransfer={(q) => setTransferModal({ isOpen: true, question: q, submissionId: submission._id })}
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

            {/* Transfer Modal */}
            <TransferEvalModal
                isOpen={transferModal.isOpen}
                question={transferModal.question}
                onClose={() => setTransferModal({ isOpen: false, question: null, submissionId: null })}
                onTransferred={() => {
                    removeQuestionFromEvaluation(transferModal.submissionId, transferModal.question._id);
                    toast.success("Evaluation transferred successfully");
                }}
            />
        </div>
    );
};

export default EvaluationTab;
