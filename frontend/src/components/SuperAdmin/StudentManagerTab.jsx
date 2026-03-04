import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, Loader2, AlertTriangle, X, Check,
    Users, UserX, UserCheck, KeyRound, LogIn, Trash2, Search
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';

// ─── Refined Add Student Modal ─────────────────────────────────────────────────────────
const AddStudentModal = ({ onClose, onCreated }) => {
    const [studentId, setStudentId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedId = studentId.trim();
        if (!trimmedId) return;

        setSaving(true); 
        setError('');
        
        try {
            const res = await api.post(`${API}/students`, { studentId: trimmedId });
            onCreated(res.data.data);
        } catch (e) { 
            setError(e.response?.data?.error || "Failed to create student. Check if ID exists."); 
        } finally { 
            setSaving(false); 
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 10 }} 
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-indigo-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Users size={18} />
                            </div>
                            <h2 className="font-bold text-slate-900 text-lg">New Student</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                Student Identifier (Roll/ID)
                            </label>
                            <input
                                type="text"
                                value={studentId}
                                onChange={e => setStudentId(e.target.value)}
                                placeholder="e.g. 2024CS001"
                                required
                                autoFocus
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                            />
                            <p className="mt-2 text-[10px] text-slate-400 font-bold tracking-wide">
                                <span className="text-indigo-500">Note:</span> Default password will be "123456"
                            </p>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-xl p-3">
                                <AlertTriangle size={16} className="shrink-0" />
                                <p>{error}</p>
                            </motion.div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-bold text-sm">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving || !studentId.trim()} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-95 text-sm">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Create Student
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── Refined Reset Password Modal ─────────────────────────────────────────────
const ResetStudentPasswordModal = ({ student, onClose }) => {
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setSaving(true); 
        setError('');
        
        try {
            await api.patch(`${API}/students/${student._id}/reset-password`, { newPassword: password });
            setDone(true);
        } catch (e) { 
            setError(e.response?.data?.error || "Reset failed. Please try again."); 
        } finally { 
            setSaving(false); 
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 10 }} 
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-amber-50/50">
                        <div>
                            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                <KeyRound size={18} className="text-amber-500" /> Reset Password
                            </h2>
                            <p className="text-[10px] text-slate-500 font-mono font-bold mt-1 uppercase tracking-widest">
                                Target: {student.studentId}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {done ? (
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Check size={32} />
                            </div>
                            <div>
                                <p className="text-slate-900 font-black text-xl">Password Reset</p>
                                <p className="text-slate-500 text-sm mt-1 leading-relaxed">The credentials for <strong>{student.studentId}</strong> have been updated. Existing sessions were terminated.</p>
                            </div>
                            <button onClick={onClose} className="w-full mt-4 px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold transition-colors">
                                Acknowledge
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    New Security Key
                                </label>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    minLength={6} 
                                    required
                                    autoFocus
                                    placeholder="Minimum 6 characters"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-shadow"
                                />
                            </div>
                            {error && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-lg p-3">
                                    <AlertTriangle size={14} className="shrink-0" /> <p>{error}</p>
                                </motion.div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-bold text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving || password.length < 6} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-200 text-sm">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                                    Confirm Reset
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── Main Student Manager Tab ───────────────────────────────────────────────────────
const StudentManagerTab = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    // UI State
    const [showAddModal, setShowAddModal] = useState(false);
    const [resetTarget, setResetTarget] = useState(null);
    const [busy, setBusy] = useState({});
    const [globalError, setGlobalError] = useState('');

    // 1. Fetch Logic (Isolated from Search State to prevent constant re-renders)
    const fetchStudents = useCallback(async (searchQuery = '') => {
        try {
            const url = searchQuery 
                ? `${API}/students?search=${encodeURIComponent(searchQuery)}` 
                : `${API}/students`;
            const res = await api.get(url);
            setStudents(res.data.data || []);
        } catch (e) {
            console.error("Failed to fetch students:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    // 2. Initial Mount & Background Polling
    useEffect(() => {
        fetchStudents(debouncedSearch);
        const t = setInterval(() => fetchStudents(debouncedSearch), 20000); // Increased to 20s for less network noise
        return () => clearInterval(t);
    }, [fetchStudents, debouncedSearch]);

    // 3. Debounce Input Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);


    // Action Handler
    const act = async (studentId, path, method = 'PATCH', body = undefined) => {
        setBusy(b => ({ ...b, [`${studentId}-${path}`]: true }));
        setGlobalError('');
        try {
            const res = await api({ method, url: `${API}/students/${studentId}/${path}`, data: body });
            return res.data;
        } catch (e) {
            setGlobalError(e.response?.data?.error || `Action '${path}' failed.`);
            return null;
        } finally {
            setBusy(b => ({ ...b, [`${studentId}-${path}`]: false }));
        }
    };

    const handleForceLogout = async (student) => {
        if (!window.confirm(`Force logout ${student.studentId}? They will be immediately disconnected.`)) return;
        const res = await act(student._id, 'force-logout');
        if (res) fetchStudents(debouncedSearch);
    };

    const handleBlockToggle = async (student) => {
        const verb = student.isBanned ? 'Unblock' : 'Block';
        if (!window.confirm(`${verb} student ${student.studentId}?`)) return;
        const res = await act(student._id, 'block');
        if (res) {
            setStudents(prev => prev.map(s => s._id === student._id ? { ...s, isBanned: res.isBanned } : s));
        }
    };

    const handleDelete = async (student) => {
        if (!window.confirm(`CRITICAL WARNING:\n\nPermanently delete ${student.studentId}?\nThis destroys all records and cannot be undone.`)) return;
        setBusy(b => ({ ...b, [`${student._id}-delete`]: true }));
        try {
            await api.delete(`${API}/students/${student._id}`);
            setStudents(prev => prev.filter(s => s._id !== student._id));
        } catch (e) { 
            setGlobalError(e.response?.data?.error || "Deletion failed."); 
        } finally { 
            setBusy(b => ({ ...b, [`${student._id}-delete`]: false })); 
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center bg-slate-50 p-2 rounded-2xl border border-slate-200/60">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search student ID or name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>
                
                <div className="flex items-center gap-4 px-2">
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Directory</p>
                        <p className="text-sm font-bold text-slate-700 leading-none mt-1">{students.length} Records</p>
                    </div>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold text-sm transition-all shadow-md shadow-indigo-200 active:scale-95"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Add Student</span>
                    </button>
                </div>
            </div>

            {/* Global Error Banner */}
            <AnimatePresence>
                {globalError && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                        className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm shadow-sm"
                    >
                        <div className="flex items-center gap-2 font-bold"><AlertTriangle size={16} /> {globalError}</div>
                        <button onClick={() => setGlobalError('')} className="p-1 hover:bg-red-100 rounded-md transition-colors"><X size={14} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Data Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {loading && students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 h-full">
                        <Loader2 size={36} className="text-indigo-500 animate-spin mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Directory...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 h-full border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <Users size={48} className="text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">No students found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {students.map((student) => (
                            <motion.div 
                                layout
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }}
                                key={student._id}
                                className={`group flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-xl border transition-all hover:shadow-md
                                    ${student.isBanned 
                                        ? 'bg-red-50/30 border-red-100 hover:border-red-300' 
                                        : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                            >
                                {/* Core Info */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-lg border shrink-0 ${
                                        student.isBanned ? 'bg-red-100 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors'
                                    }`}>
                                        <Users size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900 font-mono text-sm tracking-tight">{student.studentId}</p>
                                            {student.isBanned && (
                                                <span className="px-1.5 py-0.5 rounded uppercase text-[9px] font-black bg-red-100 text-red-600 tracking-wider">Blocked</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate font-medium">{student.name || 'No Name Registered'}</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 md:opacity-80 group-hover:opacity-100 transition-opacity justify-end">
                                    <button 
                                        onClick={() => handleForceLogout(student)}
                                        disabled={busy[`${student._id}-force-logout`]}
                                        title="Force Logout Session"
                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all disabled:opacity-50"
                                    >
                                        {busy[`${student._id}-force-logout`] ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                                    </button>

                                    <button 
                                        onClick={() => setResetTarget(student)}
                                        title="Reset Password"
                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all"
                                    >
                                        <KeyRound size={14} />
                                    </button>

                                    <button 
                                        onClick={() => handleBlockToggle(student)}
                                        disabled={busy[`${student._id}-block`]}
                                        title={student.isBanned ? "Unblock Student" : "Block Student"}
                                        className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-50 ${
                                            student.isBanned
                                                ? 'bg-red-100 border-red-200 text-red-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                                                : 'border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                        }`}
                                    >
                                        {busy[`${student._id}-block`] 
                                            ? <Loader2 size={14} className="animate-spin" /> 
                                            : student.isBanned ? <UserCheck size={14} /> : <UserX size={14} />}
                                    </button>

                                    <div className="w-px h-6 bg-slate-200 mx-1" />

                                    <button 
                                        onClick={() => handleDelete(student)}
                                        disabled={busy[`${student._id}-delete`]}
                                        title="Delete Student Record"
                                        className="h-8 px-2 flex items-center gap-1.5 rounded-lg border border-transparent text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                                    >
                                        {busy[`${student._id}-delete`] ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Mounted Modals */}
            {showAddModal && (
                <AddStudentModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={s => { 
                        setStudents(prev => [s, ...prev]); 
                        setShowAddModal(false); 
                    }}
                />
            )}

            {resetTarget && (
                <ResetStudentPasswordModal
                    student={resetTarget}
                    onClose={() => setResetTarget(null)}
                />
            )}
        </div>
    );
};

export default StudentManagerTab;