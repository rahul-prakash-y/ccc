import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    Activity, BookOpen, CheckCircle, Clock, 
    Code, TrendingUp, Zap, ChevronRight, 
    Calendar, Trophy, Target, Globe, 
    BrainCircuit, Star, BarChart3, Loader2,
    CheckCircle2, Circle, ShieldAlert
} from 'lucide-react';
import { api } from '../store/authStore';
import { formatFullIST } from '../utils/dateUtils';

const PracticeDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/rounds/practice-summary');
                setStats(res.data.data);
            } catch (e) {
                console.error('Failed to fetch stats:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Calibrating Practice Matrix...</p>
                </div>
            </div>
        );
    }

    const { solved, categories, recentActivity, heatmap } = stats || {
        solved: { EASY: 0, MEDIUM: 0, HARD: 0, total: 0 },
        categories: {},
        recentActivity: [],
        heatmap: {}
    };

    // Helper for circular progress
    // Simple Heatmap logic
    const days = 30; // Last 30 days
    const heatCells = Array.from({ length: days }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const dateStr = d.toISOString().split('T')[0];
        const count = heatmap[dateStr] || 0;
        return { date: dateStr, count };
    });

    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
            {/* Header Section */}
            <header>
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Practice <span className="text-indigo-600">Protocol</span></h1>
                        <p className="text-slate-500 text-sm font-medium">Neural synchronization analysis for practice deployments.</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Solved Stats - Left Column (3/12) */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <Code size={120} />
                        </div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Questions Solved</h3>
                        
                        <div className="flex items-center gap-10">
                            {/* Circle Progress Concept */}
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="url(#gradient)" strokeWidth="12" 
                                            strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (solved.total / 100))} strokeLinecap="round" />
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#4f46e5" />
                                            <stop offset="100%" stopColor="#9333ea" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-black text-slate-900 leading-none">{solved.total}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total</span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <DifficultyRow label="Easy" count={solved.EASY} color="text-emerald-500" bg="bg-emerald-500" />
                                <DifficultyRow label="Medium" count={solved.MEDIUM} color="text-amber-500" bg="bg-amber-500" />
                                <DifficultyRow label="Hard" count={solved.HARD} color="text-red-500" bg="bg-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* Skill Breakdown */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Skill Breakdown</h3>
                        <div className="space-y-6">
                            {Object.entries(categories).length > 0 ? (
                                Object.entries(categories).map(([cat, count]) => (
                                    <div key={cat} className="space-y-2">
                                        <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                                            <span className="text-slate-700">{cat}</span>
                                            <span className="text-indigo-600">{count} Solved</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, (count / 10) * 100)}%` }}
                                                className="h-full bg-linear-to-r from-indigo-500 to-violet-500"
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 italic">No skill data available yet.</p>
                            )}
                        </div>
                    </div>

                    {/* LeetCode-style Badges Section */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative group">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Achievements</h3>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                {Object.keys(heatmap).length > 0 ? "Daily Streak Active" : "Start Journey"}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Pioneer Badge */}
                            <BadgeItem 
                                icon={Trophy} 
                                label="Pioneer" 
                                active={solved.total >= 1} 
                                color="from-amber-400 to-orange-500"
                                shadow="shadow-orange-200/50"
                                description="First solve completed"
                            />
                            {/* Specialist Badge */}
                            <BadgeItem 
                                icon={Target} 
                                label="Specialist" 
                                active={solved.total >= 10} 
                                color="from-indigo-400 to-blue-600"
                                shadow="shadow-indigo-200/50"
                                description="10 problems solved"
                            />
                            {/* Daily Warrior */}
                            <BadgeItem 
                                icon={Zap} 
                                label="Warrior" 
                                active={Object.keys(heatmap).length >= 1} 
                                color="from-emerald-400 to-teal-600"
                                shadow="shadow-emerald-200/50"
                                description="Active practice today"
                            />
                             {/* Hard Core */}
                             <BadgeItem 
                                icon={ShieldAlert} 
                                label="Hardcore" 
                                active={solved.HARD > 0} 
                                color="from-rose-400 to-red-600"
                                shadow="shadow-red-200/50"
                                description="Conquered a hard task"
                            />
                             {/* Consistent */}
                             <BadgeItem 
                                icon={Star} 
                                label="Reliable" 
                                active={recentActivity.length >= 3} 
                                color="from-violet-400 to-purple-600"
                                shadow="shadow-purple-200/50"
                                description="3+ recent sessions"
                            />
                             {/* Analyst */}
                             <BadgeItem 
                                icon={BrainCircuit} 
                                label="Analyst" 
                                active={Object.keys(categories).length >= 2} 
                                color="from-cyan-400 to-cyan-700"
                                shadow="shadow-cyan-200/50"
                                description="Mastered 2+ tags"
                            />
                        </div>
                    </div>
                </div>

                {/* Heatmap & History - Right Column (8/12) */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Submission Heatmap */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Submission Activity (Last 30 Days)</h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                                Less <div className="w-2.5 h-2.5 bg-slate-100 rounded-[2px]" />
                                <div className="w-2.5 h-2.5 bg-indigo-200 rounded-[2px]" />
                                <div className="w-2.5 h-2.5 bg-indigo-400 rounded-[2px]" />
                                <div className="w-2.5 h-2.5 bg-indigo-600 rounded-[2px]" /> More
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {heatCells.map((cell, i) => (
                                <motion.div
                                    key={cell.date}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.01 }}
                                    className={`w-[22px] h-[22px] rounded-[4px] cursor-help transition-all hover:ring-2 hover:ring-indigo-300
                                        ${cell.count === 0 ? 'bg-slate-50 border border-slate-100' : 
                                          cell.count === 1 ? 'bg-indigo-100' : 
                                          cell.count === 2 ? 'bg-indigo-300' : 
                                          'bg-indigo-600'}`}
                                    title={`${cell.count} practices on ${cell.date}`}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Today - 30 Days</span>
                            <span>Today</span>
                        </div>
                    </div>

                    {/* Recent Sessions */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Deployments</h3>
                            <button className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                                    <tr>
                                        <th className="px-8 py-4">Status</th>
                                        <th className="px-4 py-4">Assessment</th>
                                        <th className="px-4 py-4">Date</th>
                                        <th className="px-4 py-4">Performance</th>
                                        <th className="px-8 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentActivity.length > 0 ? (
                                        recentActivity.map((act, i) => (
                                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Completed</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-6">
                                                    <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{act.roundName}</p>
                                                </td>
                                                <td className="px-4 py-6 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                    {act.date ? formatFullIST(act.date) : 'N/A'}
                                                </td>
                                                <td className="px-4 py-6">
                                                    <span className="text-sm font-black text-slate-700">{act.score} pts</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <button className="p-2 hover:bg-white hover:text-indigo-600 rounded-lg transition-all border border-transparent hover:border-indigo-100 text-slate-400 group/btn">
                                                        <ChevronRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-12 text-center text-slate-400 italic text-sm font-medium">
                                                No practice history detected. Start your first session from the dashboard.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DifficultyRow = ({ label, count, color, bg }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
            <span className={color}>{label}</span>
            <span className="text-slate-900">{count}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className={`h-full ${bg} opacity-80`} style={{ width: `${Math.min(100, (count / 20) * 100)}%` }} />
        </div>
    </div>
);

const BadgeItem = ({ icon: BadgeIcon, label, active, color, shadow, description }) => (
    <div className="flex flex-col items-center gap-2 group/badge">
        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 
            ${active 
                ? `bg-linear-to-br ${color} ${shadow} shadow-lg scale-100 hover:scale-110 active:scale-95 cursor-default` 
                : 'bg-slate-50 border border-slate-100 grayscale opacity-40 scale-90 select-none'}`}>
            {active && (
                <div className="absolute inset-0 bg-linear-to-tr from-white/20 to-transparent" />
            )}
            <BadgeIcon size={24} className={active ? 'text-white drop-shadow-md' : 'text-slate-400'} />
        </div>
        <div className="text-center overflow-hidden w-full">
            <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${active ? 'text-slate-900' : 'text-slate-400 font-bold'}`}>{label}</p>
            {active && (
                <motion.p 
                    initial={{ y: 5, opacity: 0 }}
                    whileHover={{ y: 0, opacity: 1 }}
                    className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-1 truncate px-1"
                >
                    {description}
                </motion.p>
            )}
        </div>
    </div>
);

export default PracticeDashboard;
