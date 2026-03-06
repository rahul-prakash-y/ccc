import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, BookOpen, LogOut, Users, PlayCircle, ClipboardCheck, Trophy, ClipboardList, UserCog } from 'lucide-react';
import { api, useAuthStore } from '../../store/authStore';
import { API } from '../SuperAdmin/constants';
import { AnimatePresence, motion } from 'framer-motion';

// Tab Components
import LiveOpsTab from '../SuperAdmin/LiveOpsTab';
import StudentManagerTab from '../SuperAdmin/StudentManagerTab';
import QuestionManagerTab from '../SuperAdmin/QuestionManagerTab';
import EvaluationTab from '../SuperAdmin/EvaluationTab';
import StudentScoreDashboard from '../SuperAdmin/StudentScoreDashboard';
import AuditLogsTab from '../SuperAdmin/AuditLogsTab';
import TeamManagerTab from '../SuperAdmin/TeamManagerTab';
import TeamScoreTab from '../SuperAdmin/TeamScoreTab';
import AdminManagerTab from '../SuperAdmin/AdminManagerTab';

const TABS = [
    { id: 'liveops', label: 'Live Operations', icon: PlayCircle },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'admins', label: 'Admins', icon: UserCog },
    { id: 'questions', label: 'Questions', icon: BookOpen },
    { id: 'evaluations', label: 'Evaluations', icon: ClipboardCheck },
    { id: 'scores', label: 'Student Scores', icon: Trophy },
    { id: 'audit', label: 'Submission Audit', icon: ClipboardList },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'team-scores', label: 'Team Leaderboard', icon: Trophy },
];

const AdminDashboard = () => {
    const { user, logout } = useAuthStore();
    const [activeTab, setActiveTab] = useState('liveops');
    const [rounds, setRounds] = useState([]);

    const fetchRounds = useCallback(async () => {
        try {
            const res = await api.get(`${API}/rounds`);
            setRounds(res.data.data || []);
        } catch (e) {
            console.error("Failed to fetch rounds for admin:", e);
        }
    }, []);

    useEffect(() => {
        fetchRounds();
        // Light polling to keep the round states fresh for the Question Manager & Live Ops
        const t = setInterval(fetchRounds, 30000);
        return () => clearInterval(t);
    }, [fetchRounds]);

    return (
        <div className=" bg-[#f8fafc] font-sans selection:bg-rose-100 selection:text-rose-700 overflow-hidden">
            {/* 1. GLASS-MORPHISM HEADER (Admin Variant) */}
            <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    {/* Identity Section */}
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-linear-to-tr from-rose-500 to-orange-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                            <div className="relative p-2.5 bg-white border border-slate-100 rounded-xl">
                                <ShieldCheck size={22} className="text-rose-600" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="font-bold text-slate-900 text-[15px] tracking-tight flex items-center gap-2">
                                Admin Control
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-wider rounded-full border border-rose-100">
                                    Level 1
                                </span>
                            </h1>
                            <p className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-widest">
                                ID: {user?.studentId || "UNKNOWN"}
                            </p>
                        </div>
                    </div>

                    {/* Global Sign Out */}
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg transition-all border border-slate-200 hover:border-red-100 active:scale-95"
                    >
                        <LogOut size={14} />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>

                {/* 2. TAB NAVIGATION (Rose Theme) */}
                <div className="max-w-7xl mx-auto px-6">
                    <nav className="flex gap-1 overflow-x-auto no-scrollbar border-t border-slate-100/60 py-1">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex items-center gap-2.5 px-5 py-3 text-[13px] font-bold transition-all rounded-lg whitespace-nowrap group
                                        ${isActive ? 'text-rose-600 bg-rose-50/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                                >
                                    <Icon size={17} className={isActive ? "text-rose-600" : "text-slate-400 group-hover:text-slate-600"} />
                                    {tab.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="adminTabUnderline"
                                            className="absolute bottom-0 left-2 right-2 h-0.5 bg-rose-600 rounded-full"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </header>

            {/* 3. MAIN CONTENT (STRICT HEIGHT CONTROL) */}
            <main className="max-w-7xl mx-auto px-6 py-6 ">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden"
                        style={{ height: 'calc(100vh - 170px)' }}
                    >
                        {/* Scrollable Container matching SuperAdmin constraints */}
                        <div className="h-full overflow-y-auto custom-scrollbar p-6">

                            {/* Dynamic View Header */}
                            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/95 backdrop-blur-md z-30 pb-2 border-b border-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-rose-600 rounded-lg text-white">
                                        {React.createElement(TABS.find(t => t.id === activeTab)?.icon, { size: 14 })}
                                    </div>
                                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">
                                        {TABS.find(t => t.id === activeTab)?.label}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                                        Module Active
                                    </span>
                                </div>
                            </div>

                            {/* Component Injection */}
                            <div className="relative text-slate-600 h-full">
                                {activeTab === 'liveops' && <LiveOpsTab />}
                                {activeTab === 'students' && <StudentManagerTab />}
                                {activeTab === 'admins' && <AdminManagerTab />}
                                {activeTab === 'questions' && <QuestionManagerTab rounds={rounds} />}
                                {activeTab === 'evaluations' && <EvaluationTab />}
                                {activeTab === 'scores' && <StudentScoreDashboard />}
                                {activeTab === 'audit' && <AuditLogsTab rounds={rounds} />}
                                {activeTab === 'teams' && <TeamManagerTab />}
                                {activeTab === 'team-scores' && <TeamScoreTab />}
                            </div>
                        </div>

                        {/* Bottom Gradient Overlay (Depth Indicator) */}
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none z-20" />
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Global CSS for Custom Scrollbar (Ensures consistency if not declared globally) */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}} />
        </div>
    );
};

export default AdminDashboard;