import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, Pencil, Trash2, X, Check, Filter, Loader2,
    ChevronDown, AlertTriangle, Eye, EyeOff, BookOpen, ClipboardCheck, Import, Search, User as UserIcon, Download, Upload, FileSpreadsheet,
    Sparkles
} from 'lucide-react';
import { api } from '../../store/authStore';
import { useRoundStore } from '../../store/roundStore';
import { API, DIFFICULTY_COLORS } from './constants';
import Pagination from './components/Pagination';
import toast from 'react-hot-toast';
import { useConfirm } from '../../store/confirmStore';
import { SkeletonList } from '../Skeleton';
import QuestionModal from './QuestionModal';

// ─── Import From Library Modal ──────────────────────────────────────────────────────
const ImportFromLibraryModal = ({ roundId, onClose, onImportSuccess }) => {
    const [bankQuestions, setBankQuestions] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [importedBankIds, setImportedBankIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    useEffect(() => {
        const fetchBankAndExisting = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (search) params.append('search', search);
                if (category) params.append('category', category);

                const [bankRes, existingRes] = await Promise.all([
                    api.get(`${API}/question-bank?${params.toString()}`),
                    api.get(`${API}/questions/${roundId}?limit=1000`) // fetch all to check imported
                ]);
                setBankQuestions(bankRes.data.data || []);

                // Track which bank IDs have already been imported
                const qList = existingRes.data.data || [];
                const importedIds = new Set(qList.filter(q => q.isBank).map(q => q._id));
                setImportedBankIds(importedIds);
            } catch {
                setError('Failed to fetch library questions.');
            } finally {
                setLoading(false);
            }
        };
        fetchBankAndExisting();
    }, [roundId, search, category]);

    const toggleSelection = (id, isAlreadyImported) => {
        if (isAlreadyImported) return;
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        const nonImported = bankQuestions.filter(q => !importedBankIds.has(q._id));
        if (nonImported.length === 0) return;

        const allSelected = nonImported.every(q => selectedIds.has(q._id));
        const newSelected = new Set(selectedIds);

        if (allSelected) {
            nonImported.forEach(q => newSelected.delete(q._id));
        } else {
            nonImported.forEach(q => newSelected.add(q._id));
        }
        setSelectedIds(newSelected);
    };

    const handleImport = async () => {
        if (selectedIds.size === 0) return;
        setImporting(true);
        setError('');
        try {
            await api.post(`${API}/rounds/${roundId}/import-from-bank`, {
                questionIds: Array.from(selectedIds)
            });
            onImportSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to import questions');
            setImporting(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 py-8"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-full flex flex-col shadow-2xl overflow-hidden"
                >
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <Import size={18} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 text-lg">Import from Library</h2>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Select questions to copy into this round</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative flex-1 w-full">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search library questions..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-40">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <Filter size={12} />
                                    </div>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none shadow-sm cursor-pointer"
                                    >
                                        <option value="">All Categories</option>
                                        <option value="GENERAL">General</option>
                                        <option value="SQL">SQL</option>
                                        <option value="HTML">HTML</option>
                                        <option value="CSS">CSS</option>
                                        <option value="UI_UX">UI/UX</option>
                                        <option value="MINI_HACKATHON">Hackathon</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                                <button
                                    onClick={toggleSelectAll}
                                    disabled={bankQuestions.filter(q => !importedBankIds.has(q._id)).length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-sm active:scale-95 whitespace-nowrap disabled:opacity-50"
                                >
                                    <Check size={14} className={bankQuestions.filter(q => !importedBankIds.has(q._id)).every(q => selectedIds.has(q._id)) ? "text-emerald-500" : "text-slate-400"} />
                                    Select All
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar p-6 flex-1 bg-slate-50/30">
                        {loading ? (
                            <div className="py-4">
                                <SkeletonList count={5} />
                            </div>
                        ) : error && bankQuestions.length === 0 ? (
                            <div className="text-red-500 font-bold text-sm text-center py-10">{error}</div>
                        ) : bankQuestions.length === 0 ? (
                            <div className="text-slate-400 font-bold text-sm text-center py-10 flex flex-col items-center gap-2">
                                <BookOpen size={30} className="text-slate-300" />
                                No questions found in the Global Library.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {bankQuestions.map(q => {
                                    const isAlreadyImported = importedBankIds.has(q._id);
                                    const isSelected = selectedIds.has(q._id);

                                    return (
                                        <div
                                            key={q._id}
                                            onClick={() => toggleSelection(q._id, isAlreadyImported)}
                                            className={`p-4 rounded-xl border-2 transition-all flex gap-4 items-center 
                                                ${isAlreadyImported ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed' :
                                                    isSelected ? 'border-emerald-500 bg-emerald-50 flex-row-reverse cursor-pointer' :
                                                        'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border 
                                                ${isAlreadyImported ? 'bg-slate-200 border-slate-300 text-slate-400' :
                                                    isSelected ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                        'bg-white border-slate-300'
                                                }`}>
                                                {(isSelected || isAlreadyImported) && <Check size={14} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-bold text-slate-900 text-sm">{q.title}</p>
                                                    {isAlreadyImported && (
                                                        <span className="text-[9px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                                                            Imported
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider">
                                                    <span className={`px-1.5 py-0.5 rounded border ${DIFFICULTY_COLORS[q.difficulty]}`}>{q.difficulty}</span>
                                                    <span className="text-slate-500">{q.type}</span>
                                                    <span className="text-emerald-600">{q.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0 items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                            {selectedIds.size} selected
                        </span>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors font-bold text-sm bg-white">
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing || selectedIds.size === 0}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded-xl text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 active:scale-95 text-sm"
                            >
                                {importing ? <Loader2 size={16} className="animate-spin" /> : <Import size={16} />}
                                Import Selected
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── Refined Question Form Modal ────────────────────────────────────────────────────────

// ─── Bulk Upload Modal (Round-specific) ────────────────────────────────────────
const BulkUploadModal = ({ roundId, rounds, onClose, onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [templateType, setTemplateType] = useState('');
    const round = rounds.find(r => r._id === roundId);

    React.useEffect(() => {
        if (round && !templateType) setTemplateType(round.type);
    }, [round, templateType]);

    const handleDownloadTemplate = async () => {
        try {
            const res = await api.get(`${API}/rounds/${roundId}/upload-template?type=${templateType}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `template_${templateType.toLowerCase()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Template downloaded!');
        } catch {
            toast.error('Failed to download template.');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return setError('Please select a file first.');
        setUploading(true);
        setError('');
        setResult(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post(`${API}/bulk-upload-questions?roundId=${roundId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            toast.success(res.data.message);
            if (onUploadSuccess) onUploadSuccess();
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.details || 'Failed to upload file.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <Upload size={18} />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-900 text-lg">Bulk Upload Questions</h2>
                                {round && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Target: {round.name}</p>}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Select Question Type Template</label>
                                <div className="relative">
                                    <select 
                                        value={templateType}
                                        onChange={e => setTemplateType(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
                                    >
                                        <option value="GENERAL">Standard (MCQ/Explanation)</option>
                                        <option value="SQL_CONTEST">SQL Programming</option>
                                        <option value="HTML_CSS_QUIZ">HTML/CSS MCQ</option>
                                        <option value="HTML_CSS_DEBUG">HTML/CSS Debugging</option>
                                        <option value="UI_UX_CHALLENGE">UI/UX Design Submission</option>
                                        <option value="MINI_HACKATHON">Mini Hackathon (Project)</option>
                                        <option value="PRACTICE">General Practice</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleDownloadTemplate}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl text-indigo-600 text-sm font-black transition-all shadow-sm active:scale-[0.98]"
                            >
                                <Download size={16} /> DOWNLOAD {templateType.replace(/_/g, ' ')} TEMPLATE
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div
                                className="relative border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-emerald-50/30 hover:border-emerald-300 transition-all cursor-pointer group"
                            >
                                <input
                                    type="file"
                                    accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    onChange={e => { setFile(e.target.files[0]); setResult(null); setError(''); }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform mb-3">
                                    <FileSpreadsheet size={24} className="text-emerald-500" />
                                </div>
                                <p className="text-sm font-bold text-slate-700">{file ? file.name : 'Click or Drag Excel File'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Max 5MB · .xlsx only</p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            {result && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                                    <p className="text-emerald-700 text-xs font-bold">{result.message}</p>
                                    {result.errorCount > 0 && (
                                        <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                                            {result.errorCount} rows had errors and were skipped.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={uploading || !file}
                                    className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
                                >
                                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    Upload Questions
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── Main Question Manager Tab ──────────────────────────────────────────────────────
const QuestionManagerTab = ({ forcePractice = false }) => {
    const { rounds, activeRoundId, fetchRounds } = useRoundStore();
    const showConfirm = useConfirm(state => state.showConfirm);
    
    // Filtering rounds based on forcePractice
    const filteredRounds = React.useMemo(() => {
        if (forcePractice) return (rounds || []).filter(r => r.type === 'PRACTICE');
        return (rounds || []).filter(r => r.type !== 'PRACTICE');
    }, [rounds, forcePractice]);

    const [selectedRound, setSelectedRound] = useState(activeRoundId);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(null); // 'add', 'import', 'bulk-upload', or Question object

    useEffect(() => {
        if (!rounds || rounds.length === 0) fetchRounds();
    }, [rounds, fetchRounds]);

    // Sync from store if jump-to happens, but verify it's in filteredRounds
    useEffect(() => {
        const isValid = filteredRounds.some(r => r._id === selectedRound);
        if (activeRoundId && filteredRounds.some(r => r._id === activeRoundId)) {
            setSelectedRound(activeRoundId);
        } else if ((!selectedRound || !isValid) && filteredRounds.length > 0) {
            setSelectedRound(filteredRounds[0]._id);
        }
    }, [activeRoundId, filteredRounds, selectedRound]);
    const [expandedId, setExpandedId] = useState(null);

    // Pagination & Search States
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [pagination, setPagination] = useState({ totalPages: 1, totalRecords: 0 });

    // Selection States
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSelecting, setIsSelecting] = useState(false);

    const fetchQuestions = useCallback(async (roundId, isInitial = false) => {
        if (!roundId) return;
        if (isInitial) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('page', page);
            params.append('limit', limit);

            const res = await api.get(`${API}/questions/${roundId}?${params.toString()}`);
            setQuestions(res.data.data || []);
            setPagination(res.data.pagination || { totalPages: 1, totalRecords: 0 });
        } catch (e) {
            console.error("Failed to fetch questions:", e);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [search, page, limit]);

    // Reset page on search or round change
    useEffect(() => {
        setPage(1);
    }, [search, selectedRound]);

    // Fetch on round selection. 
    // Removed the aggressive polling interval; admins editing questions don't need real-time syncing unless working concurrently.
    useEffect(() => {
        if (selectedRound) {
            fetchQuestions(selectedRound, true);
        } else {
            setQuestions([]);
        }
    }, [selectedRound, fetchQuestions]);

    const handleDelete = (questionId, isBank) => {
        const title = isBank ? "Unlink Question" : "Delete Question";
        const message = isBank ? "Remove this library question from the current round? It will remain in the global library." : "Delete this question permanently?";
        const confirmLabel = isBank ? "Unlink Question" : "Delete Permanently";

        showConfirm({
            title,
            message,
            confirmLabel,
            isDanger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`${API}/questions/${questionId}?roundId=${selectedRound}`);
                    toast.success(isBank ? "Question unlinked successfully." : "Question deleted successfully.");
                    fetchQuestions(selectedRound);
                } catch (e) {
                    toast.error(e.response?.data?.error || (isBank ? "Unlinking failed." : "Deletion failed."));
                    console.error(e);
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;

        showConfirm({
            title: "Bulk Delete Questions",
            message: `Are you sure you want to delete/unlink ${selectedIds.size} selected questions?`,
            confirmLabel: "Delete Selected",
            isDanger: true,
            onConfirm: async () => {
                try {
                    await api.post(`${API}/questions/bulk-delete`, {
                        questionIds: Array.from(selectedIds),
                        roundId: selectedRound
                    });
                    toast.success(`Successfully processed ${selectedIds.size} questions.`);
                    setSelectedIds(new Set());
                    setIsSelecting(false);
                    fetchQuestions(selectedRound);
                } catch (e) {
                    toast.error(e.response?.data?.error || "Bulk deletion failed.");
                    console.error(e);
                }
            }
        });
    };

    const handleBulkUnlink = () => {
        const hasBankQuestions = questions.some(q => selectedIds.has(q._id) && q.isBank);
        if (!hasBankQuestions) {
            toast.error("No library questions selected for unlinking.");
            return;
        }

        showConfirm({
            title: "Bulk Unlink Questions",
            message: `Remove selected library questions from this round? They will remain in the Global Library.`,
            confirmLabel: "Unlink Selected",
            isDanger: true,
            onConfirm: async () => {
                try {
                    await api.post(`${API}/questions/bulk-delete`, {
                        questionIds: Array.from(selectedIds),
                        roundId: selectedRound,
                        mode: 'unlink'
                    });
                    toast.success("Library questions unlinked successfully.");
                    setSelectedIds(new Set());
                    setIsSelecting(false);
                    fetchQuestions(selectedRound);
                } catch (e) {
                    toast.error(e.response?.data?.error || "Bulk unlinking failed.");
                    console.error(e);
                }
            }
        });
    };

    const handleUnlinkAll = () => {
        showConfirm({
            title: "Clear all questions?",
            message: `Careful! This will remove ALL questions from the current round. Library questions will be unlinked, and round-specific questions will be deleted.`,
            confirmLabel: "Yes, Unlink All",
            isDanger: true,
            onConfirm: async () => {
                try {
                    await api.post(`${API}/rounds/${selectedRound}/unlink-all`);
                    toast.success("Round cleared successfully.");
                    fetchQuestions(selectedRound);
                } catch (e) {
                    toast.error(e.response?.data?.error || "Operation failed.");
                    console.error(e);
                }
            }
        });
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === questions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(questions.map(q => q._id)));
        }
    };

    const handleSave = () => {
        fetchQuestions(selectedRound);
        setModal(null);
    };

    const handleDownloadTemplate = async () => {
        if (!selectedRound) return;
        try {
            const res = await api.get(`${API}/rounds/${selectedRound}/upload-template`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const round = rounds.find(r => r._id === selectedRound);
            const typeLabel = round?.type || 'questions';
            link.setAttribute('download', `template_${typeLabel}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Template downloaded successfully.");
        } catch (err) {
            console.error("Failed to download template", err);
            toast.error("Failed to download template.");
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">

            {/* Toolbar Area */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-200/60">
                <div className="relative min-w-[300px]">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded border border-slate-200 pointer-events-none text-slate-500">
                        <Filter size={12} />
                    </div>
                    <select
                        value={selectedRound}
                        onChange={e => setSelectedRound(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-8 py-2 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none shadow-sm cursor-pointer"
                    >
                        <option value="">— Target Round —</option>
                        {filteredRounds.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative flex-1 max-w-xs">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search questions..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-4 px-2">
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Items</p>
                        <p className="text-sm font-bold text-slate-700 leading-none mt-1">{pagination.totalRecords} Items</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSelecting && selectedIds.size > 0 && (
                            <div className="flex items-center gap-2">
                                {questions.some(q => selectedIds.has(q._id) && q.isBank) && (
                                    <button
                                        onClick={handleBulkUnlink}
                                        className="flex items-center gap-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-orange-700 font-bold text-sm transition-all shadow-sm active:scale-95"
                                        title="Only unlinks library questions, skips others"
                                    >
                                        <X size={16} /> Unlink Library ({Array.from(selectedIds).filter(id => questions.find(q => q._id === id)?.isBank).length})
                                    </button>
                                )}
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-red-700 font-bold text-sm transition-all shadow-sm active:scale-95"
                                >
                                    <Trash2 size={16} /> Delete All ({selectedIds.size})
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setIsSelecting(!isSelecting);
                                setSelectedIds(new Set());
                            }}
                            disabled={!selectedRound || questions.length === 0}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 ${isSelecting ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <Check size={16} /> <span className="hidden sm:inline">{isSelecting ? 'Cancel Selection' : 'Select'}</span>
                        </button>
                        {!isSelecting && (
                            <>
                                <button
                                    onClick={handleDownloadTemplate}
                                    disabled={!selectedRound}
                                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 disabled:hover:bg-indigo-50 rounded-xl text-indigo-700 font-bold text-sm transition-all shadow-sm active:scale-95"
                                >
                                    <Download size={16} /> <span className="hidden sm:inline">Template</span>
                                </button>
                                <button
                                    onClick={() => setModal('bulk-upload')}
                                    disabled={!selectedRound}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 rounded-xl text-emerald-700 font-bold text-sm transition-all shadow-sm active:scale-95"
                                >
                                    <Upload size={16} /> <span className="hidden sm:inline">Bulk Upload</span>
                                </button>
                                <button
                                    onClick={() => setModal('import')}
                                    disabled={!selectedRound}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-50 rounded-xl text-slate-700 font-bold text-sm transition-all shadow-sm active:scale-95"
                                >
                                    <Import size={16} /> <span className="hidden sm:inline">From Library</span>
                                </button>
                                <button
                                    onClick={handleUnlinkAll}
                                    disabled={!selectedRound || questions.length === 0}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 rounded-xl text-red-700 font-bold text-sm transition-all shadow-sm active:scale-95"
                                    title="Unlink/Delete ALL questions in this round"
                                >
                                    <Trash2 size={16} /> <span className="hidden sm:inline">Unlink All</span>
                                </button>
                                <button
                                    onClick={() => setModal('add')}
                                    disabled={!selectedRound}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl text-white font-bold text-sm transition-all shadow-md shadow-indigo-200 active:scale-95"
                                >
                                    <Plus size={16} /> <span className="hidden sm:inline">Add Question</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isSelecting && questions.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-800 transition-colors"
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedIds.size === questions.length ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-300'
                                }`}>
                                {selectedIds.size === questions.length && <Check size={10} />}
                            </div>
                            {selectedIds.size === questions.length ? 'Deselect All' : 'Select All on Page'}
                        </button>
                        <span className="text-xs text-slate-500 font-medium">
                            {selectedIds.size} questions selected
                        </span>
                    </div>
                </div>
            )}

            {/* List Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">

                {!selectedRound ? (
                    <div className="flex flex-col items-center justify-center py-20 h-full border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <BookOpen size={48} className="text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">Target Environment Required</p>
                        <p className="text-xs text-slate-400 mt-1">Select a round from the dropdown to access its question bank.</p>
                    </div>
                ) : loading ? (
                    <div className="py-4">
                        <SkeletonList count={10} />
                    </div>
                ) : questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 h-full border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <BookOpen size={48} className="text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">Repository Empty</p>
                        <p className="text-xs text-slate-400 mt-1">There are no questions attached to this round.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {questions.map((q, idx) => (
                                <motion.div
                                    key={q._id}
                                    layout
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white border border-slate-200 hover:border-indigo-300 transition-colors rounded-xl overflow-hidden shadow-sm flex flex-col"
                                >
                                    {/* Header / Summary Bar */}
                                    <div className="flex items-center gap-4 p-3 pr-4">
                                        {isSelecting && (
                                            <div
                                                onClick={() => toggleSelection(q._id)}
                                                className="w-8 shrink-0 flex items-center justify-center cursor-pointer"
                                            >
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.has(q._id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 hover:border-indigo-300'
                                                    }`}>
                                                    {selectedIds.has(q._id) && <Check size={12} />}
                                                </div>
                                            </div>
                                        )}
                                        <div className="w-8 shrink-0 flex items-center justify-center">
                                            <span className="text-xs font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-md">{(page - 1) * limit + idx + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <p className="font-bold text-slate-900 truncate text-[13px]">{q.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${DIFFICULTY_COLORS[q.difficulty] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                                    {q.difficulty}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{q.type}</span>
                                                {q.isManualEvaluation && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-amber-50 border-amber-200 text-amber-700 flex items-center gap-1">
                                                        <ClipboardCheck size={9} /> {q.assignedAdmin ? `Eval: ${q.assignedAdmin.name.split(' ')[0]}` : 'Manual'}
                                                    </span>
                                                )}
                                                {q.isBank && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-blue-50 border-blue-200 text-blue-700">
                                                        Library
                                                    </span>
                                                )}
                                                {q.isPractice && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-amber-50 border-amber-200 text-amber-600 flex items-center gap-1 ml-2">
                                                        <Sparkles size={9} /> PRACTICE
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right pr-4 border-r border-slate-100 hidden sm:block">
                                            <p className="text-xs font-black text-indigo-600">{q.points} <span className="text-[10px] text-slate-400 uppercase tracking-widest">Pts</span></p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
                                                className={`p-2 rounded-lg transition-colors ${expandedId === q._id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                                title="Toggle Preview"
                                            >
                                                {expandedId === q._id ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                            <button
                                                onClick={() => setModal(q)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                title="Edit Record"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(q._id, q.isBank)}
                                                className={`p-2 rounded-lg transition-colors ${q.isBank ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50' : 'text-slate-300 hover:text-red-600 hover:bg-red-50'}`}
                                                title={q.isBank ? "Unlink from Round" : "Delete Record"}
                                            >
                                                {q.isBank ? <X size={16} /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Accordion Content Preview */}
                                    <AnimatePresence>
                                        {expandedId === q._id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-slate-100 bg-slate-50/50 overflow-hidden"
                                            >
                                                <div className="p-5 space-y-4 text-sm text-slate-600">
                                                    <div className="prose prose-sm prose-slate max-w-none">
                                                        <p className="leading-relaxed whitespace-pre-wrap font-medium">{q.description}</p>
                                                    </div>

                                                    {q.type === 'MCQ' && q.options?.length > 0 && (
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Available Options</p>
                                                            <ul className="space-y-2">
                                                                {q.options.map((opt, i) => {
                                                                    const isCorrect = opt === q.correctAnswer;
                                                                    return (
                                                                        <li key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                                                            <div className={`w-5 h-5 flex items-center justify-center rounded-md text-[10px] font-black ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{String.fromCharCode(65 + i)}</div>
                                                                            <span className={`font-mono text-xs ${isCorrect ? 'text-emerald-800 font-bold' : 'text-slate-600'}`}>{opt}</span>
                                                                            {isCorrect && <Check size={14} className="text-emerald-600 ml-auto" />}
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {q.type !== 'MCQ' && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {q.inputFormat && (
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Input Format</p>
                                                                    <div className="bg-white border border-slate-200 p-3 rounded-lg text-xs whitespace-pre-wrap">{q.inputFormat}</div>
                                                                </div>
                                                            )}
                                                            {q.outputFormat && (
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Output Format</p>
                                                                    <div className="bg-white border border-slate-200 p-3 rounded-lg text-xs whitespace-pre-wrap">{q.outputFormat}</div>
                                                                </div>
                                                            )}
                                                            {q.sampleInput && (
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sample Input</p>
                                                                    <pre className="bg-slate-800 text-slate-300 p-3 rounded-lg font-mono text-xs overflow-x-auto">{q.sampleInput}</pre>
                                                                </div>
                                                            )}
                                                            {q.sampleOutput && (
                                                                <div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sample Output</p>
                                                                    <pre className="bg-indigo-950 text-indigo-300 p-3 rounded-lg font-mono text-xs overflow-x-auto">{q.sampleOutput}</pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {q.correctAnswer && q.type !== 'MCQ' && (
                                                        <div className="pt-2">
                                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">
                                                                {q.type === 'CODE' ? 'Reference Code Solution' : 'Expected Answer Engine Match'}
                                                            </p>
                                                            <pre className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg font-mono text-xs overflow-x-auto">{q.correctAnswer}</pre>
                                                        </div>
                                                    )}

                                                    {q.isManualEvaluation && q.assignedAdmin && (
                                                        <div className="pt-3 border-t border-slate-200/60 mt-4 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                                <ClipboardCheck size={14} className="text-amber-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Assigned Evaluator</p>
                                                                <p className="font-bold text-slate-800 text-sm mt-0.5">{q.assignedAdmin.name} <span className="font-normal text-slate-400 text-xs ml-1">({q.assignedAdmin.studentId})</span></p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Creator Information */}
                                                    {q.createdBy && (
                                                        <div className="pt-3 border-t border-slate-200/60 mt-4 flex flex-col gap-1 text-xs text-slate-500">
                                                            <div className="flex items-center gap-1.5 font-medium">
                                                                <UserIcon size={12} className="text-slate-400" />
                                                                Created by: <span className="font-bold text-slate-700">{q.createdBy.name}</span>
                                                                {q.createdBy.role && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-black uppercase tracking-widest ml-1">{q.createdBy.role}</span>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.totalPages}
                            onPageChange={setPage}
                            totalRecords={pagination.totalRecords}
                            limit={limit}
                        />
                    </>
                )}
            </div>

            <AnimatePresence>
                {modal === 'import' && (
                    <ImportFromLibraryModal
                        roundId={selectedRound}
                        onClose={() => setModal(null)}
                        onImportSuccess={() => {
                            fetchQuestions(selectedRound); // refresh the list
                            setModal(null);
                        }}
                    />
                )}
                {modal === 'bulk-upload' && (
                    <BulkUploadModal
                        roundId={selectedRound}
                        rounds={rounds}
                        onClose={() => setModal(null)}
                        onUploadSuccess={() => {
                            fetchQuestions(selectedRound);
                            setModal(null);
                        }}
                    />
                )}
                {modal && modal !== 'import' && modal !== 'bulk-upload' && (
                    <QuestionModal
                        question={modal === 'add' ? null : modal}
                        roundId={selectedRound}
                        onClose={() => setModal(null)}
                        onSave={handleSave}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuestionManagerTab;