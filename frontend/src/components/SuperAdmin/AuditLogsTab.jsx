import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Filter, Search, Loader2, ChevronDown, Trash2, ClipboardList, AlertTriangle, Clock, Unlock, Check } from 'lucide-react';
import { api } from '../../store/authStore';
import { useRoundStore } from '../../store/roundStore';
import { API, STATUS_COLORS } from './constants';
import toast from 'react-hot-toast';
import { useConfirm } from '../../store/confirmStore';
import { useAuditStore } from '../../store/auditStore';
import Pagination from './components/Pagination';
import { SkeletonList } from '../Skeleton';

// ─── Extra Time / Re-entry Modal ─────────────────────────────────────────────
const ExtraTimeModal = ({ isOpen, onClose, onConfirm, studentName, title, type }) => {
    const [minutes, setMinutes] = useState('10');
    const [mode, setMode] = useState('ADD'); // 'ADD' or 'SUBTRACT'
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Use setTimeout to avoid synchronous setState during effect execution
            const timer = setTimeout(() => {
                setMinutes(type === 'RE_ENTRY' ? '10' : '5');
                setMode('ADD');
                setError('');
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isOpen, type]);

    const handleConfirm = () => {
        const num = parseInt(minutes, 10);
        if (isNaN(num)) {
            setError('Please enter a valid number of minutes.');
            return;
        }

        if (num <= 0) {
            setError('Minutes must be greater than zero.');
            return;
        }

        // Apply negative if subtracting
        const adjustment = mode === 'ADD' ? num : -num;

        onConfirm(adjustment);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${type === 'RE_ENTRY' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {type === 'RE_ENTRY' ? <Unlock size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 leading-none">{title}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                                Target: {studentName}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Direction Toggle for Time Adjustment */}
                        {type !== 'RE_ENTRY' && (
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setMode('ADD')}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'ADD' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Increase Time
                                </button>
                                <button
                                    onClick={() => setMode('SUBTRACT')}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'SUBTRACT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Decrease Time
                                </button>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                {mode === 'ADD' ? 'Minutes to Add' : 'Minutes to Subtract'}
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={minutes}
                                onChange={e => setMinutes(e.target.value)}
                                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 transition-all ${mode === 'ADD' ? 'focus:ring-indigo-500/50' : 'focus:ring-red-500/50'}`}
                                placeholder="Enter minutes..."
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-[10px] font-bold mt-1.5 flex items-center gap-1"><AlertTriangle size={10} /> {error}</p>}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {type === 'RE_ENTRY'
                                ? "This will reset their status to IN_PROGRESS and allow them to resume their session."
                                : mode === 'ADD'
                                    ? "The student will receive these minutes immediately in their active session."
                                    : "The student's remaining time will be reduced by these minutes immediately."}
                        </p>
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
                        onClick={handleConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${type === 'RE_ENTRY' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : mode === 'ADD' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
                    >
                        {type === 'RE_ENTRY' ? <Unlock size={14} /> : <Check size={14} />}
                        {type === 'RE_ENTRY' ? 'Approve Re-entry' : mode === 'ADD' ? 'Update Time' : 'Reduce Time'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const AuditLogsTab = () => {
    const { rounds } = useRoundStore();
    const showConfirm = useConfirm(state => state.showConfirm);
    const [selectedRound, setSelectedRound] = useState('');
    const [viewingLog, setViewingLog] = useState(null);
    const [roundQuestions, setRoundQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // 1. Global Store State
    const { auditLogs: logs, loading, pagination, fetchAuditLogs, removeAuditLog } = useAuditStore();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [busy, setBusy] = useState({});
    const [timeModal, setTimeModal] = useState({ isOpen: false, data: null, type: 'RE_ENTRY' });

    // 1. Fetch Logic
    useEffect(() => {
        const params = { page, limit };
        if (selectedRound) params.roundId = selectedRound;
        if (search) params.search = search;
        fetchAuditLogs(params);
    }, [selectedRound, search, page, limit, fetchAuditLogs]);

    // 2b. Fetch Questions for Round (for MCQ viewing)
    useEffect(() => {
        const fetchQuestions = async () => {
            if (!viewingLog?.round?._id) return;
            setLoadingQuestions(true);
            try {
                const res = await api.get(`${API}/questions/${viewingLog.round._id}?limit=200`);
                setRoundQuestions(res.data.data || []);
            } catch (e) {
                console.error("Failed to fetch questions for round audit:", e);
                setRoundQuestions([]);
            } finally {
                setLoadingQuestions(false);
            }
        };
        fetchQuestions();
    }, [viewingLog]);

    // Reset page on filter/search change
    useEffect(() => {
        setPage(1);
    }, [selectedRound, search]);

    // 3. Actions
    const handleDeleteSubmission = (submissionId) => {
        showConfirm({
            title: "Delete Submission Record",
            message: "CRITICAL: Are you sure you want to PERMANENTLY DELETE this submission record?\n\nThis removes the student's score and frees them to take the test again. This cannot be undone.",
            confirmLabel: "Delete Permanently",
            isDanger: true,
            onConfirm: async () => {
                setBusy(b => ({ ...b, [submissionId]: true }));
                try {
                    await api.delete(`${API}/submissions/${submissionId}`);
                    toast.success("Submission deleted successfully");
                    removeAuditLog(submissionId);
                } catch (e) {
                    toast.error(e.response?.data?.error || "Delete failed");
                } finally {
                    setBusy(b => ({ ...b, [submissionId]: false }));
                }
            }
        });
    };

    const handleAllowReEntry = (submissionId, studentName) => {
        setTimeModal({
            isOpen: true,
            type: 'RE_ENTRY',
            data: { submissionId, studentName },
            title: 'Approve Re-Entry'
        });
    };

    const handleAddTime = (submissionId, studentName) => {
        setTimeModal({
            isOpen: true,
            type: 'EXTRA_TIME',
            data: { submissionId, studentName },
            title: 'Grant Extra Time'
        });
    };

    const confirmExtraTime = async (minutes) => {
        const { submissionId, studentName } = timeModal.data;
        const isReEntry = timeModal.type === 'RE_ENTRY';

        setBusy(b => ({ ...b, [submissionId]: true }));
        try {
            const endpoint = isReEntry ? 'allow-reentry' : 'extra-time';
            await api.patch(`${API}/submissions/${submissionId}/${endpoint}`, { addMinutes: minutes });

            toast.success(isReEntry
                ? `Re-entry approved for ${studentName}`
                : `Successfully added ${minutes} minutes to ${studentName}.`
            );
            fetchAuditLogs({ page, limit, roundId: selectedRound, search }, true);
        } catch (e) {
            toast.error(e.response?.data?.error || "Action failed.");
        } finally {
            setBusy(b => ({ ...b, [submissionId]: false }));
        }
    };

    const downloadPdf = (pdfBase64, filename) => {
        const link = document.createElement('a');
        link.href = pdfBase64;
        link.download = filename || 'submission.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatFigmaUrl = (content) => {
        if (!content) return '';
        let url = content;
        try {
            const parsed = JSON.parse(content);
            // If it's the { qId: url } format, get the first value
            if (typeof parsed === 'object') {
                url = Object.values(parsed)[0] || '';
            }
        } catch {
            url = content;
        }

        if (!url) return '';
        if (!url.startsWith('http')) {
            return `https://${url}`;
        }
        return url;
    };

    return (
        <div className="space-y-4 h-full flex flex-col">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/60">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search logs by student ID, name, or round..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>

                <div className="relative min-w-[200px]">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded border border-slate-200 pointer-events-none text-slate-500">
                        <Filter size={12} />
                    </div>
                    <select
                        value={selectedRound}
                        onChange={e => setSelectedRound(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-8 py-2 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer shadow-sm"
                    >
                        <option value="">All Rounds Filter</option>
                        {rounds.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            <AnimatePresence>
                {viewingLog && (
                    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewingLog(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                        {viewingLog.student?.name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-800 tracking-tight">{viewingLog.student?.name}</h3>
                                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{viewingLog.student?.studentId} &bull; {viewingLog.round?.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewingLog(null)}
                                    className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                                >
                                    <ChevronDown className="rotate-180" size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {(viewingLog.round?.type === 'UI_UX_CHALLENGE' || (viewingLog.pdfUrl)) ? (
                                    <div className="space-y-6">
                                        {viewingLog.codeContent && (
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Figma Project Link</h4>
                                                <a
                                                    href={formatFigmaUrl(viewingLog.codeContent)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-bold text-indigo-600 hover:underline break-all block"
                                                >
                                                    {formatFigmaUrl(viewingLog.codeContent)}
                                                </a>
                                            </div>
                                        )}
                                        {viewingLog.pdfUrl ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PDF Snapshot</h4>
                                                    <button
                                                        onClick={() => downloadPdf(viewingLog.pdfUrl, `UI_UX_${viewingLog.student?.studentId}.pdf`)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                                                    >
                                                        <Unlock size={14} className="rotate-180" /> Download PDF
                                                    </button>
                                                </div>
                                                <div className="w-full aspect-video bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative">
                                                    <iframe
                                                        src={viewingLog.pdfUrl}
                                                        className="w-full h-full border-none"
                                                        title="PDF Preview"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                                <AlertTriangle size={32} className="text-slate-300 mx-auto mb-2" />
                                                <p className="text-sm font-bold text-slate-500">No PDF uploaded for this submission</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Manual Evaluation Score Breakdown if available */}
                                        {viewingLog.manualScores && viewingLog.manualScores.length > 0 && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                                                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <ClipboardList size={12} /> Manual Evaluation Results
                                                </h4>
                                                <div className="space-y-2">
                                                    {viewingLog.manualScores.map((ms, idx) => (
                                                        <div key={idx} className="bg-white border border-amber-100 rounded-xl p-3 shadow-sm">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <p className="text-[10px] font-bold text-slate-700 truncate max-w-[70%]">
                                                                    {ms.questionId?.title || 'Unknown Question'}
                                                                </p>
                                                                <div className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black">
                                                                    {ms.score} Pts
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-1 text-[9px] font-bold">
                                                                <span className="text-slate-400">Awarded by: <span className="text-indigo-500">{ms.adminId?.name || 'Unknown Admin'}</span></span>
                                                                <span className="text-slate-300">{ms.evaluatedAt ? new Date(ms.evaluatedAt).toLocaleDateString() : ''}</span>
                                                            </div>
                                                            {ms.feedback && (
                                                                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Admin Feedback:</p>
                                                                    <p className="text-xs text-slate-600 italic leading-relaxed">"{ms.feedback}"</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Submitted Answers</h4>
                                        {loadingQuestions ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="animate-spin text-slate-300" size={32} />
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {(() => {
                                                    let answers = {};
                                                    try {
                                                        answers = JSON.parse(viewingLog.codeContent || '{}');
                                                    } catch {
                                                        return <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800"><pre className="text-xs font-mono text-indigo-300 whitespace-pre-wrap">{viewingLog.codeContent}</pre></div>;
                                                    }

                                                    if (typeof answers !== 'object' || Array.isArray(answers)) {
                                                        return <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800"><pre className="text-xs font-mono text-indigo-300 whitespace-pre-wrap">{viewingLog.codeContent}</pre></div>;
                                                    }

                                                    if (Object.keys(answers).length === 0) {
                                                        return <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm font-bold italic">No answers submitted for this session.</div>;
                                                    }

                                                    return Object.entries(answers).map(([qId, ans]) => {
                                                        const q = roundQuestions.find(rq => rq._id === qId);
                                                        return (
                                                            <div key={qId} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                                                    <span>{q?.type || 'STRAY ANS'} Question</span>
                                                                    <span className="text-slate-300 font-mono">ID: {qId.slice(-6)}</span>
                                                                </p>
                                                                <h5 className="text-xs font-bold text-slate-800 mb-2 leading-tight">
                                                                    {q ? q.title : <span className="text-slate-400 italic font-medium">Question not found (ID: {qId})</span>}
                                                                </h5>
                                                                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Answer:</p>
                                                                    <p className="text-xs font-mono text-indigo-600 font-bold whitespace-pre-wrap leading-relaxed">
                                                                        {String(ans)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Data Grid Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {loading ? (
                    <div className="py-4">
                        <SkeletonList count={10} />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <ClipboardList size={48} className="text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">No audit records found</p>
                        <p className="text-xs text-slate-400 mt-1">Adjust your search or round filter.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        {['Student Details', 'Round Context', 'Conducted By', 'Status', 'Score', 'Anomalies', 'Actions'].map((h, i) => (
                                            <th key={h} className={`px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap ${i === 6 ? 'text-right' : ''}`}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logs.map(log => {
                                        const isBanned = log.student?.isBanned;
                                        const isAnomalous = log.cheatFlags > 0 || log.tabSwitches > 0;

                                        return (
                                            <tr key={log._id} className={`hover:bg-slate-50/80 transition-colors group ${isBanned ? 'bg-red-50/20' : ''}`}>

                                                {/* Student Column */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-indigo-600 font-bold text-xs">{log.student?.studentId || '—'}</span>
                                                        {isBanned && (
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-100 text-red-600 uppercase tracking-wider">Blocked</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{log.student?.name || 'Unknown'}</p>
                                                </td>

                                                {/* Round Column */}
                                                <td className="px-4 py-3">
                                                    <p className="text-xs font-bold text-slate-800">{log.round?.name || '—'}</p>
                                                </td>

                                                {/* Conducted By Column */}
                                                <td className="px-4 py-3">
                                                    <p className="text-[11px] font-bold text-indigo-600">{log.conductedBy?.name || '—'}</p>
                                                </td>

                                                {/* Status Column */}
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${STATUS_COLORS[log.status] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                                        {(log.status || '').replace(/_/g, ' ')}
                                                    </span>
                                                </td>

                                                {/* Score Column */}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className={`font-mono font-bold text-sm leading-none ${log.score !== null ? 'text-slate-800' : 'text-slate-400'}`}>
                                                            {log.score ?? '—'}
                                                        </span>
                                                        {(log.manualScores && log.manualScores.length > 0) && (
                                                            <div className="flex items-center gap-1 mt-1 font-mono text-[9px] font-bold text-slate-400 whitespace-nowrap">
                                                                <span className="text-indigo-400">{log.autoScore || 0}</span>
                                                                <span>+</span>
                                                                <span className="text-amber-500">{log.manualScores.reduce((sum, ms) => sum + (ms.score || 0), 0)}</span>
                                                                <span className="text-[8px] opacity-70 ml-0.5">(A+M)</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Anomalies Column */}
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${log.tabSwitches > 0 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                            <span>Tabs: {log.tabSwitches ?? 0}</span>
                                                        </div>
                                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${log.cheatFlags > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                            <span>Flags: {log.cheatFlags ?? 0}</span>
                                                        </div>
                                                        {isAnomalous && (
                                                            <AlertTriangle size={14} className="text-amber-500 ml-1" />
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions Column */}
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setViewingLog(log)}
                                                            title="View Submission Details"
                                                            className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-indigo-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                                                        >
                                                            <ClipboardList size={14} />
                                                        </button>
                                                        {log.status === 'IN_PROGRESS' && (
                                                            <button
                                                                onClick={() => handleAddTime(log._id, log.student?.name || 'Student')}
                                                                disabled={busy[log._id]}
                                                                title="Grant Extra Time"
                                                                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all disabled:opacity-50"
                                                            >
                                                                {busy[log._id] ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                                                            </button>
                                                        )}
                                                        {(log.status === 'SUBMITTED' || log.status === 'DISQUALIFIED') && (
                                                            <button
                                                                onClick={() => handleAllowReEntry(log._id, log.student?.name || 'Student')}
                                                                disabled={busy[log._id]}
                                                                title="Approve Re-entry"
                                                                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all disabled:opacity-50"
                                                            >
                                                                {busy[log._id] ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteSubmission(log._id)}
                                                            disabled={busy[log._id]}
                                                            title="Wipe Submission Record"
                                                            className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                                                        >
                                                            {busy[log._id] ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.totalPages}
                            onPageChange={setPage}
                            totalRecords={pagination.totalRecords}
                            limit={limit}
                        />

                        <ExtraTimeModal
                            isOpen={timeModal.isOpen}
                            onClose={() => setTimeModal({ ...timeModal, isOpen: false })}
                            onConfirm={confirmExtraTime}
                            studentName={timeModal.data?.studentName}
                            title={timeModal.title}
                            type={timeModal.type}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default AuditLogsTab;
