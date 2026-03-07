import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, Loader2, AlertTriangle, X, Check, Eye, Mail, Phone, FileText,
    Users, UserX, UserCheck, KeyRound, LogIn, Trash2, Search, Upload,
    Linkedin, Github, Calendar, Download
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import Pagination from './components/Pagination';
import toast from 'react-hot-toast';
import { useConfirm } from '../../store/confirmStore';
import { useStudentStore } from '../../store/studentStore';
import { useTeamStore } from '../../store/teamStore';
import { SkeletonList } from '../Skeleton';

// ─── Refined Student Creation Modal ─────────────────────────────────────────────────────────
const AddStudentModal = ({ onClose, onCreated }) => {
    const [studentId, setStudentId] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [department, setDepartment] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedId = studentId.trim();
        if (!trimmedId) return;

        setSaving(true);
        setError('');

        try {
            const res = await api.post(`${API}/students`, {
                studentId: trimmedId,
                name: name.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                dob: dob || undefined,
                department: department.trim() || undefined
            });
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
                className="fixed inset-0 z-100 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
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
                                Student Identifier (Roll/ID) *
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
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Enter name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="yourname@gmail.com"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="Contact No"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    value={dob}
                                    onChange={e => setDob(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                Department
                            </label>
                            <input
                                type="text"
                                value={department}
                                onChange={e => setDepartment(e.target.value)}
                                placeholder="e.g. CSE"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-xl p-3">
                                <AlertTriangle size={16} className="shrink-0" />
                                <p>{error}</p>
                            </div>
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
        </AnimatePresence >
    );
};

// ─── Bulk Upload Modal ─────────────────────────────────────────────────────────
const BulkUploadModal = ({ onClose, onUploaded }) => {
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
            const res = await api.post(`${API}/students/upload`, formData, {
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
                            <h2 className="font-bold text-slate-900 text-lg">Bulk Student Upload</h2>
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
                                            <p className="text-[10px] text-slate-400 font-bold mt-1">Expected column: "Roll No" or "StudentId"</p>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await api.get(`${API}/students/upload-template`, { responseType: 'blob' });
                                                        const url = window.URL.createObjectURL(new Blob([res.data]));
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.setAttribute('download', 'student_upload_template.xlsx');
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
                                            id="bulk-upload-input"
                                        />
                                        <label
                                            htmlFor="bulk-upload-input"
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
                                <button onClick={onClose} className="w-full py-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-slate-200">
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
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
                                <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-lg p-3">
                                    <AlertTriangle size={14} className="shrink-0" /> <p>{error}</p>
                                </div>
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
// ─── Student Details Modal ──────────────────────────────────────────────────
const StudentDetailsModal = ({ student, onClose }) => {
    const [downloading, setDownloading] = useState(false);

    const handleDownloadReport = async () => {
        try {
            setDownloading(true);
            const response = await api.get(`${API}/students/${student._id}/report`, {
                responseType: 'blob'
            });

            // Check if we actually got a PDF
            if (response.data.type !== 'application/pdf') {
                // If it's not a PDF, it's likely an error message in JSON format hidden as a blob
                const text = await response.data.text();
                const errorData = JSON.parse(text);
                throw new Error(errorData.error || 'Failed to generate report');
            }

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Report_${student.studentId || 'Student'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Report downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            toast.error(error.message || 'Failed to download report');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-indigo-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center text-indigo-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <h2 className="font-black text-slate-900 text-xl tracking-tight leading-none">{student.name || 'Anonymous Student'}</h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{student.studentId}</p>
                                    {student.department && (
                                        <>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{student.department}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Bio Section */}
                        {student.bio && (
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={12} className="text-indigo-400" /> About Student
                                </h3>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                        "{student.bio}"
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Social Profiles */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connect</h3>
                                <div className="space-y-2">
                                    {student.linkedinProfile && (
                                        <a href={student.linkedinProfile} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl text-blue-700 hover:bg-blue-50 transition-all group">
                                            <div className="p-1.5 bg-white border border-blue-100 rounded-lg group-hover:scale-110 transition-transform">
                                                <Linkedin size={14} />
                                            </div>
                                            <span className="text-xs font-bold truncate">LinkedIn Profile</span>
                                        </a>
                                    )}
                                    {student.githubProfile && (
                                        <a href={student.githubProfile} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 hover:bg-slate-100 transition-all group">
                                            <div className="p-1.5 bg-white border border-slate-200 rounded-lg group-hover:scale-110 transition-transform">
                                                <Github size={14} />
                                            </div>
                                            <span className="text-xs font-bold truncate">GitHub Profile</span>
                                        </a>
                                    )}
                                    {!student.linkedinProfile && !student.githubProfile && (
                                        <p className="text-xs text-slate-400 italic">No social profiles linked</p>
                                    )}
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Details</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700">
                                        <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                                            <Phone size={14} className="text-indigo-400" />
                                        </div>
                                        <span className="text-xs font-bold">{student.phone || 'N/A'}</span>
                                    </div>
                                    {student.dob && (
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700">
                                            <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                                                <Calendar size={14} className="text-indigo-400" />
                                            </div>
                                            <span className="text-xs font-bold">
                                                {new Date(student.dob).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700">
                                        <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                                            <Mail size={14} className="text-indigo-400" />
                                        </div>
                                        <span className="text-xs font-bold">{student.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Meta */}
                        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${student.isOnboarded ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">{student.isOnboarded ? 'Onboarded' : 'Pending Onboarding'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Platform Access</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${student.isBanned ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">{student.isBanned ? 'Blocked' : 'Active'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 border-t border-slate-100">
                            <button
                                onClick={handleDownloadReport}
                                disabled={downloading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
                            >
                                {downloading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Download size={16} />
                                )}
                                Download Student Performance Report
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const StudentManagerTab = () => {
    const showConfirm = useConfirm(state => state.showConfirm);

    // Global Store State
    const {
        students,
        loading,
        pagination,
        fetchStudents,
        addStudent,
        removeStudent,
        updateStudent
    } = useStudentStore();
    const { teams, fetchTeams } = useTeamStore();

    // UI State
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [viewingStudent, setViewingStudent] = useState(null);
    const [resetTarget, setResetTarget] = useState(null);
    const [busy, setBusy] = useState({});
    const [globalError, setGlobalError] = useState('');

    // 1. Fetch Logic
    useEffect(() => {
        fetchStudents({ search, page, limit });
    }, [search, page, limit, fetchStudents]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    // Reset page on search change
    useEffect(() => {
        setPage(1);
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

    const handleForceLogout = (student) => {
        showConfirm({
            title: "Force Logout",
            message: `Force logout ${student.studentId}? They will be immediately disconnected.`,
            confirmLabel: "Force Logout",
            onConfirm: async () => {
                const res = await act(student._id, 'force-logout');
                if (res) {
                    toast.success("Student forcefully logged out.");
                    fetchStudents();
                }
            }
        });
    };

    const handleTeamChange = async (studentId, teamId) => {
        try {
            await api.patch(`${API}/students/${studentId}/team`, { teamId });
            toast.success("Team updated");
            fetchStudents();
        } catch (e) {
            toast.error(e.response?.data?.error || "Failed to update team");
        }
    };

    const handleBlockToggle = (student) => {
        const verb = student.isBanned ? 'Unblock' : 'Block';
        showConfirm({
            title: `${verb} Student`,
            message: `${verb} student ${student.studentId}?`,
            confirmLabel: verb,
            isDanger: !student.isBanned,
            onConfirm: async () => {
                const res = await act(student._id, 'block');
                if (res) {
                    toast.success(`Student ${verb.toLowerCase()}ed successfully.`);
                    updateStudent(student._id, { isBanned: res.isBanned });
                }
            }
        });
    };

    const handleDelete = (student) => {
        showConfirm({
            title: "Delete Student",
            message: `CRITICAL WARNING:\n\nPermanently delete ${student.studentId}?\nThis destroys all records and cannot be undone.`,
            confirmLabel: "Delete Permanently",
            isDanger: true,
            onConfirm: async () => {
                setBusy(b => ({ ...b, [`${student._id}-delete`]: true }));
                try {
                    await api.delete(`${API}/students/${student._id}`);
                    toast.success("Student deleted successfully.");
                    removeStudent(student._id);
                } catch (e) {
                    toast.error(e.response?.data?.error || "Deletion failed.");
                    setGlobalError(e.response?.data?.error || "Deletion failed.");
                } finally {
                    setBusy(b => ({ ...b, [`${student._id}-delete`]: false }));
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
                        placeholder="Search student ID or name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-4 px-2">
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Directory</p>
                        <p className="text-sm font-bold text-slate-700 leading-none mt-1">{pagination.totalRecords} Records</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-700 font-bold text-sm transition-all shadow-sm active:scale-95"
                        >
                            <Upload size={16} /> <span className="hidden sm:inline">Bulk Upload</span>
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold text-sm transition-all shadow-md shadow-indigo-200 active:scale-95"
                        >
                            <Plus size={16} /> <span className="hidden sm:inline">Add Student</span>
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

            {/* Data Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {loading && students.length === 0 ? (
                    <div className="py-4">
                        <SkeletonList count={8} />
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 h-full border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <Users size={48} className="text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">No students found</p>
                    </div>
                ) : (
                    <>
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
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`p-2 rounded-lg border shrink-0 ${student.isBanned ? 'bg-red-100 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors'
                                            }`}>
                                            <Users size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-900 font-mono text-sm tracking-tight">{student.studentId}</p>
                                                    {student.isBanned && (
                                                        <span className="px-1.5 py-0.5 rounded uppercase text-[9px] font-black bg-red-100 text-red-600 tracking-wider">Blocked</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 truncate font-medium">{student.name || 'No Name Registered'}</p>

                                                {/* Profile Quick Info Indicators */}
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    {student.email && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                            <Mail size={10} />
                                                            <span>{student.email}</span>
                                                        </div>
                                                    )}
                                                    {student.phone && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                            <Phone size={10} />
                                                            <span>{student.phone}</span>
                                                        </div>
                                                    )}
                                                    {student.dob && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                            <Calendar size={10} />
                                                            <span>{new Date(student.dob).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 border-l border-slate-100 pl-2 ml-1">
                                                        {student.linkedinProfile && (
                                                            <Linkedin size={10} className="text-slate-300 hover:text-blue-500 transition-colors" />
                                                        )}
                                                        {student.githubProfile && (
                                                            <Github size={10} className="text-slate-300 hover:text-slate-600 transition-colors" />
                                                        )}
                                                        {student.bio && (
                                                            <FileText size={10} className="text-slate-300" title={student.bio} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Team Selector */}
                                            <div className="flex items-center gap-2 border-l border-slate-100 pl-4 py-1">
                                                <select
                                                    value={student.team?._id || ''}
                                                    onChange={(e) => handleTeamChange(student._id, e.target.value || null)}
                                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[140px] transition-all"
                                                >
                                                    <option value="">No Team Assigned</option>
                                                    {teams.map(t => (
                                                        <option key={t._id} value={t._id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 md:opacity-80 group-hover:opacity-100 transition-opacity justify-end">
                                        <button
                                            onClick={() => setViewingStudent(student)}
                                            title="View Full Profile"
                                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                                        >
                                            <Eye size={14} />
                                        </button>

                                        <div className="w-px h-6 bg-slate-200 mx-1" />

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
                                            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-50 ${student.isBanned
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
            {showAddModal && (
                <AddStudentModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={(newStudent) => {
                        addStudent(newStudent);
                        setShowAddModal(false);
                    }}
                />
            )}

            {showBulkModal && (
                <BulkUploadModal
                    onClose={() => setShowBulkModal(false)}
                    onUploaded={() => {
                        fetchStudents({ search, page, limit }, true);
                    }}
                />
            )}

            {resetTarget && (
                <ResetStudentPasswordModal
                    student={resetTarget}
                    onClose={() => setResetTarget(null)}
                />
            )}

            {viewingStudent && (
                <StudentDetailsModal
                    student={viewingStudent}
                    onClose={() => setViewingStudent(null)}
                />
            )}
        </div>
    );
};

export default StudentManagerTab;
