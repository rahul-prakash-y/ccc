import React, { useState } from 'react';
import { 
    Activity, Users, ClipboardCheck, CheckCircle2, Clock, PlayCircle, Trophy, UserCheck, Award
} from 'lucide-react';
import LiveOpsTab from './LiveOpsTab';
import EvaluationTab from './EvaluationTab';
import QuestionManagerTab from './QuestionManagerTab';
import StudentScoreDashboard from './StudentScoreDashboard';
import AuditLogsTab from './AuditLogsTab';
import AttendanceTab from './AttendanceTab';
import TeamScoreTab from './TeamScoreTab';
import CertificateManager from './CertificateManager';
import MyAdminAssignmentsTab from './MyAdminAssignmentsTab';
import { useAuthStore } from '../../store/authStore';

const LiveDashboardTab = ({ forceType = 'GENERAL' }) => {
    const { user } = useAuthStore();
    const isSuperAdmin = ['SUPER_ADMIN', 'SUPER_MASTER'].includes(user?.role);
    const [subTab, setSubTab] = useState('overview');

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header / Sub-tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                        {forceType === 'PRACTICE' ? <PlayCircle size={20} /> : <Activity size={20} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                            {forceType === 'PRACTICE' ? 'Practice Dashboard' : 'Live Dashboard'}
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                            {forceType === 'PRACTICE' ? 'Student Training Control' : 'Consolidated Test Control'}
                        </p>
                    </div>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shadow-inner border border-slate-200 overflow-x-auto no-scrollbar max-w-full text-[10px] font-black uppercase tracking-widest">
                    <button
                        onClick={() => setSubTab('overview')}
                        className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${subTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Operations
                    </button>
                    <button
                        onClick={() => setSubTab('questions')}
                        className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${subTab === 'questions' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Questions
                    </button>
                    <button
                        onClick={() => setSubTab('evaluations')}
                        className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${subTab === 'evaluations' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Evaluations
                    </button>
                    <button
                        onClick={() => setSubTab('assignments')}
                        className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${subTab === 'assignments' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        My Problems
                    </button>
                    <button
                        onClick={() => setSubTab('leaderboard')}
                        className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${subTab === 'leaderboard' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Scores
                    </button>
                    {isSuperAdmin && (
                        <button
                            onClick={() => setSubTab('audit')}
                            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${subTab === 'audit' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Audit
                        </button>
                    )}
                    {forceType === 'GENERAL' && (
                        <>
                            <button
                                onClick={() => setSubTab('attendance')}
                                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${subTab === 'attendance' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Attendance
                            </button>

                            <button
                                onClick={() => setSubTab('certificates')}
                                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${subTab === 'certificates' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Perts
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {subTab === 'overview' && (
                    <div className="h-full overflow-y-auto no-scrollbar">
                        <LiveOpsTab forceType={forceType} />
                    </div>
                )}

                {subTab === 'questions' && (
                    <div className="h-full">
                        <QuestionManagerTab forcePractice={forceType === 'PRACTICE'} />
                    </div>
                )}

                {subTab === 'evaluations' && (
                    <div className="h-full">
                        <EvaluationTab forceType={forceType} />
                    </div>
                )}

                {subTab === 'assignments' && (
                    <div className="h-full">
                        <MyAdminAssignmentsTab />
                    </div>
                )}

                {subTab === 'leaderboard' && (
                    <div className="h-full flex flex-col space-y-4">
                        <div className="flex-1">
                            <StudentScoreDashboard forceType={forceType} />
                        </div>
                        {forceType === 'GENERAL' && (
                            <>
                                <div className="h-px bg-slate-200" />
                                <div className="flex-1">
                                    <TeamScoreTab />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {subTab === 'audit' && isSuperAdmin && (
                    <div className="h-full">
                        <AuditLogsTab forceType={forceType} />
                    </div>
                )}

                {subTab === 'attendance' && forceType === 'GENERAL' && (
                    <div className="h-full">
                        <AttendanceTab />
                    </div>
                )}


                {subTab === 'certificates' && forceType === 'GENERAL' && (
                    <div className="h-full">
                        <CertificateManager />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveDashboardTab;
