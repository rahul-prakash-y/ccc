import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Filter, Search, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { api } from '../../store/authStore';
import { API, ACTION_STYLES, ALL_ACTIONS } from './constants';

const ActivityLogsTab = () => {
    // 1. Data Source State
    const [allLogs, setAllLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // 2. Filter States
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    // Fetch ONLY on mount or explicit refresh. Ignore filter changes.
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API}/activity-logs`);
            setAllLogs(res.data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { 
        fetchLogs(); 
    }, [fetchLogs]);

    // 3. Debounced Search Effect 
    // Wait for the user to stop typing for 300ms before triggering the heavy array map.
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);


    // 4. Mamoized Filter Logic (Applies both Action and Search filters)
    const filtered = useMemo(() => {
         const q = debouncedSearch.toLowerCase();
         return allLogs.filter(l => {
             // A. Check Action Filter First (it's faster)
             if (actionFilter && l.action !== actionFilter) return false;
             
             // B. Check Search Filter
             if (!q) return true; // if no search term, keep the log
             
             return (
                l.performedBy?.studentId?.toLowerCase().includes(q) ||
                l.performedBy?.name?.toLowerCase().includes(q) ||
                l.target?.label?.toLowerCase().includes(q) ||
                l.target?.type?.toLowerCase().includes(q)
             );
         });
    }, [allLogs, actionFilter, debouncedSearch]);

    return (
        <div className="space-y-5 h-full flex flex-col">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search logs by ID, name, or target..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow shadow-sm"
                    />
                </div>
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                        value={actionFilter}
                        onChange={e => setActionFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl pl-8 pr-8 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm cursor-pointer"
                    >
                        <option value="">All Actions</option>
                        {ALL_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button 
                    onClick={fetchLogs} 
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm group"
                    title="Refresh Logs"
                >
                    <RefreshCw size={16} className={`transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                </button>
            </div>

            {/* Data Table Area */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 min-h-[400px]">
                    <Loader2 size={40} className="text-indigo-500 animate-spin mb-4" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Compiling System Logs...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 min-h-[400px] border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <Filter size={48} className="text-gray-300 mb-4" />
                    <p className="text-sm font-bold text-gray-500">No matching activities found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-50 backdrop-blur-sm z-10 border-b border-gray-200">
                            <tr>
                                {['Action', 'Performed By', 'Role', 'Target', 'Time', 'IP'].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(log => {
                                const style = ACTION_STYLES[log.action] || { color: 'text-gray-600', bg: 'bg-gray-100 border-gray-300' };
                                return (
                                    <tr key={log._id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border uppercase tracking-widest ${style.bg} ${style.color}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 font-mono text-indigo-600 whitespace-nowrap text-xs font-medium">
                                            {log.performedBy?.studentId || '—'}
                                            {log.performedBy?.name && <span className="text-gray-400 ml-1.5 font-sans text-xs">({log.performedBy.name})</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100">
                                                {log.performedBy?.role || '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-700 whitespace-nowrap text-xs font-medium">
                                            {log.target?.type && <span className="text-gray-400 mr-2 text-[10px] uppercase font-bold tracking-wider">[{log.target.type}]</span>}
                                            {log.target?.label || '—'}
                                        </td>
                                        <td className="px-5 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                                            {new Date(log.createdAt).toLocaleString(undefined, { 
                                                month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit', second:'2-digit' 
                                            })}
                                        </td>
                                        <td className="px-5 py-3 text-gray-400 font-mono text-xs group-hover:text-gray-600 transition-colors">
                                            {log.ip || '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Footer Summary */}
            <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Live Monitor
                </p>
                <p className="text-xs text-gray-400 font-mono">
                    <span className="font-bold text-gray-600">{filtered.length}</span> Records
                </p>
            </div>
        </div>
    );
};

export default ActivityLogsTab;