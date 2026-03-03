import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pencil, Trash2, X, Check, Filter, Loader2,
    ChevronDown, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API, DIFFICULTY_COLORS } from './constants';

// ─── Question Form Modal ────────────────────────────────────────────────────────
const QuestionModal = ({ question, roundId, onClose, onSave }) => {
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
        order: question?.order || 0,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const url = isEdit ? `${API}/questions/${question._id}` : `${API}/questions/${roundId}`;
            const method = isEdit ? 'put' : 'post';
            const res = await api({ method, url, data: form });
            onSave(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const field = (label, key, type = 'text', rows = null) => (
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
            {rows ? (
                <textarea
                    rows={rows}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none font-mono"
                />
            ) : (
                <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                />
            )}
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Question' : 'Add Question'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {field('Title *', 'title')}
                    {field('Description *', 'description', 'text', 4)}
                    <div className="grid grid-cols-2 gap-4">
                        {field('Input Format', 'inputFormat', 'text', 2)}
                        {field('Output Format', 'outputFormat', 'text', 2)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {field('Sample Input', 'sampleInput', 'text', 2)}
                        {field('Sample Output', 'sampleOutput', 'text', 2)}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Difficulty</label>
                            <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                            >
                                {['EASY', 'MEDIUM', 'HARD'].map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        {field('Points', 'points', 'number')}
                        {field('Order', 'order', 'number')}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            <AlertTriangle size={16} />{error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-bold"
                        >Cancel</button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {isEdit ? 'Save Changes' : 'Create Question'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

// ─── Question Manager Tab ──────────────────────────────────────────────────────
const QuestionManagerTab = ({ rounds }) => {
    const [selectedRound, setSelectedRound] = useState('');
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    const fetchQuestions = useCallback(async (roundId) => {
        if (!roundId) return;
        setLoading(true);
        try {
            const res = await api.get(`${API}/questions/${roundId}`);
            setQuestions(res.data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedRound) fetchQuestions(selectedRound);
        else setQuestions([]);
    }, [selectedRound, fetchQuestions]);

    const handleDelete = async (questionId) => {
        if (!window.confirm('Delete this question permanently?')) return;
        try {
            await api.delete(`${API}/questions/${questionId}`);
            setQuestions(q => q.filter(x => x._id !== questionId));
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = (savedQuestion) => {
        setQuestions(prev => {
            const exists = prev.find(q => q._id === savedQuestion._id);
            return exists
                ? prev.map(q => q._id === savedQuestion._id ? savedQuestion : q)
                : [...prev, savedQuestion];
        });
        setModal(null);
    };

    return (
        <div className="space-y-5">
            {/* Round picker */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select value={selectedRound} onChange={e => setSelectedRound(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl pl-8 pr-8 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none"
                    >
                        <option value="">— Select a Round —</option>
                        {rounds.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {selectedRound && (
                    <button onClick={() => setModal('add')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-white font-bold text-sm transition-colors shadow-sm"
                    >
                        <Plus size={16} /> Add Question
                    </button>
                )}
            </div>

            {!selectedRound && (
                <div className="text-center py-20 text-gray-400 font-mono">SELECT A ROUND TO VIEW QUESTIONS</div>
            )}

            {selectedRound && loading && (
                <div className="flex justify-center py-20"><Loader2 size={36} className="text-violet-500 animate-spin" /></div>
            )}

            {selectedRound && !loading && questions.length === 0 && (
                <div className="text-center py-20 text-gray-400 font-mono">NO QUESTIONS YET — ADD ONE ABOVE</div>
            )}

            {/* Question cards */}
            <div className="space-y-3">
                {questions.map((q, idx) => (
                    <motion.div key={q._id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                    >
                        <div className="flex items-center gap-4 p-4">
                            <span className="text-2xl font-black text-gray-300 w-8 text-center shrink-0">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{q.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{q.points} pts</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${DIFFICULTY_COLORS[q.difficulty]}`}>
                                {q.difficulty}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                    title="Preview"
                                >
                                    {expandedId === q._id ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button onClick={() => setModal(q)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Edit"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button onClick={() => handleDelete(q._id)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {expandedId === q._id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-gray-100 overflow-hidden"
                                >
                                    <div className="p-4 space-y-3 text-sm text-gray-600">
                                        <p className="leading-relaxed whitespace-pre-wrap">{q.description}</p>
                                        {(q.inputFormat || q.outputFormat) && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {q.inputFormat && <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Input Format</p><p>{q.inputFormat}</p></div>}
                                                {q.outputFormat && <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Output Format</p><p>{q.outputFormat}</p></div>}
                                            </div>
                                        )}
                                        {(q.sampleInput || q.sampleOutput) && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {q.sampleInput && <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Sample Input</p><pre className="bg-gray-50 rounded-lg p-2 font-mono text-xs text-emerald-700">{q.sampleInput}</pre></div>}
                                                {q.sampleOutput && <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Sample Output</p><pre className="bg-gray-50 rounded-lg p-2 font-mono text-xs text-indigo-600">{q.sampleOutput}</pre></div>}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {modal && (
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
