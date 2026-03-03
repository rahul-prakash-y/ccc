import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Loader2, AlertTriangle, X, Check,
    UserCog, UserX, UserCheck, KeyRound, LogIn, Trash2
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';

// ─── Add Admin Modal ───────────────────────────────────────────────────────────
const AddAdminModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({ studentId: '', name: '', password: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const res = await api.post(`${API}/admins`, form);
            onCreated(res.data.data);
        } catch (e) { setError(e.response?.data?.error || e.message); }
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

// ─── Reset Admin Password Modal ────────────────────────────────────────────────
const ResetPasswordModal = ({ admin, onClose }) => {
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            await api.patch(`${API}/admins/${admin._id}/reset-password`, { newPassword: password });
            setDone(true);
        } catch (e) { setError(e.response?.data?.error || e.message); }
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

// ─── Admin Manager Tab ─────────────────────────────────────────────────────────
const AdminManagerTab = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [resetTarget, setResetTarget] = useState(null);
    const [busy, setBusy] = useState({});
    const [error, setError] = useState('');

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API}/admins`);
            setAdmins(res.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

    const act = async (adminId, path, method = 'PATCH', body = undefined) => {
        setBusy(b => ({ ...b, [`${adminId}-${path}`]: true }));
        setError('');
        try {
            const res = await api({
                method,
                url: `${API}/admins/${adminId}/${path}`,
                data: body
            });
            return res.data;
        } catch (e) {
            setError(e.response?.data?.error || 'Action failed');
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
            await api.delete(`${API}/admins/${admin._id}`);
            setAdmins(prev => prev.filter(a => a._id !== admin._id));
        } catch (e) { setError(e.response?.data?.error || e.message); }
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
                <div className="flex justify-center py-20"><Loader2 size={36} className="text-violet-500 animate-spin" /></div>
            ) : admins.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-mono">NO ADMINS FOUND</div>
            ) : (
                <div className="space-y-3">
                    {admins.map((admin, idx) => (
                        <motion.div key={admin._id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
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
                                <button onClick={() => handleForceLogout(admin)}
                                    disabled={busy[`${admin._id}-force-logout`]}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                                >
                                    {busy[`${admin._id}-force-logout`] ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
                                    Force Logout
                                </button>

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

                                <button onClick={() => setResetTarget(admin)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                                >
                                    <KeyRound size={13} /> Reset PW
                                </button>

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

            <AnimatePresence>
                {showAddModal && (
                    <AddAdminModal
                        onClose={() => setShowAddModal(false)}
                        onCreated={admin => { setAdmins(prev => [admin, ...prev]); setShowAddModal(false); }}
                    />
                )}
            </AnimatePresence>

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

export default AdminManagerTab;
