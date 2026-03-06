import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, Pencil, Trash2, X, Check, Loader2,
    Eye, EyeOff, BookOpen, ClipboardCheck, AlertTriangle, Search,
    Upload, Download, FileSpreadsheet
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API, DIFFICULTY_COLORS } from './constants';
import Pagination from './components/Pagination';
import toast from 'react-hot-toast';
import { useConfirm } from '../../store/confirmStore';
import { SkeletonList } from '../Skeleton';

const QuestionModal = ({ question, onClose, onSave }) => {
    const isEdit = !!question;
    const [form, setForm] = useState({
        title: question?.title || '',
        description: question?.description || '',
        inputFormat: question?.inputFormat || '',
        outputFormat: question?.outputFormat || '',
        sampleInput: question?.sampleInput || '',
        sampleOutput: question?.sampleOutput || '',
        difficulty: question?.difficulty || 'MEDIUM',
        points: question?.points || 10,
        type: question?.type || 'CODE',
        category: question?.category || 'GENERAL',
        options: question?.options || [],
        correctAnswer: question?.correctAnswer || '',
        isManualEvaluation: question?.isManualEvaluation || false,
        assignedAdmin: question?.assignedAdmin?._id || question?.assignedAdmin || '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [admins, setAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);

    const fetchAdmins = useCallback(async () => {
        if (admins.length > 0) return;
        setLoadingAdmins(true);
        try {
            const res = await api.get(`${API}/admins`);
            setAdmins(res.data.data || []);
        } catch (e) {
            console.error('Failed to load admins:', e);
        } finally {
            setLoadingAdmins(false);
        }
    }, [admins.length]);

    const didInitFetch = React.useRef(false);
    useEffect(() => {
        if (!didInitFetch.current && form.isManualEvaluation) {
            didInitFetch.current = true;
            fetchAdmins();
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const url = isEdit ? `${API}/questions/${question._id}` : `${API}/question-bank`;
            const method = isEdit ? 'put' : 'post';
            const res = await api({ method, url, data: form });
            onSave(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to save bank question.");
        } finally {
            setSaving(false);
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...form.options];
        newOptions[index] = value;
        setForm({ ...form, options: newOptions });
    };

    const addOption = () => setForm({ ...form, options: [...form.options, ''] });
    const removeOption = (index) => setForm({ ...form, options: form.options.filter((_, i) => i !== index) });

    const field = (label, key, type = 'text', rows = null) => (
        <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
            {rows ? (
                <textarea
                    rows={rows}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none font-mono shadow-sm"
                />
            ) : (
                <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                />
            )}
        </div>
    );

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 py-8"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-full flex flex-col shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-indigo-50/50 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <BookOpen size={18} />
                            </div>
                            <h2 className="font-bold text-slate-900 text-lg">{isEdit ? 'Edit Bank Question' : 'Add Bank Question'}</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar p-6 flex-1">
                        <form id="question-form" onSubmit={handleSubmit} className="space-y-6">

                            {/* Top Configuration Row */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Question Type</label>
                                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                                    >
                                        <option value="CODE">Programming / Code</option>
                                        <option value="MCQ">Multiple Choice (MCQ)</option>
                                        <option value="DEBUG">Bug Fix / Debug</option>
                                        <option value="FILL_BLANKS">Fill in Blanks</option>
                                        <option value="EXPLAIN">Short Answer / Explain</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                                    >
                                        <option value="GENERAL">General</option>
                                        <option value="SQL">SQL</option>
                                        <option value="HTML">HTML</option>
                                        <option value="CSS">CSS</option>
                                        <option value="UI_UX">UI/UX</option>
                                    </select>
                                </div>
                            </div>

                            {/* Manual Evaluation Toggle */}
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                <label className="flex items-center gap-1.5 text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3">
                                    <ClipboardCheck size={13} /> Manual Evaluation Required
                                </label>
                                <div className="flex gap-3">
                                    {[{ val: false, label: 'No — Auto Graded' }, { val: true, label: 'Yes — Admin Scores' }].map(opt => (
                                        <label
                                            key={String(opt.val)}
                                            className={`flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${form.isManualEvaluation === opt.val
                                                ? opt.val ? 'border-amber-500 bg-amber-100 text-amber-900' : 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${form.isManualEvaluation === opt.val
                                                ? opt.val ? 'border-amber-500' : 'border-indigo-500'
                                                : 'border-slate-300'
                                                }`}>
                                                {form.isManualEvaluation === opt.val && (
                                                    <span className={`w-2 h-2 rounded-full ${opt.val ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                                                )}
                                            </span>
                                            <input
                                                type="radio"
                                                className="sr-only"
                                                checked={form.isManualEvaluation === opt.val}
                                                onChange={() => {
                                                    setForm(f => ({ ...f, isManualEvaluation: opt.val, assignedAdmin: opt.val ? f.assignedAdmin : '' }));
                                                    if (opt.val) fetchAdmins();
                                                }}
                                            />
                                            <span className="text-xs font-bold">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>

                                {form.isManualEvaluation && (
                                    <div className="mt-3">
                                        <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Assign to Admin *</label>
                                        {loadingAdmins ? (
                                            <div className="flex items-center gap-2 text-xs text-amber-600 font-bold">
                                                <Loader2 size={13} className="animate-spin" /> Loading admins...
                                            </div>
                                        ) : (
                                            <select
                                                required
                                                value={form.assignedAdmin}
                                                onChange={e => setForm(f => ({ ...f, assignedAdmin: e.target.value }))}
                                                className="w-full bg-white border-2 border-amber-200 rounded-xl px-3 py-2 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/50 shadow-sm"
                                            >
                                                <option value="">— Select an Admin —</option>
                                                {admins.map(a => (
                                                    <option key={a._id} value={a._id}>{a.name} ({a.studentId})</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                {field('Title *', 'title')}
                                {field('Problem Statement / Prompt *', 'description', 'text', 4)}
                            </div>

                            {form.type === 'MCQ' && (
                                <div className="space-y-4 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                    <div className="flex justify-between items-center border-b border-indigo-100/50 pb-2">
                                        <label className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">Options Configuration</label>
                                        <button type="button" onClick={addOption} className="text-[10px] bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                            <Plus size={12} /> Add
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {form.options.map((opt, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={e => handleOptionChange(i, e.target.value)}
                                                    placeholder="Option text..."
                                                    className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                                                />
                                                <button type="button" onClick={() => removeOption(i)} className="text-red-400 p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-2">
                                        {field('Exact Match Answer', 'correctAnswer')}
                                    </div>
                                </div>
                            )}

                            {form.type !== 'MCQ' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {field('Input Format Rules', 'inputFormat', 'text', 3)}
                                        {field('Output Format Rules', 'outputFormat', 'text', 3)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {field('Sample Test Input', 'sampleInput', 'text', 3)}
                                        {field('Sample Test Output', 'sampleOutput', 'text', 3)}
                                    </div>
                                    {(form.type !== 'CODE' || form.isManualEvaluation) && form.type !== 'UI_UX' && (
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            {field(form.type === 'CODE' ? 'Reference Solution (Correct Answer)' : 'Expected Correct Answer', 'correctAnswer', 'text', 2)}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Difficulty</label>
                                    <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                                    >
                                        <option value="EASY">EASY</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HARD">HARD</option>
                                    </select>
                                </div>
                                {field('Score/Points', 'points', 'number')}
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
                                    <AlertTriangle size={16} />{error}
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex gap-3 shrink-0">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors font-bold text-sm bg-white">
                            Cancel
                        </button>
                        <button type="submit" form="question-form" disabled={saving} className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-95 text-sm">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {isEdit ? 'Update Question' : 'Save to Bank'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const BulkUploadModal = ({ onClose, onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const handleDownloadTemplate = () => {
        const headers = [
            'title', 'description', 'difficulty', 'type', 'category',
            'points', 'correctAnswer', 'isManualEvaluation',
            'Option 1', 'Option 2', 'Option 3', 'Option 4',
            'inputFormat', 'outputFormat', 'sampleInput', 'sampleOutput'
        ];
        const rows = [
            [
                'Example MCQ Question', 'What is 2+2?', 'EASY', 'MCQ', 'GENERAL',
                '5', '4', 'FALSE',
                '2', '3', '4', '5',
                '', '', '', ''
            ],
            [
                'Example Code Question', 'Write a function to add two numbers.', 'MEDIUM', 'CODE', 'GENERAL',
                '10', '', 'FALSE',
                '', '', '', '',
                'Two integers a and b', 'Sum of a and b', '2 3', '5'
            ]
        ];

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'question_bank_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            const res = await api.post(`${API}/bulk-upload-questions`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            toast.success(res.data.message);
            if (onUploadSuccess) onUploadSuccess();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to upload file.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <Upload size={18} />
                            </div>
                            <h2 className="font-bold text-slate-900 text-lg">Bulk Upload Questions</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-700">Download Template</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Use this format for your upload</p>
                            </div>
                            <button
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 rounded-lg text-slate-600 text-xs font-bold transition-all shadow-sm"
                            >
                                <Download size={14} /> CSV Template
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-emerald-50/30 hover:border-emerald-300 transition-all cursor-pointer group">
                                <input
                                    type="file"
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    onChange={e => setFile(e.target.files[0])}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform mb-3">
                                    <FileSpreadsheet size={24} className="text-emerald-500" />
                                </div>
                                <p className="text-sm font-bold text-slate-700">{file ? file.name : 'Click or Drag Excel/CSV File'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Maximum size 5MB</p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            {result && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                                    <p className="text-emerald-700 text-xs font-bold leading-none">{result.message}</p>
                                    {result.errorCount > 0 && (
                                        <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                                            {result.errorCount} rows had errors and were skipped.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !file}
                                    className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
                                >
                                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    Upload & Import
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const QuestionBankTab = () => {
    const showConfirm = useConfirm(state => state.showConfirm);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    // Pagination & Search States
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [pagination, setPagination] = useState({ totalPages: 1, totalRecords: 0 });

    const fetchQuestions = useCallback(async () => {
        setLoading(questions.length === 0);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('page', page);
            params.append('limit', limit);

            const res = await api.get(`${API}/question-bank?${params.toString()}`);
            setQuestions(res.data.data || []);
            setPagination(res.data.pagination || { totalPages: 1, totalRecords: 0 });
        } catch (e) {
            console.error("Failed to fetch question bank:", e);
        } finally {
            setLoading(false);
        }
    }, [search, page, limit, questions.length]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // Reset page on search change
    useEffect(() => {
        setPage(1);
    }, [search]);

    const handleDelete = (questionId) => {
        showConfirm({
            title: "Delete Question",
            message: "Delete this question permanently from the bank?",
            confirmLabel: "Delete Permanently",
            isDanger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`${API}/questions/${questionId}`);
                    toast.success("Question deleted from bank.");
                    fetchQuestions();
                } catch (e) {
                    toast.error(e.response?.data?.error || "Deletion failed.");
                    console.error(e);
                }
            }
        });
    };

    const handleSave = () => {
        fetchQuestions();
        setModal(null);
    };

    return (
        <div className="space-y-4 h-full flex flex-col">

            {/* Toolbar Area */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <BookOpen size={18} />
                    </div>
                    <div className="hidden lg:block">
                        <h2 className="font-bold text-slate-800 text-sm">Global Question Library</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">All reusable test problems</p>
                    </div>
                </div>

                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search title or category..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-2 px-2 mt-2 sm:mt-0">
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Library</p>
                        <p className="text-sm font-bold text-slate-700 leading-none mt-1">{pagination.totalRecords} Items</p>
                    </div>
                    <button
                        onClick={() => setModal('bulk')}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-sm transition-all active:scale-95"
                    >
                        <Upload size={16} /> <span className="hidden sm:inline">Bulk Upload</span>
                    </button>
                    <button
                        onClick={() => setModal('add')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold text-sm transition-all shadow-md shadow-indigo-200 active:scale-95"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Add to Library</span>
                    </button>
                </div>
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {loading && questions.length === 0 ? (
                    <div className="py-4">
                        <SkeletonList count={10} />
                    </div>
                ) : questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 h-full border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <BookOpen size={48} className="text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">Library Empty</p>
                        <p className="text-xs text-slate-400 mt-1">There are no reusable questions stored.</p>
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
                                    <div className="flex items-center gap-4 p-3 pr-4 shadow-sm">
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
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-emerald-50 border-emerald-200 text-emerald-700 ml-2">
                                                    {q.category}
                                                </span>
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
                                                onClick={() => handleDelete(q._id)}
                                                className="p-2 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title="Delete Record"
                                            >
                                                <Trash2 size={16} />
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
                {modal && modal !== 'bulk' && (
                    <QuestionModal
                        question={modal === 'add' ? null : modal}
                        onClose={() => setModal(null)}
                        onSave={handleSave}
                    />
                )}
                {modal === 'bulk' && (
                    <BulkUploadModal
                        onClose={() => setModal(null)}
                        onUploadSuccess={handleSave}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuestionBankTab;

