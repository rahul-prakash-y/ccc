import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Search, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { API, authHeader, ACTION_STYLES, ALL_ACTIONS } from './constants';

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

export default ActivityLogsTab;
