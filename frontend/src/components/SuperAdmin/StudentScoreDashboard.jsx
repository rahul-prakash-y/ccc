import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    User, BarChart2, Calendar, Medal, RefreshCw,
    ShieldCheck, ShieldX, UserPlus, UserMinus,
    Trophy, Loader2, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../../store/authStore';
import { useRoundStore } from '../../store/roundStore';
import { API } from './constants';
import Pagination from './components/Pagination';
import { SkeletonList } from '../Skeleton';

// ─── Rank medal helper ────────────────────────────────────────────────────────
const RankBadge = ({ rank }) => {
    if (rank === 1) return <span className="text-lg">🥇</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return (
        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-[11px] font-black flex items-center justify-center">
            {rank}
        </span>
    );
};

// ─── Day-wise score row ───────────────────────────────────────────────────────
const DayWiseTable = ({ dayWise }) => {
    if (!dayWise || dayWise.length === 0) {
        return <p className="text-xs text-slate-400 italic py-2">No day-wise data available.</p>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="text-left text-[9px] font-black text-slate-400 uppercase tracking-widest py-1.5 pr-4">
                            <Calendar size={9} className="inline mr-1" />Date
                        </th>
                        <th className="text-right text-[9px] font-black text-slate-400 uppercase tracking-widest py-1.5">Score</th>
                    </tr>
                </thead>
                <tbody>
                    {dayWise.map(({ date, score }) => (
                        <tr key={date} className="border-b border-slate-50 last:border-0">
                            <td className="py-1.5 pr-4 font-mono text-slate-600">{date}</td>
                            <td className="py-1.5 text-right font-bold text-indigo-600">{score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Round score pills ────────────────────────────────────────────────────────
const RoundPills = ({ rounds }) => (
    <div className="flex flex-wrap gap-1.5 mt-1">
        {rounds.map((r, i) => (
            <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-700"
            >
                {r.roundName}: <span className="text-indigo-900 font-black">{r.score}</span>
            </span>
        ))}
    </div>
);

// ─── Single student row (expandable) ─────────────────────────────────────────
const StudentRow = ({ entry, maxScore, selectedRound, onToggleAllow, updatingEligibility }) => {
    const [expanded, setExpanded] = useState(false);
    const pct = maxScore > 0 ? Math.min((entry.totalScore / maxScore) * 100, 100) : 0;

    const isWhitelisted = selectedRound?.allowedStudentIds?.includes(entry.student?._id);
    const isTopRank = selectedRound?.maxParticipants ? entry.rank <= selectedRound.maxParticipants : true;
    const isEligible = isWhitelisted || isTopRank;

    return (
        <div className={`border rounded-2xl overflow-hidden transition-all ${entry.rank === 1 ? 'border-amber-200 bg-amber-50/30' :
            entry.rank === 2 ? 'border-slate-200 bg-slate-50/30' :
                entry.rank === 3 ? 'border-orange-200 bg-orange-50/20' :
                    'border-slate-100 bg-white'
            }`}>
            {/* Summary row */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/60 transition-colors"
            >
                {/* Rank */}
                <div className="shrink-0 w-8 flex items-center justify-center">
                    <RankBadge rank={entry.rank} />
                </div>

                {/* Student info */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <User size={14} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{entry.student?.name || '—'}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{entry.student?.studentId}</p>
                    </div>
                </div>

                {/* Progress bar + score */}
                <div className="hidden sm:flex flex-col gap-1 min-w-[140px]">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Score</span>
                        <span className="text-sm font-black text-slate-900">{entry.totalScore}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${entry.rank === 1 ? 'bg-amber-400' :
                                entry.rank === 2 ? 'bg-slate-400' :
                                    entry.rank === 3 ? 'bg-orange-400' :
                                        'bg-indigo-400'
                                }`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>

                {/* Mobile score */}
                <span className="sm:hidden font-black text-slate-900 text-sm shrink-0">{entry.totalScore} pts</span>

                {expanded
                    ? <ChevronUp size={15} className="text-slate-400 shrink-0" />
                    : <ChevronDown size={15} className="text-slate-400 shrink-0" />
                }
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-slate-100"
                    >
                        <div className="p-4 grid sm:grid-cols-2 gap-4 bg-slate-50/40">
                            {/* Section breakdown */}
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <BarChart2 size={9} /> Score by Section
                                </p>
                                {entry.rounds.length > 0
                                    ? <RoundPills rounds={entry.rounds} />
                                    : <p className="text-xs text-slate-400 italic">No section scores yet.</p>
                                }
                            </div>

                            {/* Day-wise breakdown */}
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Calendar size={9} /> Day-wise Score
                                </p>
                                <DayWiseTable dayWise={entry.dayWise} />
                            </div>

                            {/* Eligibility Management */}
                            {selectedRound && (
                                <div className="sm:col-span-2 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${isEligible ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {isEligible ? <ShieldCheck size={18} /> : <ShieldX size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Participation Status</p>
                                            <p className="text-sm font-bold text-slate-800">
                                                {isEligible ? 'Eligible for Participation' : 'Currently Restricted (Rank Too Low)'}
                                                {isWhitelisted && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">ADMIN WHITELIST</span>}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleAllow(entry.student?._id, isWhitelisted); }}
                                        disabled={updatingEligibility}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${isWhitelisted
                                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                                            } disabled:opacity-50`}
                                    >
                                        {updatingEligibility ? <Loader2 size={14} className="animate-spin" /> : (isWhitelisted ? <UserMinus size={14} /> : <UserPlus size={14} />)}
                                        {isWhitelisted ? 'REVOKE ACCESS' : 'MANUAL ALLOW'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Main component ────────────────────────────────────────────────────────────
const StudentScoreDashboard = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination & Search States
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pagination, setPagination] = useState({ totalPages: 1, totalRecords: 0 });

    // Participation Management
    const { rounds, fetchRounds } = useRoundStore();
    const [selectedRoundId, setSelectedRoundId] = useState('');
    const [updatingEligibility, setUpdatingEligibility] = useState(false);

    const fetchScores = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('page', page);
            params.append('limit', limit);

            const res = await api.get(`${API}/student-scores?${params.toString()}`);
            setData(res.data.data || []);
            setPagination(res.data.pagination || { totalPages: 1, totalRecords: 0 });
        } catch (err) {
            console.error('Failed to load student scores:', err);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [search, page, limit]);

    // Reset page on search
    useEffect(() => {
        setPage(1);
    }, [search]);

    // Initial mount logic
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([
                fetchScores(true),
                fetchRounds()
            ]);
            setLoading(false);
        };
        init();
    }, [fetchRounds, fetchScores]);

    const handleToggleAllow = async (studentId, isCurrentlyWhitelisted) => {
        if (!selectedRoundId) return;
        setUpdatingEligibility(true);
        try {
            const endpoint = isCurrentlyWhitelisted ? 'disallow-student' : 'allow-student';
            await api.post(`${API}/rounds/${selectedRoundId}/${endpoint}`, { studentId });
            // Refresh rounds to get updated whitelists
            await fetchRounds();
        } catch (e) {
            console.error("Failed to update student eligibility:", e);
        } finally {
            setUpdatingEligibility(false);
        }
    };

    const activeRound = rounds.find(r => r._id === selectedRoundId);

    const maxScore = data.length > 0 ? data[0].totalScore : 1;
    const totalStudents = pagination.totalRecords;
    const evaluated = data.filter(e => e.totalScore > 0).length; // This is only for the current page, which might be slightly misleading if we want global evaluated count, but let's stick to what's visible or what the API provides if it provides stats.

    return (
        <div className="space-y-4 h-full flex flex-col">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-linear-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                        <Trophy size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">Student Score Dashboard</p>
                        <p className="text-xs text-indigo-500 mt-0.5">
                            {loading ? 'Loading...' : `${evaluated} of ${totalStudents} students evaluated`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Round Selector */}
                    <div className="hidden md:flex items-center gap-2 mr-4">
                        <ShieldCheck size={14} className="text-indigo-400" />
                        <select
                            className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                            value={selectedRoundId}
                            onChange={(e) => setSelectedRoundId(e.target.value)}
                        >
                            <option value="">Participation Manager (All)</option>
                            {rounds.map(r => (
                                <option key={r._id} value={r._id}>
                                    {r.name} {r.maxParticipants ? `(Limit: Top ${r.maxParticipants})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="px-3 py-2 text-xs font-bold bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/40 w-44 placeholder:text-slate-300"
                    />
                    <button
                        onClick={fetchScores}
                        disabled={loading}
                        className="p-2 rounded-xl bg-white border border-indigo-200 text-indigo-500 hover:bg-indigo-50 transition-all disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 pb-4">
                {loading ? (
                    <div className="py-4">
                        <SkeletonList count={8} />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 rounded-2xl">
                        <Medal size={48} className="text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-500">
                            {search ? 'No students match your search.' : 'No evaluated submissions yet.'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                            Scores appear here for auto-graded MCQ tests or after admins manually grade submissions in the Evaluations tab.
                        </p>
                    </div>
                ) : (
                    data.map(entry => (
                        <StudentRow
                            key={entry.student?._id}
                            entry={entry}
                            maxScore={maxScore}
                            selectedRound={activeRound}
                            onToggleAllow={handleToggleAllow}
                            updatingEligibility={updatingEligibility}
                        />
                    ))
                )}
            </div>

            <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                totalRecords={pagination.totalRecords}
                limit={limit}
            />
        </div>
    );
};

export default StudentScoreDashboard;
