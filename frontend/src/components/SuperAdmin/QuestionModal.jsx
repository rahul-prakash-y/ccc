import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, Pencil, Trash2, X, Check, Loader2,
    BookOpen, ClipboardCheck, AlertTriangle, Upload, 
    Sparkles
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import toast from 'react-hot-toast';

const QuestionModal = ({ question, roundId, onClose, onSave, isBank = false }) => {
    const isEdit = !!question;
    const [form, setForm] = useState({
        title: question?.title || '',
        description: question?.description || '',
        inputFormat: question?.inputFormat || '',
        outputFormat: question?.outputFormat || '',
        sampleInput: question?.sampleInput || '',
        sampleOutput: question?.sampleOutput || '',
        starterCode: question?.starterCode || '',
        difficulty: question?.difficulty || 'MEDIUM',
        points: question?.points || 10,
        order: question?.order || 0,
        type: question?.type || 'CODE',
        category: question?.category || 'GENERAL',
        options: question?.options || [],
        correctAnswer: question?.correctAnswer || '',
        isManualEvaluation: question?.isManualEvaluation || false,
        assignedAdmin: question?.assignedAdmin?._id || question?.assignedAdmin || '',
        rubrics: question?.rubrics || [],
        rubricInstructions: question?.rubricInstructions || '',
        isPractice: question?.isPractice || false,
        problemImage: question?.problemImage || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [admins, setAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [rubricSuggestions, setRubricSuggestions] = useState([]);

    // Fetch rubric suggestions when category changes
    useEffect(() => {
        if (form.category) {
            const fetchSuggestions = async () => {
                try {
                    const res = await api.get(`${API}/questions/rubric-suggestions?category=${form.category}`);
                    setRubricSuggestions(res.data.data || []);
                } catch (e) {
                    console.error('Failed to load rubric suggestions:', e);
                }
            };
            fetchSuggestions();
        }
    }, [form.category]);

    // Fetch admin list when needed
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

    const didInitFetch = useRef(false);
    useEffect(() => {
        if (!didInitFetch.current && form.isManualEvaluation) {
            didInitFetch.current = true;
            fetchAdmins();
        }
    });

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 500 * 1024) {
            toast.error('Image size must be less than 500 KB');
            return;
        }

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post(`${API}/upload-image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setForm(f => ({ ...f, problemImage: res.data.url }));
            toast.success('Problem image uploaded');
        } catch (err) {
            toast.error('Failed to upload image');
            console.error(err);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            let url;
            if (isEdit) {
                url = `${API}/questions/${question._id}`;
            } else {
                url = isBank ? `${API}/question-bank` : `${API}/questions/${roundId}`;
            }
            const method = isEdit ? 'put' : 'post';
            const res = await api({ method, url, data: form });
            onSave(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to save question.");
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

    const handleRubricChange = (index, field, value) => {
        const newRubrics = [...form.rubrics];
        newRubrics[index] = { ...newRubrics[index], [field]: field === 'maxScore' ? Number(value) : value };
        setForm({ ...form, rubrics: newRubrics });
    };

    const addRubric = () => setForm({ ...form, rubrics: [...form.rubrics, { criterion: '', maxScore: 5 }] });
    const removeRubric = (index) => setForm({ ...form, rubrics: form.rubrics.filter((_, i) => i !== index) });

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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-sm"
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
                            <h2 className="font-bold text-slate-900 text-lg">{isEdit ? 'Edit Question Record' : 'Create New Question'}</h2>
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
                                        <option value="UI_UX">UI/UX Submission</option>
                                        <option value="MINI_HACKATHON">Mini Hackathon</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
                                    >
                                        <option value="GENERAL">General</option>
                                        <option value="SQL">SQL</option>
                                        <option value="HTML">HTML/CSS</option>
                                        <option value="UI_UX">UI/UX</option>
                                        <option value="MINI_HACKATHON">Mini Hackathon</option>
                                    </select>
                                </div>
                            </div>

                            {/* Practice Mode Toggle */}
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                        <Sparkles size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Practice Mode Only</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">This question will be hidden during real event tests</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, isPractice: !f.isPractice }))}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.isPractice ? 'bg-amber-500' : 'bg-slate-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${form.isPractice ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
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

                                {form.category === 'UI_UX' && (
                                    <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl space-y-4">
                                        <label className="block text-[11px] font-black text-indigo-700 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                            <Sparkles size={14} /> UI/UX Reference Image
                                        </label>
                                        
                                        {/* Image Preview */}
                                        {form.problemImage && (
                                            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-white group">
                                                <img src={form.problemImage} alt="Problem Reference" className="w-full h-full object-contain" />
                                                <button 
                                                    onClick={() => setForm(f => ({ ...f, problemImage: '' }))}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3">
                                            <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer bg-white
                                                ${uploadingImage ? 'opacity-50 pointer-events-none' : 'hover:bg-indigo-50 hover:border-indigo-300 border-slate-200'}`}>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                {uploadingImage ? <Loader2 size={18} className="animate-spin text-indigo-600" /> : <Upload size={18} className="text-indigo-400 mb-1" />}
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{uploadingImage ? 'Uploading...' : 'Upload Reference Image'}</span>
                                            </label>
                                            
                                            {form.problemImage && (
                                                <div className="shrink-0 text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                    <Check size={12} /> Image Linked
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-slate-400 italic">This image will be shown to students as the target UI they need to replicate.</p>
                                    </div>
                                )}
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
                                    {form.type !== 'UI_UX' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                {field('Input Format Rules', 'inputFormat', 'text', 3)}
                                                {field('Output Format Rules', 'outputFormat', 'text', 3)}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                {field('Sample Test Input', 'sampleInput', 'text', 3)}
                                                {field('Sample Test Output', 'sampleOutput', 'text', 3)}
                                            </div>
                                        </>
                                    )}
                                    {(form.type === 'DEBUG' || form.type === 'FILL_BLANKS') && (
                                        <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 mt-4">
                                            {field('Starter Code / Buggy Code', 'starterCode', 'text', 6)}
                                            <p className="text-[10px] text-slate-500 mt-2 font-medium leading-relaxed">This code will be pre-filled in the student's editor when the assessment starts.</p>
                                        </div>
                                    )}
                                    {(form.type !== 'CODE' || form.isManualEvaluation) && form.type !== 'UI_UX' && (
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            {field(form.type === 'CODE' ? 'Reference Solution (Correct Answer)' : 'Expected Correct Answer', 'correctAnswer', 'text', 2)}
                                        </div>
                                    )}

                                    {/* Evaluation Rubrics & Instructions */}
                                    {form.isManualEvaluation && (
                                        <div className="space-y-4 p-5 bg-amber-50/30 rounded-2xl border border-amber-200/50">
                                            <div className="flex justify-between items-center border-b border-amber-200/30 pb-2">
                                                <label className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Evaluation Rubrics</label>
                                                <button type="button" onClick={addRubric} className="text-[10px] bg-amber-600 hover:bg-amber-700 transition-colors text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                    <Plus size={12} /> Add Criteria
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {form.rubrics.map((r, i) => (
                                                    <div key={i} className="flex gap-2 items-center">
                                                        <input
                                                            type="text"
                                                            value={r.criterion}
                                                            onChange={e => handleRubricChange(i, 'criterion', e.target.value)}
                                                            placeholder="Criterion (e.g. Visual Appeal)"
                                                            className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm"
                                                        />
                                                        <div className="w-24">
                                                            <input
                                                                type="number"
                                                                value={r.maxScore}
                                                                onChange={e => handleRubricChange(i, 'maxScore', e.target.value)}
                                                                placeholder="Max Pts"
                                                                className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm text-center font-bold"
                                                            />
                                                        </div>
                                                        <button type="button" onClick={() => removeRubric(i)} className="text-red-400 p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                                {form.rubrics.length === 0 && (
                                                    <p className="text-center py-2 text-xs text-amber-600/60 italic font-medium">No rubrics defined. Click "Add Criteria" or select from suggestions.</p>
                                                )}

                                                {/* Suggestions section */}
                                                {rubricSuggestions.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-amber-200/30">
                                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Suggestions for {form.category}</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {rubricSuggestions.map((s, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (!form.rubrics.some(r => r.criterion === s.criterion)) {
                                                                            setForm(f => ({ ...f, rubrics: [...f.rubrics, { criterion: s.criterion, maxScore: s.maxScore }] }));
                                                                        }
                                                                    }}
                                                                    className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition-all flex items-center gap-1.5 active:scale-95"
                                                                >
                                                                    <Plus size={10} /> {s.criterion} ({s.maxScore} pts)
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pt-2">
                                                {field('Grading Instructions (Internal)', 'rubricInstructions', 'text', 3)}
                                                <p className="text-[10px] text-amber-600/70 mt-1.5 font-medium italic">These instructions and rubrics are only visible to evaluators.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
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
                                {!isBank && field('Sort Order', 'order', 'number')}
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
                            {isEdit ? 'Update Question' : (isBank ? 'Save to Bank' : 'Create Question')}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default QuestionModal;
