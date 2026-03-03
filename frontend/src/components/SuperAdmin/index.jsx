import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, BookOpen, ClipboardList, LogOut, Activity, UserCog, Users, PlayCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API, authHeader } from './constants';

import LiveOpsTab from './LiveOpsTab';

import ActivityLogsTab from './ActivityLogsTab';
import StudentManagerTab from './StudentManagerTab';
import AdminManagerTab from './AdminManagerTab';
import AuditLogsTab from './AuditLogsTab';
import QuestionManagerTab from './QuestionManagerTab';

const TABS = [
    { id: 'liveops', label: 'Live Operations', icon: PlayCircle },
    { id: 'activity', label: 'Activity Logs', icon: Activity },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'admins', label: 'Admins', icon: UserCog },
    { id: 'audit', label: 'Submission Audit', icon: ClipboardList },
    { id: 'questions', label: 'Questions', icon: BookOpen },
];

const SuperAdminDashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('liveops');
    const [rounds, setRounds] = useState([]);

    const fetchRounds = useCallback(async () => {
        try {
            const res = await fetch(`${API}/rounds`, { headers: authHeader() });
            const data = await res.json();
            setRounds(data.data || []);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchRounds();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sticky header */}
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-xl border border-violet-200">
                            <ShieldCheck size={20} className="text-violet-600" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm leading-none">Super Admin</p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{user?.studentId}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 transition-colors"
                    >
                        <LogOut size={15} /> Sign Out
                    </button>
                </div>

                <nav className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto pb-0">
                    {TABS.map((tab) => {
                        const IconComponent = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-violet-600 text-violet-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                            >
                                <IconComponent size={15} /> {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </header>

            {/* Tab content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                    >
                        {activeTab === 'liveops' && <LiveOpsTab />}
                        {activeTab === 'activity' && <ActivityLogsTab />}
                        {activeTab === 'students' && <StudentManagerTab />}
                        {activeTab === 'admins' && <AdminManagerTab />}
                        {activeTab === 'audit' && <AuditLogsTab rounds={rounds} />}
                        {activeTab === 'questions' && <QuestionManagerTab rounds={rounds} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
