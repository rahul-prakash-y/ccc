import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Clock, Calendar, Award, Loader2, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { api, useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { formatDateIST, formatTimeIST } from '../utils/dateUtils';

const AttendanceHistoryPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/attendance/my-history');
                setRecords(res.data.data || []);
            } catch {
                setError('Failed to load attendance history.');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const formatDate = (dateStr) => formatDateIST(dateStr);
    const formatTime = (dateStr) => formatTimeIST(dateStr);

    return (
        <>
            {/* Header */}
            <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <UserCheck className="text-indigo-500" size={20} />
                            Attendance History
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">
                            {user?.name} · {user?.studentId}
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 relative z-10 space-y-6">
                {/* Summary Card */}
                {!loading && !error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-sm"
                    >
                        <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                            <CheckCircle size={32} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Sessions</p>
                            <p className="text-4xl font-black text-slate-900 tracking-tight">{records.length}</p>
                            <p className="text-xs font-medium text-slate-400 mt-1">
                                {records.length === 0
                                    ? 'No attendance recorded yet.'
                                    : `Last marked on ${formatDate(records[0].createdAt)} at ${formatTime(records[0].createdAt)}`}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Records */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 size={36} className="text-indigo-400 animate-spin" />
                        <p className="text-sm font-bold text-slate-400">Loading attendance records...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <AlertTriangle size={36} className="text-red-400" />
                        <p className="text-sm font-bold text-red-500">{error}</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-24 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100/50">
                            <Clock size={32} className="text-slate-200" />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 mb-2 tracking-tight">Deployment records are currently null.</h2>
                        <p className="text-sm text-slate-500 font-medium">Your presence in the arena has not been logged yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between px-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Validated Timeline</h3>
                        </div>
                        {records.map((record, index) => (
                            <motion.div
                                key={record._id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Calendar size={22} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-base">{formatDate(record.createdAt)}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Authentication: Validated</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                                    <Clock size={14} className="text-slate-400 group-hover:text-indigo-500" />
                                    <span className="text-xs font-black text-slate-700 font-mono tracking-wider group-hover:text-indigo-600">
                                        {formatTime(record.createdAt)}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
};

export default AttendanceHistoryPage;
