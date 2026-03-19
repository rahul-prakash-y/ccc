import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
    FileText, Download, Shield, AlertCircle, 
    CheckCircle2, Loader2, Trophy, BarChart3,
    ArrowRight, Info, ExternalLink
} from 'lucide-react';
import { api } from '../store/authStore';
import toast from 'react-hot-toast';

const PerformanceReport = () => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [downloading, setDownloading] = useState({ self: false, team: false });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Fetch latest user data to get publication status
                const res = await api.get('/auth/profile'); // Assuming this returns basic info including isReportPublished
                // Wait, authStore might already have it, but let's be sure
                setUser(res.data.user);
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-500 font-bold animate-pulse">Analyzing Performance Data...</p>
                </div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white selection:bg-indigo-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-600/20 blur-[100px] rounded-full" />
            </div>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-12"
                >
                    {/* Header Section */}
                    <motion.div variants={itemVariants} className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
                            <Shield size={14} className="text-indigo-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Official Analytics Portal</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white via-white to-slate-400">
                            Performance <span className="text-indigo-500">Insights</span>
                        </h1>
                        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                            Access your comprehensive assessment breakdown and team contribution metrics verified by the internal evaluation board.
                        </p>
                    </motion.div>

                    {/* Report Cards Grid */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Individual Report Card */}
                        <motion.div 
                            variants={itemVariants}
                            className="group relative"
                        >
                            <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500 to-purple-600 rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-500" />
                            <div className="relative h-full bg-slate-900 border border-white/10 rounded-[30px] p-8 md:p-10 flex flex-col space-y-8 overflow-hidden">
                                {/* Geometric Background Decor */}
                                <div className="absolute -right-12 -top-12 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
                                
                                <div className="flex justify-between items-start">
                                    <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400">
                                        <BarChart3 size={32} />
                                    </div>
                                    {user?.isReportPublished ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                            <CheckCircle2 size={12} className="text-emerald-400" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Published</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                            <AlertCircle size={12} className="text-amber-400" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Pending</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-white">Individual Progress Report</h3>
                                    <p className="text-slate-400 font-medium leading-relaxed">
                                        A detailed breakdown of your scores across all assessment rounds, accuracy metrics, and time-efficiency analytics.
                                    </p>
                                </div>

                                <div className="mt-auto pt-8">
                                    <button
                                        onClick={() => handleDownload('self')}
                                        disabled={downloading.self || !user?.isReportPublished}
                                        className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all
                                            ${user?.isReportPublished 
                                                ? 'bg-indigo-600 hover:bg-white hover:text-indigo-600 shadow-xl shadow-indigo-500/20 active:scale-[0.98]' 
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
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
                            <div className="absolute -inset-0.5 bg-linear-to-r from-purple-600 to-pink-600 rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-500" />
                            <div className="relative h-full bg-slate-900 border border-white/10 rounded-[30px] p-8 md:p-10 flex flex-col space-y-8 overflow-hidden">
                                {/* Geometric Background Decor */}
                                <div className="absolute -right-12 -top-12 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors" />

                                <div className="flex justify-between items-start">
                                    <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400">
                                        <Trophy size={32} />
                                    </div>
                                    {/* Team report status is slightly different, let's assume it's also on user or just handle it 403 style */}
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-white/5 rounded-full">
                                        <Info size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Squad Metrics</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-white">Squad Contribution Matrix</h3>
                                    <p className="text-slate-400 font-medium leading-relaxed">
                                        Aggregated performance data for your entire team, ranking within the leaderboard, and individual contribution ratios.
                                    </p>
                                </div>

                                <div className="mt-auto pt-8">
                                    <button
                                        onClick={() => handleDownload('team')}
                                        disabled={downloading.team || !user?.team}
                                        className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all
                                            ${user?.team 
                                                ? 'bg-purple-600 hover:bg-white hover:text-purple-600 shadow-xl shadow-purple-500/20 active:scale-[0.98]' 
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
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
                        className="bg-indigo-500/5 border border-indigo-500/10 rounded-[32px] p-8 flex flex-col md:flex-row items-center gap-8"
                    >
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center shrink-0">
                            <Shield size={32} className="text-indigo-400" />
                        </div>
                        <div className="space-y-2 text-center md:text-left">
                            <h4 className="text-xl font-bold text-white">Verification & Security</h4>
                            <p className="text-slate-400 font-medium">
                                All reports are digitally signed and timestamped. Any tampering with the PDF metadata will invalidate its authenticity. Contact the CCC Admin board for any discrepancies.
                            </p>
                        </div>
                        <button className="md:ml-auto group flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10">
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Support Center</span>
                            <ExternalLink size={14} className="text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </motion.div>
                </motion.div>
            </main>
        </div>
    );
};

export default PerformanceReport;
