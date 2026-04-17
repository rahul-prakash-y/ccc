import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Download, Loader2, Sparkles, Calendar, Trophy, Medal, Star, ShieldCheck } from 'lucide-react';
import { api, useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDateIST } from '../utils/dateUtils';

const AchievementsPage = () => {
    const { user } = useAuthStore();
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const res = await api.get('/rounds/my-certificates');
                setCertificates(res.data.data || []);
            } catch (error) {
                console.error('Failed to load achievements:', error);
                toast.error('Failed to load achievements list.');
            } finally {
                setLoading(false);
            }
        };
        fetchAchievements();
    }, []);

    const handleDownload = async (roundId, roundName) => {
        const loadingToast = toast.loading(`Generating certificate for ${roundName}...`);
        try {
            const res = await api.get(`/rounds/${roundId}/certificate`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${roundName.replace(/\s+/g, '_')}_certificate.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Certificate downloaded successfully!');
        } catch (error) {
            console.error('Failed to download certificate:', error);
            toast.error('Failed to download certificate. Please try again.');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const formatDate = (dateStr) => {
        return formatDateIST(dateStr);
    };

    return (
        <>
            {/* Header */}
            <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Award className="text-indigo-600" size={24} />
                                Hall of Fame
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Your Achievements & Certificates</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 relative z-10 font-sans">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="relative">
                            <Loader2 size={48} className="text-indigo-500 animate-spin" />
                            <Sparkles size={20} className="text-amber-400 absolute -top-2 -right-2 animate-pulse" />
                        </div>
                        <p className="text-slate-500 font-bold text-sm tracking-wide">Syncing with achievement servers...</p>
                    </div>
                ) : certificates.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center max-w-2xl mx-auto shadow-sm"
                    >
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-100">
                            <Trophy size={48} className="text-slate-200" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Your trophy cabinet is empty... for now.</h2>
                        <p className="text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                            Complete tests and secure top positions to earn prestigious certificates. Your journey to excellence starts with your next assessment!
                        </p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="mt-10 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                        >
                            Return to Dashboard
                        </button>
                    </motion.div>
                ) : (
                    <div className="space-y-12">
                        {/* Highlights Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-[100px] transition-all group-hover:bg-indigo-500/10" />
                                <Medal className="text-indigo-600 mb-6" size={32} />
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">{certificates.length}</p>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Total Rewards</p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-[100px] transition-all group-hover:bg-amber-500/10" />
                                <Star className="text-amber-500 mb-6" size={32} />
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">Gold Tier</p>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Status Level</p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[100px] transition-all group-hover:bg-emerald-500/10" />
                                <ShieldCheck className="text-emerald-600 mb-6" size={32} />
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">Verified</p>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Accuracy Index</p>
                            </div>
                        </div>

                        {/* Certificates List */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Verified Certificates</h3>
                                <div className="h-px flex-1 bg-slate-100 mx-8 hidden sm:block" />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <AnimatePresence>
                                    {certificates.map((cert, index) => (
                                        <motion.div
                                            key={cert.roundId}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all group overflow-hidden relative"
                                        >
                                            {/* Decorative pattern */}
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />

                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                                                    <Award className="text-indigo-600" size={32} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-all uppercase">{cert.roundName}</h4>
                                                    <div className="flex flex-wrap items-center gap-4 mt-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                            <Calendar size={14} className="text-slate-300" />
                                                            {formatDate(cert.date)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs font-black text-indigo-500 uppercase tracking-widest bg-indigo-50/50 px-2.5 py-1 rounded-lg">
                                                            <Trophy size={12} />
                                                            Winner Qualified
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDownload(cert.roundId, cert.roundName)}
                                                className="w-full sm:w-auto flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-slate-200 group-hover:shadow-indigo-100"
                                            >
                                                <Download size={16} />
                                                Get Certificate
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
};

export default AchievementsPage;
