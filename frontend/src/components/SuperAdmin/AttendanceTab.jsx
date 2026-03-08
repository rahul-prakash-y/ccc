import React, { useState, useEffect } from 'react';
import { Search, Loader2, Users, UserCheck, Clock, Calendar, Trash2, ChevronDown, FileDown } from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import Pagination from './components/Pagination';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useRoundStore } from '../../store/roundStore';
import { SkeletonList } from '../Skeleton';

const AttendanceTab = () => {
    // 1. Global Store State
    const {
        attendanceRecords: attendance,
        loading,
        pagination,
        activeOtp,
        timeLeft,
        otpLoading,
        fetchAttendance,
        fetchActiveOtp,
        generateOtp,
        removeAttendance,
        decrementTimer
    } = useAttendanceStore();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [exportLoading, setExportLoading] = useState(false);

    // Round state (using shared store for caching)
    const { rounds, loading: roundsLoading, fetchRounds } = useRoundStore();
    const [selectedRoundId, setSelectedRoundId] = useState('');

    useEffect(() => {
        fetchRounds();
    }, [fetchRounds]);

    // 1. Fetch Logic — re-fetch when round filter changes
    useEffect(() => {
        fetchAttendance({ search, page, limit, roundId: selectedRoundId || undefined }, true);
    }, [search, page, limit, selectedRoundId, fetchAttendance]);

    useEffect(() => {
        fetchActiveOtp(selectedRoundId || undefined);
    }, [fetchActiveOtp, selectedRoundId]);

    // 2. Timer Logic
    useEffect(() => {
        if (!activeOtp || timeLeft <= 0) return;
        const timer = setInterval(() => {
            decrementTimer();
        }, 1000);
        return () => clearInterval(timer);
    }, [activeOtp, timeLeft, decrementTimer]);


    const handleDeleteAttendance = async (id) => {
        if (!window.confirm("Are you sure you want to remove this attendance record?")) return;
        try {
            await api.delete(`/attendance/${id}`);
            removeAttendance(id);
        } catch (e) {
            console.error("Failed to delete attendance:", e);
            alert("Failed to delete record");
        }
    };

    const handleGenerateOtp = () => {
        generateOtp(selectedRoundId || undefined);
    };

    // Export attendance as Excel
    const handleExport = async () => {
        setExportLoading(true);
        try {
            const query = selectedRoundId ? `?roundId=${selectedRoundId}` : '';
            const res = await api.get(`/attendance/export${query}`, { responseType: 'blob' });

            // Derive filename from Content-Disposition header or fallback
            const disposition = res.headers['content-disposition'] || '';
            const match = disposition.match(/filename="?([^"]+)"?/);
            const filename = match ? match[1] : `Attendance_${new Date().toISOString().slice(0, 10)}.xlsx`;

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed:', e);
            alert('Failed to export attendance. Please try again.');
        } finally {
            setExportLoading(false);
        }
    };


    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Roll Call Card */}
            <div className="bg-white border shrink-0 border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-indigo-100/50 transition-colors" />

                <div className="relative flex flex-col gap-5">
                    {/* Round Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                            <Calendar size={16} className="text-indigo-500" />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Attendance Round</span>
                        </div>
                        <div className="relative flex-1 max-w-xs">
                            <select
                                value={selectedRoundId}
                                onChange={e => {
                                    setSelectedRoundId(e.target.value);
                                    setPage(1);
                                }}
                                disabled={roundsLoading}
                                className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm disabled:opacity-60"
                            >
                                <option value="">— All Rounds (No Round Filter) —</option>
                                {rounds.map(r => (
                                    <option key={r._id} value={r._id}>{r.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        {selectedRoundId && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                Scoped to: {rounds.find(r => r._id === selectedRoundId)?.name || '…'}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <UserCheck className="text-indigo-600" size={22} />
                                Roll Call Pulse
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {selectedRoundId
                                    ? `Broadcast attendance key for: ${rounds.find(r => r._id === selectedRoundId)?.name || 'selected round'}`
                                    : 'Broadcast a standalone attendance key (no round)'}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {activeOtp ? (
                                <div className="flex items-center gap-3 bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Active Code</p>
                                        <div className="flex items-center gap-1.5 font-mono text-2xl font-black text-indigo-700 tracking-tighter">
                                            {activeOtp.split('').map((char, i) => (
                                                <span key={i} className="bg-white w-7 h-9 flex items-center justify-center rounded-lg border border-indigo-200/50 shadow-inner">
                                                    {char}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="hidden sm:block w-px h-8 bg-indigo-200/50 mx-1" />
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Expires In</p>
                                        <p className="text-sm font-black text-indigo-600 tabular-nums">
                                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerateOtp}
                                    disabled={otpLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                                >
                                    {otpLoading ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                                    GENERATE ROLL CALL KEY
                                </button>
                            )}

                            {activeOtp && (
                                <button
                                    onClick={handleGenerateOtp}
                                    disabled={otpLoading}
                                    className="p-3 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-2xl transition-all active:scale-90"
                                    title="Regenerate Key"
                                >
                                    <Clock size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/60">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by student name, ID, or marking admin..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                        <Users size={16} />
                        <span className="text-xs font-black uppercase tracking-wider">
                            Total Presents: {pagination.totalRecords}
                        </span>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exportLoading}
                        title={selectedRoundId ? 'Export this round\'s attendance to Excel' : 'Export all rounds to Excel (one sheet per round)'}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-emerald-100 active:scale-95 disabled:opacity-60 whitespace-nowrap"
                    >
                        {exportLoading
                            ? <Loader2 size={15} className="animate-spin" />
                            : <FileDown size={15} />}
                        {selectedRoundId ? 'Export Round' : 'Export All Rounds'}
                    </button>
                </div>
            </div>


            {loading ? (
                <SkeletonList count={8} />
            ) : attendance.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <Users size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-700">No Attendance Records</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        {selectedRoundId
                            ? 'No students marked for this round yet.'
                            : 'No students have initialized sessions yet.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Round</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Marked At</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Provided By (Admin)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {attendance.map((record) => (
                                    <tr key={record._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase shadow-sm">
                                                    {record.student?.name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 leading-none">
                                                        {record.student?.name || 'Unknown Student'}
                                                    </p>
                                                    <p className="text-[10px] font-mono text-slate-500 mt-1.5 uppercase font-bold tracking-tighter">
                                                        ID: {record.student?.studentId}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {record.round?.name ? (
                                                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest whitespace-nowrap">
                                                    {record.round.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-300 italic">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-2 text-slate-500">
                                                <Clock size={14} />
                                                <span className="text-xs font-bold">
                                                    {new Date(record.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-full border border-indigo-100/50">
                                                <UserCheck size={14} className="text-indigo-600" />
                                                <span className="text-xs font-black text-indigo-700">
                                                    {record.markedBy?.name || 'System / Auto'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteAttendance(record._id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remove Attendance"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
    );
};

export default AttendanceTab;
