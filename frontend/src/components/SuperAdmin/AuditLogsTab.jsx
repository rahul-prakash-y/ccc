import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Search, Loader2, ChevronDown, Trash2, ClipboardList, AlertTriangle } from 'lucide-react';
import { api } from '../../store/authStore';
import { API, STATUS_COLORS } from './constants';
import { AnimatePresence, motion } from 'framer-motion';

const AuditLogsTab = ({ rounds }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRound, setSelectedRound] = useState('');
    
    // Search States
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [busy, setBusy] = useState({});

    // 1. Fetch Logic
    const fetchLogs = useCallback(async (roundId = '') => {
        setLoading(true);
        try {
            const url = roundId ? `${API}/audit-logs?roundId=${roundId}` : `${API}/audit-logs`;
            const res = await api.get(url);
            setLogs(res.data.data || []);
        } catch (e) {
            console.error("Failed to fetch audit logs:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    // 2. Initial Mount & Dependency Fetch
    useEffect(() => { 
        fetchLogs(selectedRound); 
    }, [selectedRound, fetchLogs]);

    // 3. Debounce Input Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search.toLowerCase());
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    // 4. Client-side Filtering
    const filtered = logs.filter(l => {
        if (!debouncedSearch) return true;
        return (
            l.student?.studentId?.toLowerCase().includes(debouncedSearch) ||
            l.student?.name?.toLowerCase().includes(debouncedSearch) ||
            l.round?.name?.toLowerCase().includes(debouncedSearch)
        );
    });

    // 5. Actions
    const handleDeleteSubmission = async (submissionId) => {
        if (!window.confirm("CRITICAL: Are you sure you want to PERMANENTLY DELETE this submission record?\n\nThis removes the student's score and frees them to take the test again. This cannot be undone.")) return;

        setBusy(b => ({ ...b, [submissionId]: true }));
        try {
            await api.delete(`${API}/submissions/${submissionId}`);
            setLogs(prev => prev.filter(l => l._id !== submissionId));
        } catch (e) {
            alert(e.response?.data?.error || "Delete failed");
        } finally {
            setBusy(b => ({ ...b, [submissionId]: false }));
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/60">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search logs by student ID, name, or round..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>
                
                <div className="relative min-w-[200px]">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded border border-slate-200 pointer-events-none text-slate-500">
                        <Filter size={12} />
                    </div>
                    <select
                        value={selectedRound}
                        onChange={e => setSelectedRound(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-8 py-2 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer shadow-sm"
                    >
                        <option value="">All Rounds Filter</option>
                        {rounds.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Data Grid Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
                        <Loader2 size={36} className="text-indigo-500 animate-spin mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Querying Submissions...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <ClipboardList size={48} className="text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">No audit records found</p>
                        <p className="text-xs text-slate-400 mt-1">Adjust your search or round filter.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['Student Details', 'Round Context', 'Status', 'Score', 'Anomalies', 'Actions'].map((h, i) => (
                                        <th key={h} className={`px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap ${i === 5 ? 'text-right' : ''}`}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(log => {
                                    const isBanned = log.student?.isBanned;
                                    const isAnomalous = log.cheatFlags > 0 || log.tabSwitches > 0;
                                    
                                    return (
                                        <tr key={log._id} className={`hover:bg-slate-50/80 transition-colors group ${isBanned ? 'bg-red-50/20' : ''}`}>
                                            
                                            {/* Student Column */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-indigo-600 font-bold text-xs">{log.student?.studentId || '—'}</span>
                                                    {isBanned && (
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-100 text-red-600 uppercase tracking-wider">Blocked</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{log.student?.name || 'Unknown'}</p>
                                            </td>

                                            {/* Round Column */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-bold text-slate-800">{log.round?.name || '—'}</p>
                                            </td>

                                            {/* Status Column */}
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${STATUS_COLORS[log.status] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                                    {log.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>

                                            {/* Score Column */}
                                            <td className="px-4 py-3">
                                                <span className={`font-mono font-bold text-sm ${log.score !== null ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {log.score ?? '—'}
                                                </span>
                                            </td>

                                            {/* Anomalies Column (Combined Tabs + Flags for density) */}
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${log.tabSwitches > 0 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                        <span>Tabs: {log.tabSwitches ?? 0}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${log.cheatFlags > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                        <span>Flags: {log.cheatFlags ?? 0}</span>
                                                    </div>
                                                    {isAnomalous && (
                                                        <AlertTriangle size={14} className="text-amber-500 ml-1" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions Column */}
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteSubmission(log._id)}
                                                    disabled={busy[log._id]}
                                                    title="Wipe Submission Record"
                                                    className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                                                >
                                                    {busy[log._id] ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* Footer Summary */}
            <div className="flex justify-between items-center px-1 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Audit Subsystem
                </p>
                <p className="text-[11px] text-slate-500 font-mono font-bold">
                    Showing <span className="text-slate-900">{filtered.length}</span> Records
                </p>
            </div>
        </div>
    );
};

export default AuditLogsTab;