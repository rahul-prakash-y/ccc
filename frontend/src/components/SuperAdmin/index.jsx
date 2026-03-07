import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck, BookOpen, ClipboardList, LogOut,
  Activity, UserCog, Users, PlayCircle, ClipboardCheck, Trophy, UserCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useRoundStore } from '../../store/roundStore';
import { API } from './constants';

// Tab Components
import LiveOpsTab from './LiveOpsTab';
import ActivityLogsTab from './ActivityLogsTab';
import StudentManagerTab from './StudentManagerTab';
import AdminManagerTab from './AdminManagerTab';
import AuditLogsTab from './AuditLogsTab';
import QuestionBankTab from './QuestionBankTab';
import QuestionManagerTab from './QuestionManagerTab';
import EvaluationTab from './EvaluationTab';
import StudentScoreDashboard from './StudentScoreDashboard';
import TeamManagerTab from './TeamManagerTab';
import TeamScoreTab from './TeamScoreTab';
import AttendanceTab from './AttendanceTab';

const TABS = [
  { id: 'liveops', label: 'Live Operations', icon: PlayCircle },
  { id: 'activity', label: 'Activity Logs', icon: Activity },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'admins', label: 'Admins', icon: UserCog },
  { id: 'audit', label: 'Submission Audit', icon: ClipboardList },
  { id: 'question-bank', label: 'Question Bank', icon: BookOpen },
  { id: 'questions', label: 'Test Questions', icon: ClipboardCheck },
  { id: 'evaluations', label: 'Evaluations', icon: ClipboardCheck },
  { id: 'scores', label: 'Student Scores', icon: Trophy },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'team-scores', label: 'Team Leaderboard', icon: Trophy },
  { id: 'attendance', label: 'Attendance', icon: UserCheck },
];

const SuperAdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const { fetchRounds } = useRoundStore();
  const [activeTab, setActiveTab] = useState('liveops');

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  return (
    <div className=" bg-[#f8fafc] font-sans selection:bg-indigo-100 selection:text-indigo-700 overflow-hidden">
      {/* 1. GLASS-MORPHISM HEADER */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Identity Section */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-linear-to-tr from-indigo-600 to-violet-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative p-2 bg-white border border-slate-100 rounded-xl">
                <ShieldCheck size={20} className="text-indigo-600" />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-slate-900 text-[13px] sm:text-[15px] tracking-tight flex items-center gap-2">
                <span className="hidden xs:inline">Super Admin Panel</span>
                <span className="xs:hidden">Admin</span>
                <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-full border border-emerald-100 animate-pulse">
                  Live
                </span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold font-mono uppercase tracking-widest">
                {user?.studentId || "000-ADMIN"}
              </p>
            </div>
          </div>

          {/* Global Sign Out */}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg transition-all border border-slate-200 hover:border-red-100 active:scale-95"
          >
            <LogOut size={14} />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>

        {/* 2. TAB NAVIGATION (PILL STYLE) */}
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
                    ${isActive ? 'text-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  <Icon size={17} className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 3. MAIN CONTENT (STRICT HEIGHT) */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden"
            style={{ height: 'calc(100vh - 170px)' }} // Strict height control
          >
            {/* Scrollable Container */}
            <div className="h-full overflow-y-auto custom-scrollbar p-6">

              {/* Dynamic View Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sticky top-0 bg-white/95 backdrop-blur-md z-30 pb-2 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                    {React.createElement(TABS.find(t => t.id === activeTab)?.icon, { size: 14 })}
                  </div>
                  <h2 className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-[0.15em]">
                    {TABS.find(t => t.id === activeTab)?.label} Control
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                    Kernel: {activeTab}_v3.2
                  </span>
                </div>
              </div>

              {/* Component Injection */}
              <div className="relative text-slate-600">
                {activeTab === 'liveops' && <LiveOpsTab />}
                {activeTab === 'activity' && <ActivityLogsTab />}
                {activeTab === 'students' && <StudentManagerTab />}
                {activeTab === 'admins' && <AdminManagerTab />}
                {activeTab === 'audit' && <AuditLogsTab />}
                {activeTab === 'question-bank' && <QuestionBankTab />}
                {activeTab === 'questions' && <QuestionManagerTab />}
                {activeTab === 'evaluations' && <EvaluationTab />}
                {activeTab === 'scores' && <StudentScoreDashboard />}
                {activeTab === 'teams' && <TeamManagerTab />}
                {activeTab === 'team-scores' && <TeamScoreTab />}
                {activeTab === 'attendance' && <AttendanceTab />}
              </div>
            </div>

            {/* Bottom Gradient Overlay (Depth Indicator) */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none z-20" />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global CSS for the Custom Scrollbar */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
};

export default SuperAdminDashboard;