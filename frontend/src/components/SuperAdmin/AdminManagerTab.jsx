import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, Loader2, AlertTriangle, X, Check, Search,
    UserCog, UserX, UserCheck, KeyRound, LogIn, Trash2, Upload
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import Pagination from './components/Pagination';
import toast from 'react-hot-toast';
import { useConfirm } from '../../store/confirmStore';
import { useAdminStore } from '../../store/adminStore';
import { SkeletonList } from '../Skeleton';

// ─── Refined Add Admin Modal ───────────────────────────────────────────────────────────
const AddAdminModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState({ studentId: '', name: '', password: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await api.post(`${API}/admins`, form);
            onCreated(res.data.data);
        } catch (e) {
            setError(e.response?.data?.error || "Failed to create admin.");
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
                className="fixed inset-0 z-100 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-violet-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                                <UserCog size={18} />
                            </div>
                            <h2 className="font-bold text-slate-900 text-lg">Provision Admin</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {[['Admin ID / Username', 'studentId', 'text'], ['Full Name', 'name', 'text'], ['Security Key', 'password', 'password']].map(([label, key, type]) => (
                            <div key={key}>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
                                <input
                                    type={type}
                                    value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all shadow-sm"
                                />
                            </div>
                        ))}

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-xl p-3">
                                <AlertTriangle size={16} className="shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-bold text-sm">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving || !form.studentId} className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-200 active:scale-95 text-sm">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Provision System
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── Bulk Upload Modal ─────────────────────────────────────────────────────────
const AdminBulkUploadModal = ({ onClose, onUploaded }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
                setError('Please upload a valid Excel or CSV file.');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post(`${API}/admins/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data.data);
            if (onUploaded) onUploaded();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to process file. Check format.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && !uploading && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-emerald-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <Upload size={18} />
                            </div>
                            <h2 className="font-bold text-slate-900 text-lg">Bulk Admin Upload</h2>
                        </div>
                        <button onClick={onClose} disabled={uploading} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors disabled:opacity-50">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {!result ? (
                            <>
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
                                        <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400">
                                            <Upload size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Choose Excel File</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1">Expected columns: "AdminId", "Name", "Password"</p>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await api.get(`${API}/admins/upload-template`, { responseType: 'blob' });
                                                        const url = window.URL.createObjectURL(new Blob([res.data]));
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.setAttribute('download', 'admin_upload_template.xlsx');
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        link.remove();
                                                    } catch (err) {
                                                        console.error("Failed to download template", err);
                                                    }
                                                }}
                                                className="mt-2 text-[10px] text-indigo-600 font-black uppercase tracking-wider hover:underline"
                                            >
                                                Download Template
                                            </button>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="admin-bulk-upload-input"
                                        />
                                        <label
                                            htmlFor="admin-bulk-upload-input"
                                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm active:scale-95 transition-all"
                                        >
                                            {file ? file.name : 'Select File'}
                                        </label>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-xl p-3">
                                            <AlertTriangle size={16} className="shrink-0" />
                                            <p>{error}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button onClick={onClose} disabled={uploading} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-bold text-sm">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpload}
                                            disabled={uploading || !file}
                                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-95 text-sm"
                                        >
                                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                            Start Upload
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-4">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                        <Check size={32} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Upload Complete</h3>
                                        <p className="text-xs text-slate-500 font-bold mt-1">The file has been processed successfully.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</p>
                                            <p className="text-xl font-black text-emerald-600">{result.createdCount}</p>
                                        </div>
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skipped</p>
                                            <p className="text-xl font-black text-slate-400">{result.skippedCount}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 transition-all"
                                >
                                    Close Window
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── Refined Reset Admin Password Modal ────────────────────────────────────────────────
const ResetPasswordModal = ({ admin, onClose }) => {
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.patch(`${API}/admins/${admin._id}/reset-password`, { newPassword: password });
            setDone(true);
        } catch (e) {
            setError(e.response?.data?.error || "Reset failed.");
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
                className="fixed inset-0 z-100 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
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
                                Target: {admin.studentId}
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
                                <p className="text-slate-900 font-black text-xl">Access Restored</p>
                                <p className="text-slate-500 text-sm mt-1 leading-relaxed">Admin credentials updated. Active sessions terminated.</p>
                            </div>
                            <button onClick={onClose} className="w-full mt-4 px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold transition-colors">
                                Acknowledge
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">New Security Key</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    minLength={6}
                                    required
                                    autoFocus
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-shadow shadow-sm"
                                />
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-lg p-3">
                                    <AlertTriangle size={14} className="shrink-0" /> <p>{error}</p>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-bold text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving || password.length < 6} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-200 text-sm">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                                    Execute
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ─── Main Admin Manager Tab ─────────────────────────────────────────────────────────
const AdminManagerTab = () => {
    const showConfirm = useConfirm(state => state.showConfirm);

    // Global Store State
    const {
        admins,
        loading,
        pagination,
        fetchAdmins,
        addAdmin,
        removeAdmin,
        updateAdmin
    } = useAdminStore();

    // UI State
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [resetTarget, setResetTarget] = useState(null);
    const [busy, setBusy] = useState({});
    const [globalError, setGlobalError] = useState('');

    // 1. Fetch Logic
    useEffect(() => {
        fetchAdmins({ search, page, limit });
    }, [search, page, limit, fetchAdmins]);

    // Reset page on search change
    useEffect(() => {
        setPage(1);
    }, [search]);

    const act = async (adminId, path, method = 'PATCH', body = undefined) => {
        setBusy(b => ({ ...b, [`${adminId}-${path}`]: true }));
        setGlobalError('');
        try {
            const res = await api({ method, url: `${API}/admins/${adminId}/${path}`, data: body });
            return res.data;
        } catch (e) {
            setGlobalError(e.response?.data?.error || `Action '${path}' failed.`);
            return null;
        } finally {
            setBusy(b => ({ ...b, [`${adminId}-${path}`]: false }));
        }
    };

    const handleForceLogout = (admin) => {
        showConfirm({
            title: "Force Logout",
            message: `Terminate session for ${admin.studentId}?`,
            confirmLabel: "Force Logout",
            onConfirm: async () => {
                const res = await act(admin._id, 'force-logout');
                if (res) {
                    toast.success("Admin forcefully logged out.");
                    fetchAdmins();
                }
            }
        });
    };

    const handleBlockToggle = (admin) => {
        const verb = admin.isBanned ? 'Unblock' : 'Block';
        showConfirm({
            title: `${verb} Admin`,
            message: `${verb} admin access for ${admin.studentId}?`,
            confirmLabel: verb,
            isDanger: !admin.isBanned,
            onConfirm: async () => {
                const res = await act(admin._id, 'block');
                if (res) {
                    toast.success(`Admin ${verb.toLowerCase()}ed successfully.`);
                    updateAdmin(admin._id, { isBanned: res.isBanned });
                }
            }
        });
    };

    const handleDelete = (admin) => {
        showConfirm({
            title: "Revoke Admin Access",
            message: `REVOKE ADMIN RIGHTS:\n\nPermanently delete ${admin.studentId}?\nThis cannot be undone.`,
            confirmLabel: "Delete Permanently",
            isDanger: true,
            onConfirm: async () => {
                setBusy(b => ({ ...b, [`${admin._id}-delete`]: true }));
                try {
                    await api.delete(`${API}/admins/${admin._id}`);
                    toast.success("Admin deleted successfully.");
                    removeAdmin(admin._id);
                } catch (e) {
                    toast.error(e.response?.data?.error || "Deletion failed.");
                    setGlobalError(e.response?.data?.error || "Deletion failed.");
                } finally {
                    setBusy(b => ({ ...b, [`${admin._id}-delete`]: false }));
                }
            }
        });
    };

    return (
        <div className="space-y-4 h-full flex flex-col">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center bg-slate-50 p-2 rounded-2xl border border-slate-200/60">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filter admins by ID or name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-4 px-2">
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Security Clearance</p>
                        <p className="text-sm font-bold text-slate-700 leading-none mt-1">{pagination.totalRecords} Admins</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-700 font-bold text-sm transition-all active:scale-95"
                        >
                            <Upload size={16} /> <span className="hidden sm:inline">Bulk Upload</span>
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-white font-bold text-sm transition-all shadow-md shadow-violet-200 active:scale-95"
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">Add Admin</span>
                        </button>
                    </div>
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

            {/* List Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {loading && admins.length === 0 ? (
                    <div className="py-4">
                        <SkeletonList count={8} />
                    </div>
                ) : admins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 h-full border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <UserCog size={48} className="text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">No admin records found</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-2">
                            {admins.map((admin) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    key={admin._id}
                                    className={`group flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-xl border transition-all hover:shadow-md
                                        ${admin.isBanned
                                            ? 'bg-red-50/30 border-red-100 hover:border-red-300'
                                            : 'bg-white border-slate-200 hover:border-violet-300'}`}
                                >
                                    {/* Core Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2 rounded-lg border shrink-0 ${admin.isBanned ? 'bg-red-100 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:text-violet-600 group-hover:bg-violet-50 transition-colors'
                                            }`}>
                                            <UserCog size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-900 font-mono text-sm tracking-tight">{admin.studentId}</p>
                                                {admin.isBanned && (
                                                    <span className="px-1.5 py-0.5 rounded uppercase text-[9px] font-black bg-red-100 text-red-600 tracking-wider">Blocked</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate font-medium">{admin.name || 'Unidentified Admin'}</p>
                                        </div>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-1.5 md:opacity-80 group-hover:opacity-100 transition-opacity justify-end">
                                        <button
                                            onClick={() => handleForceLogout(admin)}
                                            disabled={busy[`${admin._id}-force-logout`]}
                                            title="Force Logout Session"
                                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all disabled:opacity-50"
                                        >
                                            {busy[`${admin._id}-force-logout`] ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                                        </button>

                                        <button
                                            onClick={() => setResetTarget(admin)}
                                            title="Reset Password"
                                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all"
                                        >
                                            <KeyRound size={14} />
                                        </button>

                                        <button
                                            onClick={() => handleBlockToggle(admin)}
                                            disabled={busy[`${admin._id}-block`]}
                                            title={admin.isBanned ? "Unblock Admin" : "Block Admin"}
                                            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-50 ${admin.isBanned
                                                ? 'bg-red-100 border-red-200 text-red-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                                                : 'border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                                }`}
                                        >
                                            {busy[`${admin._id}-block`]
                                                ? <Loader2 size={14} className="animate-spin" />
                                                : admin.isBanned ? <UserCheck size={14} /> : <UserX size={14} />}
                                        </button>

                                        <div className="w-px h-6 bg-slate-200 mx-1" />

                                        <button
                                            onClick={() => handleDelete(admin)}
                                            disabled={busy[`${admin._id}-delete`]}
                                            title="Revoke Admin Access"
                                            className="h-8 px-2 flex items-center gap-1.5 rounded-lg border border-transparent text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                                        >
                                            {busy[`${admin._id}-delete`] ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </div>
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

            {/* Mounted Modals */}
            {showBulkModal && (
                <AdminBulkUploadModal
                    onClose={() => setShowBulkModal(false)}
                    onUploaded={() => {
                        fetchAdmins({ search, page, limit }, true);
                        setShowBulkModal(false);
                    }}
                />
            )}

            {showAddModal && (
                <AddAdminModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={(newAdmin) => {
                        addAdmin(newAdmin);
                        setShowAddModal(false);
                    }}
                />
            )}

            {resetTarget && (
                <ResetPasswordModal
                    admin={resetTarget}
                    onClose={() => setResetTarget(null)}
                />
            )}
        </div>
    );
};

export default AdminManagerTab;
