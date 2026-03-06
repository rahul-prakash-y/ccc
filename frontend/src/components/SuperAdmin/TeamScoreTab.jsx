import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Trophy, Medal, Search,
    ChevronRight, Info, AlertCircle, FileText, Loader2
} from 'lucide-react';
import { api } from '../../store/authStore';
import { SkeletonList } from '../Skeleton';
import toast from 'react-hot-toast';

const API = '/superadmin';

const TeamScoreTab = () => {
    const [teamScores, setTeamScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingTeamId, setDownloadingTeamId] = useState(null);

    const fetchScores = useCallback(async () => {
        try {
            const res = await api.get(`${API}/team-scores`);
            setTeamScores(res.data.data || []);
        } catch {
            toast.error("Failed to load team scores");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScores();
    }, [fetchScores]);

    const filteredScores = teamScores.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRankIcon = (index) => {
        if (index === 0) return <Trophy className="text-yellow-500" size={24} />;
        if (index === 1) return <Medal className="text-slate-400" size={22} />;
        if (index === 2) return <Medal className="text-amber-600" size={20} />;
        return <span className="text-slate-300 font-black text-sm">{index + 1}</span>;
    };

    const handleDownloadTeamReport = async (team) => {
        setDownloadingTeamId(team._id);
        try {
            const response = await api.get(`${API}/teams/${team._id}/report`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Team_Report_${team.name}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`${team.name} report downloaded`);
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download team report');
        } finally {
            setDownloadingTeamId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">League Standings</h2>
                    <p className="text-2xl font-black text-indigo-900 tracking-tight uppercase">Team Leaderboard</p>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all font-bold"
                    />
                </div>
            </div>

            {/* Note box */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <Info size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                <div>
                    <p className="text-xs font-bold text-indigo-900 uppercase tracking-tight">How scoring works</p>
                    <p className="text-xs text-indigo-700/70 font-medium">Team scores are the collective sum of all individual student scores within that team across all completed tests.</p>
                </div>
            </div>

            {loading ? (
                <SkeletonList count={5} />
            ) : filteredScores.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trophy size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No data yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium">Scores will appear here once teams are created and students complete assessments.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Rank</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Identity</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Squad Size</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aggregate Score</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredScores.map((team, idx) => (
                                <tr key={team._id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-center">
                                            {getRankIcon(idx)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                                                {team.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 uppercase tracking-tight text-sm">{team.name}</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {team.members?.slice(0, 3).map(m => (
                                                        <span key={m._id} className="text-[9px] text-slate-400 font-bold">{m.name}</span>
                                                    ))}
                                                    {team.members?.length > 3 && (
                                                        <span className="text-[9px] text-indigo-400 font-black">+{team.members.length - 3} MORE</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-slate-300" />
                                            <span className="text-sm font-black text-slate-600">{team.members?.length || 0}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="inline-flex flex-col items-end">
                                            <span className="text-2xl font-black text-indigo-600 tracking-tighter tabular-nums">
                                                {team.totalScore.toLocaleString()}
                                            </span>
                                            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Points</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <button
                                            onClick={() => handleDownloadTeamReport(team)}
                                            disabled={downloadingTeamId === team._id}
                                            className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-100 hover:border-indigo-100 group/btn active:scale-95 disabled:opacity-50"
                                            title="Download Team Report"
                                        >
                                            {downloadingTeamId === team._id ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <FileText size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TeamScoreTab;
