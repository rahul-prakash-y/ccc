import React from 'react';
import { ShieldX, Mail, ArrowLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const BlockedAccount = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full">
                <div className="relative">
                    {/* Decorative Background Glows */}
                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-500/10 blur-[80px] rounded-full"></div>
                    <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-red-600/10 blur-[80px] rounded-full"></div>

                    <div className="relative bg-[#11111a] border border-red-900/30 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-sm">
                        <div className="mb-6 flex justify-center">
                            <div className="w-20 h-20 bg-red-950/30 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-pulse">
                                <ShieldX size={40} />
                            </div>
                        </div>

                        <h1 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Access Revoked</h1>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            Your account has been restricted from accessing the CodeArena platform due to a violation of our security protocols.
                        </p>

                        <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-4 mb-8 text-left">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Reason for Ban</p>
                            <p className="text-sm text-gray-300 font-medium italic">
                                "{user?.banReason || 'Anti-cheat threshold exceeded (Tab switch or unauthorized manipulation detected).'}"
                            </p>
                        </div>

                        <div className="space-y-3">
                            <a
                                href="mailto:support@codearena.com"
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                            >
                                <Mail size={18} /> Contact Support
                            </a>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#1a1a26] hover:bg-[#222231] text-gray-400 hover:text-white border border-gray-800 rounded-xl transition-all font-bold"
                            >
                                <LogOut size={18} /> Sign Out
                            </button>
                        </div>

                        <p className="mt-8 text-[10px] text-gray-600 font-mono uppercase tracking-[0.2em]">
                            System ID: {user?.userId || 'UNKNOWN_NODE'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="mt-6 flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mx-auto text-sm font-medium"
                >
                    <ArrowLeft size={14} /> Back to Homepage
                </button>
            </div>
        </div>
    );
};

export default BlockedAccount;
