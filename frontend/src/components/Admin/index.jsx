import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, BookOpen, LogOut, Users, PlayCircle, ClipboardCheck, Trophy, ClipboardList, UserCog, UserCheck, Power } from 'lucide-react';
import { api, useAuthStore } from '../../store/authStore';
import { API } from '../SuperAdmin/constants';
import { AnimatePresence, motion } from 'framer-motion';

// Tab Components
import LiveOpsTab from '../SuperAdmin/LiveOpsTab';
import StudentManagerTab from '../SuperAdmin/StudentManagerTab';
import QuestionManagerTab from '../SuperAdmin/QuestionManagerTab';
import EvaluationTab from '../SuperAdmin/EvaluationTab';
import TeamManagerTab from '../SuperAdmin/TeamManagerTab';
import AttendanceTab from "../SuperAdmin/AttendanceTab";
import QuestionBankTab from '../SuperAdmin/QuestionBankTab';

const TABS = [
    { id: 'liveops', label: 'Live Operations', icon: PlayCircle },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'question-bank', label: 'Question Bank', icon: BookOpen },
    { id: 'questions', label: 'Questions', icon: BookOpen },
    { id: 'evaluations', label: 'Evaluations', icon: ClipboardCheck },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: UserCheck },
];

const AdminDashboard = () => {
    const { user, logout } = useAuthStore();
    const [activeTab, setActiveTab] = useState('liveops');
    const [rounds, setRounds] = useState([]);

    // Tooltip State
    const [hoveredTab, setHoveredTab] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const tooltipRef = useRef(null);

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
        const t = setInterval(fetchRounds, 30000);
        return () => clearInterval(t);
    }, [fetchRounds]);

    const handleMouseEnter = (e, tabId) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({
            top: rect.top + rect.height / 2,
            left: rect.right + 12
        });
        setHoveredTab(tabId);
    };

    const handleMouseLeave = () => {
        setHoveredTab(null);
    };

    return (
        <div className="flex h-screen bg-[#f8fafc] font-sans selection:bg-rose-100 selection:text-rose-700 overflow-hidden">

            {/* 1. VERTICAL SIDEBAR (Admin Variant - Rose Theme) */}
            <aside className="w-[80px] shrink-0 bg-white border-r border-slate-200/60 flex flex-col items-center py-6 shadow-sm z-40 relative">

                {/* Identity Logo */}
                <div className="mb-8 relative group">
                    <div className="absolute -inset-2 bg-linear-to-tr from-rose-500 to-orange-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                    <div className="relative p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <ShieldCheck size={24} className="text-rose-600" />
                    </div>
                </div>

                {/* Central Icon Navigation Scroll Area */}
                <nav className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-2 px-2 pb-4">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                onMouseEnter={(e) => handleMouseEnter(e, tab.id)}
                                onMouseLeave={handleMouseLeave}
                                className={`relative w-full aspect-square flex items-center justify-center rounded-xl transition-all group
                                    ${isActive ? 'bg-rose-50' : 'hover:bg-slate-50'}`}
                            >
                                {/* Active Indicator Bar (Left Edge) */}
                                {isActive && (
                                    <motion.div
                                        layoutId="adminSidebarActiveIndicator"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-rose-600 rounded-r-full"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}

                                {/* Icon handling */}
                                <Icon
                                    size={20}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`transition-colors duration-300 ${isActive ? "text-rose-600" : "text-slate-400 group-hover:text-slate-700"}`}
                                />
                            </button>
                        );
                    })}
                </nav>

                {/* Global Sign Out Button */}
                <div className="mt-auto px-2 w-full pt-4 border-t border-slate-100 shrink-0">
                    <button
                        onClick={logout}
                        title="Sign Out"
                        className="w-full aspect-square flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
                    >
                        <Power size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform duration-300" />
                    </button>
                </div>
            </aside>

            {/* 1.5. FIXED GLOBAL TOOLTIP (Detached from Sidebar Overflow) */}
            <AnimatePresence>
                {hoveredTab && (
                    <motion.div
                        ref={tooltipRef}
                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -5, scale: 0.95, transition: { duration: 0.1 } }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        style={{
                            position: 'fixed',
                            top: tooltipPos.top,
                            left: tooltipPos.left,
                            y: '-50%', // Centers the tooltip exactly on the recorded 'top' coordinate
                            zIndex: 9999, // Ensure it sits above absolutely everything
                            pointerEvents: 'none' // Tooltip shouldn't intercept mouse events
                        }}
                        className="flex items-center"
                    >
                        {/* The Tooltip Bubble (Light Theme - Admin Variant) */}
                        <div className="relative bg-white border border-slate-200/80 shadow-lg px-4 py-2.5 rounded-xl flex items-center gap-3">
                            <span className="text-[13px] font-bold text-slate-700 tracking-wide whitespace-nowrap">
                                {TABS.find(t => t.id === hoveredTab)?.label}
                            </span>
                            <div className="opacity-40 text-rose-600">
                                {React.createElement(TABS.find(t => t.id === hoveredTab)?.icon, { size: 14 })}
                            </div>

                            {/* Tooltip Chevron (Left side) */}
                            <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-slate-200/80 rotate-45 rounded-sm"></div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. MAIN CONTENT (Flexible Width) */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] h-full relative p-2 sm:p-4 md:p-6 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col"
                    >
                        {/* Dynamic View Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm z-30 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-rose-600 rounded-lg text-white shadow-xs shadow-rose-200">
                                    {React.createElement(TABS.find(t => t.id === activeTab)?.icon, { size: 16 })}
                                </div>
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-[0.15em]">
                                    {TABS.find(t => t.id === activeTab)?.label}
                                </h2>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex flex-col text-right">
                                    <p className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-widest leading-none mb-1">
                                        ID: {user?.studentId || "UNKNOWN"}
                                    </p>
                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-tighter leading-none">
                                        Level 1 Control Active
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Component Injection Scroll Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                            {/* Component Injection */}
                            <div className="relative text-slate-600 h-full">
                                {activeTab === 'liveops' && <LiveOpsTab />}
                                {activeTab === 'students' && <StudentManagerTab />}
                                {activeTab === 'question-bank' && <QuestionBankTab />}
                                {activeTab === 'questions' && <QuestionManagerTab rounds={rounds} />}
                                {activeTab === 'evaluations' && <EvaluationTab />}
                                {activeTab === 'teams' && <TeamManagerTab />}
                                {activeTab === 'attendance' && <AttendanceTab />}
                            </div>

                            {/* Bottom Gradient Overlay (Depth Indicator) */}
                            <div className="fixed bottom-6 left-[80px] right-6 h-8 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none z-20 rounded-b-2xl" />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Global CSS for Custom Scrollbar */}
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