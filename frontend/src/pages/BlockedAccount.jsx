import React from 'react';
import { ShieldX, Mail, ArrowLeft, LogOut, AlertOctagon, Power } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const BlockedAccount = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans selection:bg-red-100 selection:text-red-700 relative overflow-hidden">
            
            {/* Clinical Ambient Red Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full relative z-10 flex flex-col items-center">
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative w-full bg-white border border-red-100 rounded-3xl p-8 text-center shadow-[0_20px_60px_-15px_rgba(239,68,68,0.15)] overflow-hidden"
                >
                    {/* Top Emergency Strip */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />

                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-100 blur-md rounded-full" />
                            <div className="relative w-20 h-20 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-sm animate-pulse">
                                <ShieldX size={40} />
                            </div>
                        </div>
                    </div>

                    <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Access Revoked</h1>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
                        Your account has been restricted from accessing the CodeArena platform due to a severe violation of our security protocols.
                    </p>

                    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 mb-8 text-left relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-400" />
                        <div className="flex items-center gap-2 mb-1.5">
                            <AlertOctagon size={14} className="text-red-500" />
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Reason for Ban</p>
                        </div>
                        <p className="text-sm text-slate-800 font-bold leading-relaxed ml-5">
                            "{user?.banReason || 'Anti-cheat threshold exceeded (Tab switch or unauthorized manipulation detected).'}"
                        </p>
                    </div>

                    <div className="space-y-3">
                        <a
                            href="mailto:support@codearena.com"
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black tracking-wide rounded-xl transition-all shadow-lg shadow-red-200 active:scale-95 text-sm"
                        >
                            <Mail size={18} /> Appeal to Support
                        </a>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-all font-bold text-sm shadow-sm"
                        >
                            <Power size={18} /> Disconnect Session
                        </button>
                    </div>

                    <p className="mt-8 text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">
                        System Node: <span className="text-slate-600">{user?.userId || 'UNKNOWN_NODE'}</span>
                    </p>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => navigate('/')}
                    className="mt-8 flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:border-slate-300"
                >
                    <ArrowLeft size={14} /> Back to Hub
                </motion.button>
            </div>
        </div>
    );
};

export default BlockedAccount;