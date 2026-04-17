import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    FileText, Download, Shield, AlertCircle, 
    CheckCircle2, Loader2, Trophy, BarChart3,
    ArrowRight, Info, ExternalLink, Search, 
    Sparkles, Target, Zap
} from 'lucide-react';
import { api } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PerformanceReport = () => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [downloading, setDownloading] = useState({ self: false, team: false });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await api.get('/auth/profile');
                setUser(res.data.profile);
            } catch {
                toast.error("Failed to load profile data");
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleDownload = async (type) => {
        setDownloading(prev => ({ ...prev, [type]: true }));
        try {
            const endpoint = type === 'self' ? '/student/my-report' : '/student/my-team-report';
            const res = await api.get(endpoint, { responseType: 'blob' });
            
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = type === 'self' ? 'My_Performance_Report.pdf' : 'Team_Performance_Report.pdf';
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Report downloaded successfully");
        } catch (err) {
            const errorMsg = type === 'self' 
                ? "Your report hasn't been published yet." 
                : "Your team report hasn't been published yet.";
            toast.error(err.response?.data?.error || errorMsg);
        } finally {
            setDownloading(prev => ({ ...prev, [type]: false }));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <Target size={24} className="text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="text-slate-500 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Synchronizing Analytics Data...</p>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1,
            transition: { type: "spring", stiffness: 100, damping: 20 }
        }
    };

    return (
        <>
            {/* Premium Header */}
            <header className="h-24 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50 px-8 flex items-center shadow-sm">
                <div className="max-w-6xl w-full mx-auto flex items-center justify-between font-sans">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <BarChart3 className="text-indigo-600" size={24} />
                            Performance <span className="text-slate-400">HUB</span>
                        </h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Secure Analytics Portal v1.2</p>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-slate-600 uppercase">Protocols Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-8 py-12 md:py-20 font-sans">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-20"
                >
                    {/* Hero Section */}
                    <motion.div variants={itemVariants} className="max-w-3xl space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-2">
                            <Shield size={14} className="text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">Official Certification Authority</span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[0.95]">
                            Intelligence <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600">Diagnostics.</span>
                        </h2>
                        <p className="text-slate-500 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
                            Access your comprehensive assessment breakdown and team contribution metrics verified by the internal evaluation board.
                        </p>
                    </motion.div>

                    {/* Report Cards Grid */}
                    <div className="grid md:grid-cols-2 gap-10">
                        {/* Individual Report Card */}
                        <motion.div 
                            variants={itemVariants}
                            className="group relative"
                        >
                            <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500 to-indigo-600 rounded-[40px] blur opacity-0 group-hover:opacity-10 transition duration-500" />
                            <div className="relative h-full bg-white/70 backdrop-blur-2xl border border-white rounded-[38px] p-10 flex flex-col space-y-10 overflow-hidden shadow-xl shadow-indigo-500/5 ring-1 ring-slate-200/50">
                                {/* Decor */}
                                <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-colors" />
                                
                                <div className="flex justify-between items-start">
                                    <div className="p-5 bg-indigo-50 rounded-3xl text-indigo-600 border border-indigo-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                        <BarChart3 size={32} />
                                    </div>
                                    {user?.isReportPublished ? (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Published</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Pending</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Individual Matrix</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">
                                        A detailed breakdown of your scores across all assessment rounds, accuracy metrics, and time-efficiency analytics.
                                    </p>
                                </div>

                                <div className="mt-auto pt-4">
                                    <button
                                        onClick={() => handleDownload('self')}
                                        disabled={downloading.self || !user?.isReportPublished}
                                        className={`w-full flex items-center justify-center gap-3 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all
                                            ${user?.isReportPublished 
                                                ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-indigo-100 active:scale-[0.98]' 
                                                : 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'
                                            }`}
                                    >
                                        {downloading.self ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Download size={18} />
                                        )}
                                        {user?.isReportPublished ? 'Download Analytics PDF' : 'Analysis In Progress'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Team Report Card */}
                        <motion.div 
                            variants={itemVariants}
                            className="group relative"
                        >
                            <div className="absolute -inset-0.5 bg-linear-to-r from-purple-500 to-purple-600 rounded-[40px] blur opacity-0 group-hover:opacity-10 transition duration-500" />
                            <div className="relative h-full bg-white/70 backdrop-blur-2xl border border-white rounded-[38px] p-10 flex flex-col space-y-10 overflow-hidden shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50">
                                {/* Decor */}
                                <div className="absolute -right-12 -top-12 w-48 h-48 bg-purple-50 rounded-full blur-3xl group-hover:bg-purple-100/50 transition-colors" />

                                <div className="flex justify-between items-start">
                                    <div className="p-5 bg-purple-50 rounded-3xl text-purple-600 border border-purple-100 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                                        <Trophy size={32} />
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full">
                                        <Info size={14} className="text-slate-400" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Squad Metrics</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Squad Contribution</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">
                                        Aggregated performance data for your entire team, ranking within the leaderboard, and individual contribution ratios.
                                    </p>
                                </div>

                                <div className="mt-auto pt-4">
                                    <button
                                        onClick={() => handleDownload('team')}
                                        disabled={downloading.team || !user?.team}
                                        className={`w-full flex items-center justify-center gap-3 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all
                                            ${user?.team 
                                                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-xl shadow-purple-100 active:scale-[0.98]' 
                                                : 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'
                                            }`}
                                    >
                                        {downloading.team ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Download size={18} />
                                        )}
                                        {user?.team ? 'Download Squad Report' : 'No Squad Assigned'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Notice Section */}
                    <motion.div 
                        variants={itemVariants}
                        className="bg-white/50 backdrop-blur-md border border-slate-200 rounded-[3rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 shadow-sm"
                    >
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center shrink-0 border border-indigo-100">
                            <Shield size={36} className="text-indigo-600" />
                        </div>
                        <div className="space-y-3 text-center md:text-left flex-1">
                            <h4 className="text-2xl font-black text-slate-900 tracking-tight">Verification & Security</h4>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                All reports are digitally signed and timestamped. Any tampering with the PDF metadata will invalidate its authenticity. Contact the CCC Admin board for any discrepancies.
                            </p>
                        </div>
                        <button className="group flex items-center gap-4 px-8 py-4 bg-slate-900 text-white rounded-2xl transition-all shadow-xl shadow-slate-200 hover:bg-indigo-600">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Support Center</span>
                            <ExternalLink size={16} className="text-white/70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </motion.div>
                </motion.div>
            </main>
        </>
    );
};

export default PerformanceReport;
