import React, { useState, useEffect } from 'react';
import { 
    Sparkles, Users, ClipboardCheck, CheckCircle2, Clock, PlayCircle
} from 'lucide-react';
import { useRoundStore } from '../../store/roundStore';
import EvaluationTab from './EvaluationTab';
import AttendanceTab from './AttendanceTab';
import QuestionManagerTab from './QuestionManagerTab';

const PracticeDashboardTab = () => {
    const [subTab, setSubTab] = useState('overview'); // 'overview', 'attendance', 'evaluations', 'questions'
    const { rounds, fetchRounds } = useRoundStore();

    const practiceRounds = (rounds || []).filter(r => r.type === 'PRACTICE');

    useEffect(() => {
        fetchRounds();
    }, [fetchRounds]);

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header / Sub-tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-200">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Practice Dashboard</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">Tutorial & Simulation Control</p>
                    </div>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shadow-inner border border-slate-200">
                    <button
                        onClick={() => setSubTab('overview')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'overview' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setSubTab('attendance')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'attendance' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Attendance
                    </button>
                    <button
                        onClick={() => setSubTab('evaluations')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'evaluations' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Evaluations
                    </button>
                    <button
                        onClick={() => setSubTab('questions')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'questions' ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Questions
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {subTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stats Cards */}
                        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 text-amber-100 group-hover:text-amber-200 transition-colors">
                                    <Users size={48} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Practice Rounds</p>
                                <p className="text-3xl font-black text-slate-900 mt-2 relative z-10">{practiceRounds.length}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 text-indigo-100 group-hover:text-indigo-200 transition-colors">
                                    <ClipboardCheck size={48} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Active Simulation</p>
                                <p className="text-lg font-bold text-slate-700 mt-2 relative z-10 truncate">
                                    {practiceRounds.find(r => r.status === 'RUNNING')?.name || 'None Active'}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 text-emerald-100 group-hover:text-emerald-200 transition-colors">
                                    <CheckCircle2 size={48} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">System Status</p>
                                <p className="text-lg font-bold text-emerald-600 mt-2 relative z-10 uppercase tracking-tighter">Ready for Deployment</p>
                            </div>
                        </div>

                        {/* Round List */}
                        <div className="md:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Configured Practice Environments</h4>
                                <span className="px-2 py-1 bg-amber-50 rounded-lg text-[9px] font-black text-amber-600 border border-amber-100 uppercase tracking-tighter">
                                    Total: {practiceRounds.length}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Environment Name</th>
                                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {practiceRounds.map(r => (
                                            <tr key={r._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                                                            <PlayCircle size={16} />
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-900">{r.name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Clock size={12} />
                                                        <span className="text-[11px] font-bold">{r.testDurationMinutes || r.durationMinutes}m</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border ${
                                                        r.status === 'RUNNING' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                        r.status === 'COMPLETED' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                        'bg-slate-50 text-slate-400 border-slate-200'
                                                    }`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => setSubTab('attendance')}
                                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 hover:underline tracking-tighter transition-colors"
                                                    >
                                                        VIEW ATTENDANCE
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {practiceRounds.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-slate-400 text-xs italic">
                                                    No practice rounds configured. Head to Live Operations to initialize one.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {subTab === 'attendance' && (
                    <div className="h-full">
                         <AttendanceTab forcePractice={true} />
                    </div>
                )}

                {subTab === 'evaluations' && (
                    <div className="h-full">
                        <EvaluationTab forceType="PRACTICE" />
                    </div>
                )}

                {subTab === 'questions' && (
                    <div className="h-full">
                        <QuestionManagerTab forcePractice={true} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PracticeDashboardTab;
