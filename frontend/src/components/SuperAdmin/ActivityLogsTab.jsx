import React, { useState, useEffect } from 'react';
import { Filter, Search, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { API, ACTION_STYLES, ALL_ACTIONS } from './constants';
import Pagination from './components/Pagination';
import { useActivityStore } from '../../store/activityStore';
import { SkeletonRow } from '../Skeleton';

const ActivityLogsTab = () => {
    // 1. Global Store State
    const { logs, loading, pagination, fetchLogs } = useActivityStore();

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    // 2. Filter States
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    // Unified Fetch Effect: Fetch logs and reset page when filters change
    useEffect(() => {
        // Reset page to 1 if filters change (this will trigger the next effect)
        setPage(1);
    }, [actionFilter, debouncedSearch, limit]);

    useEffect(() => {
        const params = { page, limit };
        if (actionFilter) params.action = actionFilter;
        if (debouncedSearch) params.search = debouncedSearch;
        fetchLogs(params);
    }, [page, limit, actionFilter, debouncedSearch, fetchLogs]);

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
                    onClick={() => {
                        const params = { page, limit };
                        if (actionFilter) params.action = actionFilter;
                        if (debouncedSearch) params.search = debouncedSearch;
                        fetchLogs(params, true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm group"
                    title="Refresh Logs"
                >
                    <RefreshCw size={16} className={`transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                </button>
            </div>

            {/* Data Table Area */}
            {loading ? (
                <div className="py-4">
                    <SkeletonRow count={10} />
                </div>
            ) : logs.length === 0 ? (
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
                            {logs.map(log => {
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
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
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

            {/* Pagination & Footer Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-center px-2 py-2 gap-4 border-t border-gray-100 mt-2">
                <span className="text-gray-500 font-mono hidden sm:inline">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.totalRecords)} of {pagination.totalRecords} Records
                </span>
                <Pagination
                    currentPage={page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                    totalRecords={pagination.totalRecords}
                    limit={limit}
                    onLimitChange={setLimit}
                    showLimitSelection={true}
                />
            </div>
        </div>
    );
};

export default ActivityLogsTab;
