import React, { useState, useEffect, useCallback } from 'react';
import { motion as motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
    ShieldCheck, BookOpen, ClipboardList, LogOut, Filter,
    Plus, Pencil, Trash2, X, Check, ChevronDown, AlertTriangle,
    Search, Loader2, Eye, EyeOff, Activity, RefreshCw,
    UserCog, UserX, UserCheck, KeyRound, LogIn, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api/superadmin';
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

const DIFFICULTY_COLORS = {
    EASY: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    MEDIUM: 'text-amber-700   bg-amber-50   border-amber-200',
    HARD: 'text-red-700     bg-red-50     border-red-200',
};

// ─── Activity Log colour coding ──────────────────────────────────────────────
const ACTION_STYLES = {
    LOGIN: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    LOGOUT: { color: 'text-gray-500', bg: 'bg-gray-100 border-gray-300' },
    CREATED: { color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
    UPDATED: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    DELETED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    BULK_UPLOAD: { color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
    OTP_GENERATED: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
    ROUND_STARTED: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    ROUND_SUBMITTED: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    DISQUALIFIED: { color: 'text-red-500', bg: 'bg-red-950/50 border-red-700' },
};

const ALL_ACTIONS = Object.keys(ACTION_STYLES);

// ─── Activity Logs Tab ────────────────────────────────────────────────────────
const ActivityLogsTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const url = actionFilter
                ? `${API}/activity-logs?action=${actionFilter}`
                : `${API}/activity-logs`;
            const res = await fetch(url, { headers: authHeader() });
            const data = await res.json();
            setLogs(data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [actionFilter]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const filtered = logs.filter(l => {
        const q = search.toLowerCase();
        return (
            l.performedBy?.studentId?.toLowerCase().includes(q) ||
            l.performedBy?.name?.toLowerCase().includes(q) ||
            l.target?.label?.toLowerCase().includes(q) ||
            l.target?.type?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by user, target..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                    />
                </div>
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                        value={actionFilter}
                        onChange={e => setActionFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl pl-8 pr-8 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none"
                    >
                        <option value="">All Actions</option>
                        {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors">
                    <RefreshCw size={14} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 size={36} className="text-violet-500 animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-mono">NO ACTIVITY RECORDS FOUND</div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                {['Action', 'Performed By', 'Role', 'Target', 'Time', 'IP'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(log => {
                                const style = ACTION_STYLES[log.action] || { color: 'text-gray-600', bg: 'bg-gray-100 border-gray-300' };
                                return (
                                    <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.color}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-indigo-600 whitespace-nowrap">
                                            {log.performedBy?.studentId || '—'}
                                            {log.performedBy?.name && <span className="text-gray-400 ml-1 font-sans text-xs">({log.performedBy.name})</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs uppercase tracking-widest">{log.performedBy?.role || '—'}</td>
                                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                            {log.target?.type && <span className="text-gray-400 text-xs mr-1">[{log.target.type}]</span>}
                                            {log.target?.label || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="text-xs text-gray-400 font-mono text-right">{filtered.length} event(s)</p>
        </div>
    );
};

const STATUS_COLORS = {
    SUBMITTED: 'text-indigo-600',
    IN_PROGRESS: 'text-amber-600',
    DISQUALIFIED: 'text-red-600',
    NOT_STARTED: 'text-gray-400',
};
// ─── Student Manager Tab ──────────────────────────────────────────────────────
const AddStudentModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({ studentId: '', name: '', password: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const res = await fetch(`${API}/students`, { method: 'POST', headers: authHeader(), body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onCreated(data.data);
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-xl"
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 text-lg">Add Student</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {[['Student ID', 'studentId', 'text'], ['Full Name', 'name', 'text'], ['Password', 'password', 'password']].map(([label, key, type]) => (
                        <div key={key}>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
                            <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                            />
                        </div>
                    ))}
                    {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2"><AlertTriangle size={14} />{error}</div>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-bold">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Add Student
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

const ResetStudentPasswordModal = ({ student, onClose }) => {
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const res = await fetch(`${API}/students/${student._id}/reset-password`, {
                method: 'PATCH', headers: authHeader(), body: JSON.stringify({ newPassword: password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setDone(true);
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-xl"
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="font-bold text-gray-900 text-lg">Reset Password</h2>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{student.studentId}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                {done ? (
                    <div className="p-6 text-center space-y-3">
                        <div className="text-emerald-500 text-4xl">✓</div>
                        <p className="text-gray-900 font-bold">Password reset!</p>
                        <p className="text-gray-500 text-sm">The student has been logged out of all sessions.</p>
                        <button onClick={onClose} className="mt-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-bold transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                            />
                        </div>
                        {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2"><AlertTriangle size={14} />{error}</div>}
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-bold">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Reset
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </motion.div>
    );
};

const StudentManagerTab = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [resetTarget, setResetTarget] = useState(null);
    const [busy, setBusy] = useState({});
    const [error, setError] = useState('');

    const fetchStudents = useCallback(async (q = '') => {
        setLoading(true);
        try {
            const url = q ? `${API}/students?search=${encodeURIComponent(q)}` : `${API}/students`;
            const res = await fetch(url, { headers: authHeader() });
            const data = await res.json();
            setStudents(data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    // debounced search
    useEffect(() => {
        const t = setTimeout(() => fetchStudents(search), 400);
        return () => clearTimeout(t);
    }, [search, fetchStudents]);

    const act = async (studentId, path, method = 'PATCH', body = undefined) => {
        setBusy(b => ({ ...b, [`${studentId}-${path}`]: true }));
        setError('');
        try {
            const res = await fetch(`${API}/students/${studentId}/${path}`, {
                method,
                headers: authHeader(),
                body: body ? JSON.stringify(body) : undefined
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Action failed');
            return data;
        } catch (e) {
            setError(e.message);
            return null;
        } finally {
            setBusy(b => ({ ...b, [`${studentId}-${path}`]: false }));
        }
    };

    const handleForceLogout = async (student) => {
        if (!window.confirm(`Force logout ${student.studentId}?`)) return;
        const res = await act(student._id, 'force-logout');
        if (res) fetchStudents(search);
    };

    const handleBlock = async (student) => {
        const verb = student.isBanned ? 'Unblock' : 'Block';
        if (!window.confirm(`${verb} ${student.studentId}?`)) return;
        const res = await act(student._id, 'block');
        if (res) setStudents(prev => prev.map(s => s._id === student._id ? { ...s, isBanned: res.isBanned } : s));
    };

    const handleDelete = async (student) => {
        if (!window.confirm(`Permanently remove student ${student.studentId}? This cannot be undone.`)) return;
        setBusy(b => ({ ...b, [`${student._id}-delete`]: true }));
        try {
            const res = await fetch(`${API}/students/${student._id}`, { method: 'DELETE', headers: authHeader() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStudents(prev => prev.filter(s => s._id !== student._id));
        } catch (e) { setError(e.message); }
        finally { setBusy(b => ({ ...b, [`${student._id}-delete`]: false })); }
    };

    return (
        <div className="space-y-5">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by ID or name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-gray-400 text-sm">{students.length} student(s)</p>
                    <button onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 rounded-xl text-white font-bold text-sm transition-colors shadow-sm"
                    >
                        <Plus size={16} /> Add Student
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    <AlertTriangle size={16} /> {error}
                    <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 size={36} className="text-teal-500 animate-spin" /></div>
            ) : students.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-mono">NO STUDENTS FOUND</div>
            ) : (
                <div className="space-y-3">
                    {students.map((student, idx) => (
                        <motion.div key={student._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                            className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border ${student.isBanned ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                                }`}
                        >
                            {/* Info */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`p-2.5 rounded-xl border ${student.isBanned ? 'bg-red-50 border-red-200 text-red-500' : 'bg-teal-50 border-teal-200 text-teal-600'
                                    }`}>
                                    <Users size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-900 font-mono">{student.studentId}</p>
                                    <p className="text-sm text-gray-500">{student.name}</p>
                                </div>
                                {student.isBanned ? (
                                    <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-red-50 border-red-200 text-red-600">BLOCKED</span>
                                ) : (
                                    <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 border-emerald-200 text-emerald-700">ACTIVE</span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => handleForceLogout(student)}
                                    disabled={busy[`${student._id}-force-logout`]}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                                    title="Force Logout"
                                >
                                    {busy[`${student._id}-force-logout`] ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
                                    Force Logout
                                </button>

                                <button onClick={() => handleBlock(student)}
                                    disabled={busy[`${student._id}-block`]}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors disabled:opacity-50 ${student.isBanned
                                        ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                        : 'border-red-200 text-red-600 hover:bg-red-50'
                                        }`}
                                >
                                    {busy[`${student._id}-block`] ? <Loader2 size={13} className="animate-spin" /> : student.isBanned ? <UserCheck size={13} /> : <UserX size={13} />}
                                    {student.isBanned ? 'Unblock' : 'Block'}
                                </button>

                                <button onClick={() => setResetTarget(student)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                                >
                                    <KeyRound size={13} /> Reset PW
                                </button>

                                <button onClick={() => handleDelete(student)}
                                    disabled={busy[`${student._id}-delete`]}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    {busy[`${student._id}-delete`] ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                    Remove
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showAddModal && (
                    <AddStudentModal
                        onClose={() => setShowAddModal(false)}
                        onCreated={(s) => { setStudents(prev => [s, ...prev]); setShowAddModal(false); }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {resetTarget && (
                    <ResetStudentPasswordModal
                        student={resetTarget}
                        onClose={() => setResetTarget(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Admin Manager Tab ────────────────────────────────────────────────────────
const AdminManagerTab = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [resetTarget, setResetTarget] = useState(null); // { _id, studentId }
    const [busy, setBusy] = useState({}); // per-admin loading states
    const [error, setError] = useState('');

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/admins`, { headers: authHeader() });
            const data = await res.json();
            setAdmins(data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

    const act = async (adminId, path, method = 'PATCH', body = undefined) => {
        setBusy(b => ({ ...b, [`${adminId}-${path}`]: true }));
        setError('');
        try {
            const res = await fetch(`${API}/admins/${adminId}/${path}`, {
                method,
                headers: authHeader(),
                body: body ? JSON.stringify(body) : undefined
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Action failed');
            return data;
        } catch (e) {
            setError(e.message);
            return null;
        } finally {
            setBusy(b => ({ ...b, [`${adminId}-${path}`]: false }));
        }
    };

    const handleForceLogout = async (admin) => {
        if (!window.confirm(`Force logout ${admin.studentId}?`)) return;
        const res = await act(admin._id, 'force-logout');
        if (res) fetchAdmins();
    };

    const handleBlock = async (admin) => {
        const verb = admin.isBanned ? 'Unblock' : 'Block';
        if (!window.confirm(`${verb} ${admin.studentId}?`)) return;
        const res = await act(admin._id, 'block');
        if (res) setAdmins(prev => prev.map(a => a._id === admin._id ? { ...a, isBanned: res.isBanned } : a));
    };

    const handleDelete = async (admin) => {
        if (!window.confirm(`Permanently remove admin ${admin.studentId}? This cannot be undone.`)) return;
        setBusy(b => ({ ...b, [`${admin._id}-delete`]: true }));
        try {
            const res = await fetch(`${API}/admins/${admin._id}`, { method: 'DELETE', headers: authHeader() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAdmins(prev => prev.filter(a => a._id !== admin._id));
        } catch (e) { setError(e.message); }
        finally { setBusy(b => ({ ...b, [`${admin._id}-delete`]: false })); }
    };

    return (
        <div className="space-y-5">
            {/* Header row */}
            <div className="flex justify-between items-center">
                <p className="text-gray-500 text-sm">{admins.length} admin(s) total</p>
                <button onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-white font-bold text-sm transition-colors shadow-sm"
                >
                    <Plus size={16} /> Add Admin
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    <AlertTriangle size={16} /> {error}
                    <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 size={36} className="text-purple-500 animate-spin" /></div>
            ) : admins.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-mono">NO ADMINS FOUND</div>
            ) : (
                <div className="space-y-3">
                    {admins.map((admin, idx) => (
                        <motion.div key={admin._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                            className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border ${admin.isBanned ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                                }`}
                        >
                            {/* Info */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`p-2.5 rounded-xl border ${admin.isBanned ? 'bg-red-50 border-red-200 text-red-500' : 'bg-violet-50 border-violet-200 text-violet-600'
                                    }`}>
                                    <UserCog size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-900 font-mono">{admin.studentId}</p>
                                    <p className="text-sm text-gray-500">{admin.name}</p>
                                </div>
                                {admin.isBanned ? (
                                    <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-red-50 border-red-200 text-red-600">BLOCKED</span>
                                ) : (
                                    <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 border-emerald-200 text-emerald-700">ACTIVE</span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Force Logout */}
                                <button onClick={() => handleForceLogout(admin)}
                                    disabled={busy[`${admin._id}-force-logout`]}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                                    title="Force Logout"
                                >
                                    {busy[`${admin._id}-force-logout`] ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
                                    Force Logout
                                </button>

                                {/* Block / Unblock */}
                                <button onClick={() => handleBlock(admin)}
                                    disabled={busy[`${admin._id}-block`]}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors disabled:opacity-50 ${admin.isBanned
                                        ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                        : 'border-red-200 text-red-600 hover:bg-red-50'
                                        }`}
                                >
                                    {busy[`${admin._id}-block`] ? <Loader2 size={13} className="animate-spin" /> : admin.isBanned ? <UserCheck size={13} /> : <UserX size={13} />}
                                    {admin.isBanned ? 'Unblock' : 'Block'}
                                </button>

                                {/* Reset Password */}
                                <button onClick={() => setResetTarget(admin)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                                >
                                    <KeyRound size={13} /> Reset PW
                                </button>

                                {/* Delete */}
                                <button onClick={() => handleDelete(admin)}
                                    disabled={busy[`${admin._id}-delete`]}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    {busy[`${admin._id}-delete`] ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                    Remove
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add Admin Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <AddAdminModal
                        onClose={() => setShowAddModal(false)}
                        onCreated={(admin) => { setAdmins(prev => [admin, ...prev]); setShowAddModal(false); }}
                    />
                )}
            </AnimatePresence>

            {/* Reset Password Modal */}
            <AnimatePresence>
                {resetTarget && (
                    <ResetPasswordModal
                        admin={resetTarget}
                        onClose={() => setResetTarget(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const AddAdminModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({ studentId: '', name: '', password: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const res = await fetch(`${API}/admins`, { method: 'POST', headers: authHeader(), body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onCreated(data.data);
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-xl"
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 text-lg">Add Admin</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {[['Admin ID', 'studentId', 'text'], ['Full Name', 'name', 'text'], ['Password', 'password', 'password']].map(([label, key, type]) => (
                        <div key={key}>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
                            <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                            />
                        </div>
                    ))}
                    {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2"><AlertTriangle size={14} />{error}</div>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-bold">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Create Admin
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

const ResetPasswordModal = ({ admin, onClose }) => {
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const res = await fetch(`${API}/admins/${admin._id}/reset-password`, {
                method: 'PATCH', headers: authHeader(), body: JSON.stringify({ newPassword: password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setDone(true);
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-xl"
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="font-bold text-gray-900 text-lg">Reset Password</h2>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{admin.studentId}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                {done ? (
                    <div className="p-6 text-center space-y-3">
                        <div className="text-emerald-500 text-4xl">✓</div>
                        <p className="text-gray-900 font-bold">Password reset!</p>
                        <p className="text-gray-500 text-sm">The admin has been logged out of all sessions.</p>
                        <button onClick={onClose} className="mt-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-bold transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                            />
                        </div>
                        {error && <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2"><AlertTriangle size={14} />{error}</div>}
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-bold">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Reset
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </motion.div>
    );
};

// ─── Audit Logs Tab ───────────────────────────────────────────────────────────
const AuditLogsTab = ({ rounds }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState('');
    const [search, setSearch] = useState('');

    const fetchLogs = useCallback(async (roundId = '') => {
        setLoading(true);
        try {
            const url = roundId ? `${API}/audit-logs?roundId=${roundId}` : `${API}/audit-logs`;
            const res = await fetch(url, { headers: authHeader() });
            const data = await res.json();
            setLogs(data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(selectedRound); }, [selectedRound, fetchLogs]);

    const filtered = logs.filter(l => {
        const q = search.toLowerCase();
        return (
            l.student?.studentId?.toLowerCase().includes(q) ||
            l.student?.name?.toLowerCase().includes(q) ||
            l.round?.name?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by student or round..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                    />
                </div>
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                        value={selectedRound}
                        onChange={e => setSelectedRound(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl pl-8 pr-8 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none"
                    >
                        <option value="">All Rounds</option>
                        {rounds.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20"><Loader2 size={36} className="text-violet-500 animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-mono">NO AUDIT RECORDS FOUND</div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                {['Student ID', 'Name', 'Round', 'Status', 'Score', 'Cheat Flags', 'Tab Switches', 'Start Time', 'End Time'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(log => (
                                <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-indigo-600 whitespace-nowrap">{log.student?.studentId || '—'}</td>
                                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{log.student?.name || '—'}</td>
                                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{log.round?.name || '—'}</td>
                                    <td className={`px-4 py-3 font-bold whitespace-nowrap ${STATUS_COLORS[log.status] || 'text-gray-500'}`}>{log.status}</td>
                                    <td className="px-4 py-3 text-gray-700">{log.score ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`font-bold ${log.cheatFlags > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                            {log.cheatFlags ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`font-bold ${log.tabSwitches > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                            {log.tabSwitches ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                                        {log.startTime ? new Date(log.startTime).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                                        {log.endTime ? new Date(log.endTime).toLocaleString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="text-xs text-gray-400 font-mono text-right">{filtered.length} record(s)</p>
        </div>
    );
};

// ─── Question Form Modal ──────────────────────────────────────────────────────
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
        setSaving(true);
        setError('');
        try {
            const url = isEdit
                ? `${API}/questions/${question._id}`
                : `${API}/questions/${roundId}`;
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: authHeader(), body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            onSave(data.data);
        } catch (err) {
            setError(err.message);
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

// ─── Question Manager Tab ─────────────────────────────────────────────────────
const QuestionManagerTab = ({ rounds }) => {
    const [selectedRound, setSelectedRound] = useState('');
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(null); // null | 'add' | questionObj
    const [expandedId, setExpandedId] = useState(null);

    const fetchQuestions = useCallback(async (roundId) => {
        if (!roundId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/questions/${roundId}`, { headers: authHeader() });
            const data = await res.json();
            setQuestions(data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (selectedRound) fetchQuestions(selectedRound); else setQuestions([]); }, [selectedRound, fetchQuestions]);

    const handleDelete = async (questionId) => {
        if (!window.confirm('Delete this question permanently?')) return;
        try {
            await fetch(`${API}/questions/${questionId}`, { method: 'DELETE', headers: authHeader() });
            setQuestions(q => q.filter(x => x._id !== questionId));
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = (savedQuestion) => {
        setQuestions(prev => {
            const exists = prev.find(q => q._id === savedQuestion._id);
            return exists ? prev.map(q => q._id === savedQuestion._id ? savedQuestion : q) : [...prev, savedQuestion];
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
                    <motion.div key={q._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
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
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('activity');
    const [rounds, setRounds] = useState([]);

    useEffect(() => {
        fetch(`${API}/rounds`, { headers: authHeader() })
            .then(r => r.json())
            .then(d => setRounds(d.data || []))
            .catch(console.error);
    }, []);

    const tabs = [
        { id: 'activity', label: 'Activity Logs', icon: Activity },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'admins', label: 'Admins', icon: UserCog },
        { id: 'audit', label: 'Submission Audit', icon: ClipboardList },
        { id: 'questions', label: 'Questions', icon: BookOpen },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-gray-900 font-sans pb-12">
            {/* Sticky header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-xl text-violet-600">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-gray-900">Super Admin</h1>
                            <p className="text-xs font-mono text-gray-400 mt-0.5 uppercase tracking-widest">
                                {user?.name || 'Super Administrator'} • {user?.studentId}
                            </p>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors text-sm font-bold"
                    >
                        <LogOut size={14} /> Logout
                    </button>
                </div>

                {/* Tab Nav inside header */}
                <div className="max-w-7xl mx-auto px-6 flex gap-1 border-t border-gray-100">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-px ${activeTab === tab.id
                                ? 'text-violet-600 border-violet-500'
                                : 'text-gray-400 border-transparent hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon size={15} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                        {activeTab === 'activity' && <ActivityLogsTab />}
                        {activeTab === 'students' && <StudentManagerTab />}
                        {activeTab === 'admins' && <AdminManagerTab />}
                        {activeTab === 'audit' && <AuditLogsTab rounds={rounds} />}
                        {activeTab === 'questions' && <QuestionManagerTab rounds={rounds} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
