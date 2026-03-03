import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Search, Loader2, ChevronDown, UserX, UserCheck, Trash2 } from 'lucide-react';
import { api } from '../../store/authStore';
import { API, STATUS_COLORS } from './constants';

const AuditLogsTab = ({ rounds }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState('');
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState({});

    const fetchLogs = useCallback(async (roundId = '') => {
        setLoading(true);
        try {
            const url = roundId ? `${API}/audit-logs?roundId=${roundId}` : `${API}/audit-logs`;
            const res = await api.get(url);
            setLogs(res.data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleBlock = async (studentId, isCurrentlyBanned) => {
        const verb = isCurrentlyBanned ? 'Unblock' : 'Block';
        if (!window.confirm(`${verb} this student?`)) return;

        setBusy(b => ({ ...b, [studentId]: true }));
        try {
            const res = await api.patch(`${API}/students/${studentId}/block`);
            // Update local logs state to reflect the status change
            setLogs(prev => prev.map(l =>
                l.student?._id === studentId
                    ? { ...l, student: { ...l.student, isBanned: res.data.isBanned } }
                    : l
            ));
        } catch (e) {
            alert(e.response?.data?.error || "Action failed");
        } finally {
            setBusy(b => ({ ...b, [studentId]: false }));
        }
    };

    const handleDeleteSubmission = async (submissionId) => {
        if (!window.confirm("Are you sure you want to PERMANENTLY DELETE this submission record? This is helpful for clearing test data but cannot be undone.")) return;

        setBusy(b => ({ ...b, [submissionId]: true }));
        try {
            await api.delete(`${API}/submissions/${submissionId}`);
            // Remove the log from the local state
            setLogs(prev => prev.filter(l => l._id !== submissionId));
        } catch (e) {
            alert(e.response?.data?.error || "Delete failed");
        } finally {
            setBusy(b => ({ ...b, [submissionId]: false }));
        }
    };

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
            {/* Filters (same as before) */}
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
                                {['Student ID', 'Name', 'Round', 'Status', 'Score', 'Cheat Flags', 'Tab Switches', 'Actions'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(log => (
                                <tr key={log._id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${log.student?.isBanned ? 'bg-red-50/50' : ''}`}>
                                    <td className="px-4 py-3 font-mono text-indigo-600 whitespace-nowrap">
                                        {log.student?.studentId || '—'}
                                        {log.student?.isBanned && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-sans font-bold">BANNED</span>}
                                    </td>
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
                                    <td className="px-4 py-3 whitespace-nowrap flex gap-2">
                                        <button
                                            onClick={() => handleDeleteSubmission(log._id)}
                                            disabled={busy[log._id]}
                                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                                            title="Delete Submission Record"
                                        >
                                            {busy[log._id] ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
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

export default AuditLogsTab;
