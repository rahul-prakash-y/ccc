import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, UserCheck, User, Clock, Trophy, BarChart3, Power, Sparkles, 
    XCircle, AlertTriangle, Check, Loader2, Zap
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, api } from '../store/authStore';

const SidebarItem = ({ icon, onClick, label, variant = "indigo", isActive = false }) => {
    const Icon = icon;
    const variants = {
        indigo: "text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:shadow-indigo-200",
        violet: "text-violet-600 border-violet-100 hover:bg-violet-600 hover:text-white hover:shadow-violet-200",
        teal: "text-teal-600 border-teal-100 hover:bg-teal-600 hover:text-white hover:shadow-teal-200",
        amber: "text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white hover:shadow-amber-200",
        red: "text-red-500 border-slate-200 hover:bg-red-600 hover:text-white hover:shadow-red-200",
        slate: "text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600"
    };

    return (
        <div className="relative group flex items-center justify-center">
            <button
                onClick={onClick}
                className={`p-3 rounded-2xl transition-all duration-300 flex items-center justify-center border-2 active:scale-90
                    ${isActive ? 'bg-white shadow-lg ' + variants[variant] : 'bg-transparent border-transparent ' + variants[variant]}
                `}
            >
                <Icon size={20} className="transition-transform group-hover:scale-110" />
            </button>
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl z-50">
                {label}
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
            </div>
        </div>
    );
};

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuthStore();
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
    const [attendanceOtp, setAttendanceOtp] = useState('');
    const [marking, setMarking] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const [attendanceMessage, setAttendanceMessage] = useState('');

    const handleMarkAttendance = async () => {
        setMarking(true);
        setAttendanceStatus(null);
        try {
            const res = await api.post('/attendance/mark', { otp: attendanceOtp });
            setAttendanceStatus('success');
            setAttendanceMessage(res.data.message);
        } catch (e) {
            setAttendanceStatus('error');
            setAttendanceMessage(e.response?.data?.error || 'Validation failed');
        } finally {
            setMarking(false);
        }
    };

    return (
        <>
            <aside className="w-20 bg-white/70 backdrop-blur-2xl border-r border-slate-200/50 flex flex-col items-center py-8 justify-between shrink-0 z-50 h-screen sticky top-0">
                <div className="mb-12">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-2">
                        <Sparkles size={20} className="text-white" />
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-6">
                    <SidebarItem
                        icon={Play}
                        label="Dashboard"
                        variant="indigo"
                        isActive={location.pathname === '/dashboard'}
                        onClick={() => navigate('/dashboard')}
                    />
                    <SidebarItem
                        icon={UserCheck}
                        label="Mark Attendance"
                        variant="indigo"
                        isActive={isAttendanceOpen}
                        onClick={() => setIsAttendanceOpen(true)}
                    />
                    <SidebarItem
                        icon={User}
                        label="Profile"
                        variant="violet"
                        isActive={location.pathname === '/profile'}
                        onClick={() => navigate('/profile')}
                    />
                    <SidebarItem
                        icon={Clock}
                        label="History"
                        variant="teal"
                        isActive={location.pathname === '/attendance-history'}
                        onClick={() => navigate('/attendance-history')}
                    />
                    <SidebarItem
                        icon={Trophy}
                        label="Achievements"
                        variant="amber"
                        isActive={location.pathname === '/achievements'}
                        onClick={() => navigate('/achievements')}
                    />
                    <SidebarItem
                        icon={BarChart3}
                        label="Performance"
                        variant="violet"
                        isActive={location.pathname === '/performance-report'}
                        onClick={() => navigate('/performance-report')}
                    />
                    <SidebarItem
                        icon={Zap}
                        label="Practice Matrix"
                        variant="amber"
                        isActive={location.pathname === '/practice-dashboard'}
                        onClick={() => navigate('/practice-dashboard')}
                    />
                </div>

                <div className="mt-auto">
                    <SidebarItem
                        icon={Power}
                        label="Disconnect"
                        variant="red"
                        onClick={logout}
                    />
                </div>
            </aside>

            {/* Attendance Modal */}
            <AnimatePresence>
                {isAttendanceOpen && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                        <UserCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 leading-none">Mark Attendance</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                                            Roll Call Protocol
                                        </p>
                                    </div>
                                </div>

                                {attendanceStatus === 'success' ? (
                                    <div className="py-4 text-center space-y-3">
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                            <Check size={24} />
                                        </div>
                                        <h4 className="font-black text-slate-900">Attendance Marked!</h4>
                                        <p className="text-sm text-slate-500 font-medium">{attendanceMessage}</p>
                                        <button
                                            onClick={() => {
                                                setIsAttendanceOpen(false);
                                                setAttendanceStatus(null);
                                                setAttendanceOtp('');
                                            }}
                                            className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 transition-colors"
                                        >
                                            CONTINUE
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                Enter Attendance Key
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={attendanceOtp}
                                                onChange={e => setAttendanceOtp(e.target.value.toUpperCase())}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-center text-2xl font-mono font-black tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                                placeholder="••••••"
                                                autoFocus
                                            />
                                            {attendanceStatus === 'error' && (
                                                <p className="text-red-500 text-[10px] font-bold mt-2 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> {attendanceMessage}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => {
                                                    setIsAttendanceOpen(false);
                                                    setAttendanceOtp('');
                                                    setAttendanceStatus(null);
                                                }}
                                                className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-100 transition-colors border border-slate-100"
                                            >
                                                CANCEL
                                            </button>
                                            <button
                                                onClick={handleMarkAttendance}
                                                disabled={marking || attendanceOtp.length < 6}
                                                className="flex-2 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {marking ? <Loader2 size={14} className="animate-spin" /> : 'VERIFY & MARK'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;
