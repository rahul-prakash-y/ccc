import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    ClipboardCheck, Loader2, AlertTriangle, Check, ChevronDown, ChevronUp,
    User, BookOpen, Star, Search
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import Pagination from './components/Pagination';

// ─── Single student evaluation row ──────────────────────────────────────────
const StudentEvalRow = ({ entry, question, onScoreSaved }) => {
    const [score, setScore] = useState(entry.existingScore?.score ?? '');
    const [feedback, setFeedback] = useState(entry.existingScore?.feedback ?? '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(!!entry.existingScore);
    const [error, setError] = useState('');

    const handleSave = async () => {
        const numScore = Number(score);
        if (score === '' || isNaN(numScore) || numScore < 0 || numScore > question.points) {
            setError(`Score must be between 0 and ${question.points}`);
            return;
        }
        setSaving(true);
        setError('');
        try {
            await api.post(`${API}/manual-evaluations/${entry.submissionId}/score`, {
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
        <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
            {/* Student header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <User size={14} />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-slate-900">{entry.student?.name || 'Unknown'}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{entry.student?.studentId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Submission status badge */}
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${entry.submissionStatus === 'SUBMITTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        entry.submissionStatus === 'IN_PROGRESS' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            entry.submissionStatus === 'DISQUALIFIED' ? 'bg-red-50 border-red-200 text-red-600' :
                                'bg-slate-50 border-slate-200 text-slate-500'
                        }`}>
                        {entry.submissionStatus || 'NOT STARTED'}
                    </span>
                    {saved && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-widest">
                            <Check size={10} /> Graded
                        </span>
                    )}
                </div>
            </div>

            {/* Student's answer */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Student's Answer</p>
                {entry.answer !== null && entry.answer !== undefined ? (
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                        {typeof entry.answer === 'object' ? JSON.stringify(entry.answer, null, 2) : String(entry.answer)}
                    </pre>
                ) : (
                    <p className="text-xs text-slate-400 italic">No answer submitted for this question.</p>
                )}
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
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-100 active:scale-[0.98]"
            >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {saving ? 'Saving...' : saved ? 'Update Score' : 'Save Score'}
            </button>
        </div>
    );
};

// ─── Evaluation question card ────────────────────────────────────────────────
const QuestionEvalCard = ({ item, onScoreSaved }) => {
    const [expanded, setExpanded] = useState(true);
    const gradedCount = item.students.filter(s => s.existingScore).length;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                        <ClipboardCheck size={16} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-[13px] truncate">{item.question.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {item.question.round?.name} &bull; {item.question.points} pts &bull;{' '}
                            <span className="text-emerald-600">{gradedCount}/{item.students.length} graded</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                    {/* Progress bar */}
                    <div className="hidden sm:flex flex-col items-end gap-1">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-400 rounded-full transition-all"
                                style={{ width: item.students.length ? `${(gradedCount / item.students.length) * 100}%` : '0%' }}
                            />
                        </div>
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
            </button>

            {/* Expanded student list */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 overflow-hidden"
                    >
                        {/* Question prompt visible to admin */}
                        <div className="px-4 pt-4 pb-3 bg-indigo-50/60 border-b border-indigo-100">
                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <BookOpen size={10} /> Question
                            </p>
                            <h3 className="text-sm font-bold text-indigo-900 mb-1">{item.question.title}</h3>
                            <p className="text-xs text-indigo-700 leading-relaxed whitespace-pre-wrap">
                                {item.question.description}
                            </p>
                        </div>

                        <div className="p-4 space-y-3 bg-slate-50/50">
                            {item.students.length === 0 ? (
                                <div className="text-center py-8">
                                    <BookOpen size={32} className="text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400 font-bold">No student submissions yet for this question's round.</p>
                                </div>
                            ) : (
                                item.students.map((entry, i) => (
                                    <StudentEvalRow
                                        key={`${entry.submissionId}-${i}`}
                                        entry={entry}
                                        question={item.question}
                                        onScoreSaved={onScoreSaved}
                                    />
                                ))
                            )}
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

    // Pagination & Search States
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

    // Reset page on search
    useEffect(() => {
        setPage(1);
    }, [search]);

    useEffect(() => {
        fetchEvaluations();
    }, [fetchEvaluations]);

    const totalStudents = data.reduce((sum, item) => sum + item.students.length, 0);
    const totalGraded = data.reduce((sum, item) => sum + item.students.filter(s => s.existingScore).length, 0);

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
                            Questions assigned to you for grading
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                        <input
                            type="text"
                            placeholder="Search questions or students..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white border border-amber-200 rounded-xl pl-9 pr-4 py-2 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/50 shadow-sm w-64 placeholder:text-amber-200"
                        />
                    </div>
                    {!loading && (
                        <div className="text-right hidden sm:block border-l border-amber-200 pl-4">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Progress</p>
                            <p className="text-sm font-bold text-amber-800">{totalGraded} / {totalStudents} graded</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 size={36} className="text-amber-400 animate-spin mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Assignments...</p>
                    </div>
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
                            No manual-evaluation questions have been assigned to you yet.
                            A super admin can assign questions to you from the Questions tab.
                        </p>
                    </div>
                ) : (
                    data.map((item, idx) => (
                        <QuestionEvalCard
                            key={item.question._id || idx}
                            item={item}
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
