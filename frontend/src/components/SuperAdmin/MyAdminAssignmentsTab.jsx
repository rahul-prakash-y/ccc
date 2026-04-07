import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BookOpen, Loader2, AlertTriangle, 
    ChevronDown, ChevronUp, CheckCircle2, 
    Star, Clock, ClipboardCheck, Eye
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import { SkeletonList } from '../Skeleton';

const MyAdminAssignmentsTab = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedRound, setExpandedRound] = useState(null);

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API}/my-assignments`);
            setAssignments(res.data.data);
            if (res.data.data.length > 0) {
                setExpandedRound(res.data.data[0]._id);
            }
        } catch (err) {
            setError('Failed to load your assigned questions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Header section with stats */}
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl relative">
                        <Star size={18} />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest leading-none">Evaluation Assignments</p>
                        <p className="text-xs text-indigo-500/80 mt-1.5 font-medium">Questions you are currently assigned to grade</p>
                    </div>
                </div>
                {!loading && (
                    <div className="text-right border-l border-indigo-200 pl-4 hidden sm:block">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Items</p>
                        <p className="text-sm font-bold text-indigo-900">
                            {assignments.reduce((acc, r) => acc + r.questions.length, 0)} Questions
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 space-y-3">
                {loading ? (
                    <SkeletonList count={6} />
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-red-200 rounded-2xl bg-red-50">
                        <AlertTriangle size={36} className="text-red-300 mb-3" />
                        <p className="text-sm font-bold text-red-500">{error}</p>
                        <button onClick={fetchAssignments} className="mt-3 text-xs font-bold text-red-600 underline px-4 py-2 hover:bg-red-100 rounded-lg transition-colors">Try Again</button>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                        <CheckCircle2 size={48} className="text-slate-200 mb-3" />
                        <p className="text-sm font-bold text-slate-500">All caught up!</p>
                        <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                            You don't have any questions specifically assigned to you for manual evaluation across active rounds.
                        </p>
                    </div>
                ) : (
                    assignments.map((round) => (
                        <div key={round._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <button
                                onClick={() => setExpandedRound(expandedRound === round._id ? null : round._id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                        <BookOpen size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900 text-sm tracking-tight">{round.name}</h3>
                                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-tighter rounded border border-indigo-100">
                                                {round.type}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                            {round.questions.length} Assigned {round.questions.length === 1 ? 'Question' : 'Questions'}
                                        </p>
                                    </div>
                                </div>
                                {expandedRound === round._id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </button>

                            <AnimatePresence>
                                {expandedRound === round._id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-slate-100 overflow-hidden"
                                    >
                                        <div className="p-4 grid gap-4 bg-slate-50/30">
                                            {round.questions.map((question) => (
                                                <div key={question._id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden group hover:border-indigo-200 transition-colors">
                                                    {/* Question Sub-Header */}
                                                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-indigo-400 group-hover:bg-indigo-600 transition-colors" />
                                                            <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{question.title}</p>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {question.points} Points
                                                        </span>
                                                    </div>

                                                    <div className="p-4 space-y-4">
                                                        {/* Description */}
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                <ClipboardCheck size={10} /> Problem Prompt
                                                            </p>
                                                            <div className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                                                {question.description}
                                                            </div>
                                                        </div>

                                                        {question.problemImage && (
                                                            <div>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                    <Eye size={10} /> Reference Image
                                                                </p>
                                                                <div className="relative group max-w-sm">
                                                                    <img 
                                                                        src={question.problemImage} 
                                                                        alt="Problem Reference" 
                                                                        className="rounded-xl border border-slate-200 shadow-sm transition-transform group-hover:scale-[1.02] cursor-zoom-in"
                                                                        onClick={() => window.open(question.problemImage, '_blank')}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Expected Answer / Reference */}
                                                        {question.correctAnswer && (
                                                            <div>
                                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                    <CheckCircle2 size={10} /> Reference / Model Answer
                                                                </p>
                                                                <pre className="text-[11px] text-emerald-800 whitespace-pre-wrap font-mono leading-relaxed bg-emerald-50/40 p-3 rounded-lg border border-emerald-100/50">
                                                                    {question.correctAnswer}
                                                                </pre>
                                                            </div>
                                                        )}

                                                        {/* Rubrics if any */}
                                                        {question.rubrics?.length > 0 && (
                                                            <div>
                                                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                                    <Star size={10} /> Grading Criteria (Rubrics)
                                                                </p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {question.rubrics.map((r, i) => (
                                                                        <div key={i} className="flex items-center justify-between bg-amber-50/30 p-2 rounded-lg border border-amber-100/50">
                                                                            <span className="text-[10px] font-bold text-amber-900">{r.criterion}</span>
                                                                            <span className="text-[10px] font-black text-amber-600 font-mono">/ {r.maxScore}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Instructions if any */}
                                                        {question.rubricInstructions && (
                                                            <div className="pt-2 border-t border-slate-100">
                                                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Internal Instructions</p>
                                                                <p className="text-[11px] text-slate-600 italic leading-relaxed">
                                                                    {question.rubricInstructions}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MyAdminAssignmentsTab;
