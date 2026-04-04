import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck, BookOpen, ClipboardList, LogOut,
  Activity, UserCog, Users, PlayCircle, ClipboardCheck, Trophy, UserCheck,
  Power, PieChart, Server, Award, Play
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import AdminContributionsTab from './AdminContributionsTab';
import ServerAllocationTab from './ServerAllocationTab';
import CertificateManager from './CertificateManager';
import SystemHealthTab from './SystemHealthTab';
import DatabaseManagerTab from './DatabaseManagerTab';


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
  { id: 'admin-contributions', label: 'Admin Contributions', icon: PieChart },
  { id: 'server-allocation', label: 'Server Allocation', icon: Server },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'health', label: 'System Health', icon: Activity },
  { id: 'database', label: 'Database Manager', icon: Server, roles: ['SUPER_MASTER'] },
];

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { fetchRounds } = useRoundStore();
  const [activeTab, setActiveTab] = useState('liveops');
  const [hoveredTab, setHoveredTab] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e, tabId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + 12 });
    setHoveredTab(tabId);
  };

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  return (
    <div className="bg-[#f8fafc] font-sans selection:bg-indigo-100 selection:text-indigo-700 h-screen flex flex-col overflow-hidden">
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

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Practice Test Button */}
            <button
               onClick={() => {
                 const { rounds } = useRoundStore.getState();
                 const practiceRound = rounds.find(r => r.type === 'PRACTICE' && (r.status === 'RUNNING' || r.status === 'WAITING_FOR_OTP'));
                 if (practiceRound) {
                   navigate(`/arena/${practiceRound._id}`);
                 } else {
                   alert("No active Practice Test available at the moment. Please create one in Live Operations first.");
                 }
               }}
               className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#f59e0b] bg-[#fef3c7] border border-[#fde68a] rounded-lg hover:bg-[#f59e0b] hover:text-white transition-all active:scale-95 shadow-sm"
            >
               <Play size={14} />
               <span className="hidden sm:inline">Practice Test</span>
               <span className="inline sm:hidden">Practice</span>
            </button>

          {/* Global Sign Out */}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg transition-all border border-slate-200 hover:border-red-100 active:scale-95"
          >
            <Power size={14} />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
          </div>
        </div>

      </header>

      {/* MAIN LAYOUT WRAPPER (Sidebar + Content) */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-61px)]">

        {/* 2. SIDEBAR NAVIGATION (ICONS WITH TOOLTIPS) */}
        <aside className="w-16 sm:w-20 bg-white border-r border-slate-200/60 flex flex-col items-center py-4 gap-2 z-30 shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] overflow-y-auto no-scrollbar">
          {
            TABS.filter(tab => !tab.roles || tab.roles.includes(user?.role)).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  className="relative w-full flex justify-center px-2"
                  onMouseEnter={(e) => handleMouseEnter(e, tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                >
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center justify-center p-3 rounded-xl transition-all w-12 h-12 sm:w-14 sm:h-14
                    ${isActive ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
                  >
                    <Icon size={22} className={`transition-transform duration-300 ${isActive ? "scale-110" : (hoveredTab === tab.id ? "scale-110" : "")}`} />

                    {isActive && (
                      <motion.div
                        layoutId="activeTabSidebar"
                        className="absolute inset-0 bg-indigo-100/50 rounded-xl"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full" />
                    )}
                  </button>
                </div>
              );
            })}
        </aside>

        {/* Global Fixed Tooltip to escape 'overflow-y-auto' clipping */}
        <AnimatePresence>
          {hoveredTab && (
            <div
              style={{
                position: 'fixed',
                top: tooltipPos.top,
                left: tooltipPos.left,
                zIndex: 100,
                pointerEvents: 'none'
              }}
            >
              <motion.div
                initial={{ opacity: 0, x: -10, y: "-50%", scale: 0.95 }}
                animate={{ opacity: 1, x: 0, y: "-50%", scale: 1 }}
                exit={{ opacity: 0, x: -10, y: "-50%", scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute left-0 top-0 px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl whitespace-nowrap shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 flex items-center gap-2.5 backdrop-blur-md"
              >
                {(() => {
                  const tabData = TABS.find(t => t.id === hoveredTab);
                  if (!tabData) return null;
                  const HoverIcon = tabData.icon;
                  const isActiveHover = activeTab === hoveredTab;

                  return (
                    <>
                      <div className={`p-1 rounded-md ${isActiveHover ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                        <HoverIcon size={14} className={isActiveHover ? "text-indigo-600" : "text-slate-400"} />
                      </div>
                      <span className="tracking-wide text-slate-700">{tabData.label}</span>

                      {/* Tooltip Arrow */}
                      <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-slate-200 rounded-bl-sm" />
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 3. MAIN CONTENT (STRICT HEIGHT) */}
        <main className="flex-1 bg-slate-50 p-4 sm:p-6 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col"
            >
              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

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
                  {activeTab === 'liveops' && <LiveOpsTab onJumpToTab={setActiveTab} />}
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
                  {activeTab === 'admin-contributions' && <AdminContributionsTab />}
                  {activeTab === 'server-allocation' && <ServerAllocationTab />}
                  {activeTab === 'certificates' && <CertificateManager />}
                  {activeTab === 'health' && <SystemHealthTab />}
                  {activeTab === 'database' && <DatabaseManagerTab />}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-white to-transparent pointer-events-none z-20" />
            </motion.div>
          </AnimatePresence>
        </main >
      </div >

      {/* Global CSS for the Custom Scrollbar */}
      < style dangerouslySetInnerHTML={{
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
    </div >
  );
};

export default SuperAdminDashboard;