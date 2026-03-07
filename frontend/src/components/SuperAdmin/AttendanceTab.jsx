import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Users, UserCheck, Clock, Calendar } from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import Pagination from './components/Pagination';
import { SkeletonList } from '../Skeleton';

const AttendanceTab = () => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pagination, setPagination] = useState({ totalPages: 1, totalRecords: 0 });

    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('page', page);
            params.append('limit', limit);

            const res = await api.get(`${API}/attendance?${params.toString()}`);
            setAttendance(res.data.data || []);
            setPagination(res.data.pagination || { totalPages: 1, totalRecords: 0 });
        } catch (e) {
            console.error("Failed to fetch attendance:", e);
        } finally {
            setLoading(false);
        }
    }, [search, page, limit]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    // Reset page on search
    useEffect(() => {
        setPage(1);
    }, [search]);

    return (
        <div className="space-y-4 h-full flex flex-col">
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
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                    <Users size={16} />
                    <span className="text-xs font-black uppercase tracking-wider">
                        Total Presents: {pagination.totalRecords}
                    </span>
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
                    <p className="text-sm text-slate-400 mt-1">No students have initialized sessions yet.</p>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Test / Section</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entry Time</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Provided By (Admin)</th>
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
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    <Calendar size={14} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
                                                    {record.round?.name || 'Round Expired'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Clock size={14} />
                                                <span className="text-xs font-bold">
                                                    {record.startTime ? new Date(record.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Pending'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-full border border-indigo-100/50">
                                                <UserCheck size={14} className="text-indigo-600" />
                                                <span className="text-xs font-black text-indigo-700">
                                                    {record.conductedBy?.name || 'System / Auto'}
                                                </span>
                                            </div>
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
