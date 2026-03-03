import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, PlayCircle, Eye, Loader2, StopCircle, Clock, CheckCircle2, Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../../store/authStore';
import { API, STATUS_COLORS } from './constants';

const LiveOpsTab = () => {
    const [rounds, setRounds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projectorRound, setProjectorRound] = useState(null);
    const [busy, setBusy] = useState({});
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRound, setNewRound] = useState({ name: '', durationMinutes: 60 });
    const [adding, setAdding] = useState(false);

    // Universal confirmation modal state
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', actionLabel: '', isDestructive: false, onConfirm: null });

    const fetchRounds = useCallback(async () => {
        try {
            const res = await api.get(`${API}/rounds`);
            setRounds(res.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchRounds();
        const t = setInterval(fetchRounds, 15000); // Poll every 15s to keep stats fresh
        return () => clearInterval(t);
    }, [fetchRounds]);

    const act = async (roundId, action, reqMethod = 'PATCH', body = null) => {
        setBusy(b => ({ ...b, [`${roundId}-${action}`]: true }));
        try {
            const path = action === 'generate-otp' ? `/rounds/${roundId}/generate-otp` : `/rounds/${roundId}/status`;
            const resolvedMethod = action === 'generate-otp' ? 'post' : reqMethod.toLowerCase();

            const res = await api({
                method: resolvedMethod,
                url: `${API}${path}`,
                data: body
            });
            const data = res.data;
            setRounds(prev => prev.map(r => r._id === roundId ? { ...r, ...data.data } : r));
            if (projectorRound && projectorRound._id === roundId) {
                setProjectorRound({ ...projectorRound, ...data.data }); // update projector if open
            }
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(b => ({ ...b, [`${roundId}-${action}`]: false }));
        }
    };

    const handleGenerateOtp = (round) => act(round._id, 'generate-otp');
    const handleStart = (round) => act(round._id, 'status', 'PATCH', { status: 'RUNNING' });

    const handleForceEnd = (round) => {
        setConfirmDialog({
            isOpen: true,
            title: `Force End ${round.name}?`,
            message: 'Are you sure you want to force end this round? This will permanently lock out all active students and end the test immediately.',
            actionLabel: 'Force End Test',
            isDestructive: true,
            onConfirm: () => {
                act(round._id, 'status', 'PATCH', { status: 'COMPLETED', isOtpActive: false });
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeleteRound = (round) => {
        setConfirmDialog({
            isOpen: true,
            title: `Delete ${round.name}?`,
            message: 'WARNING: This will permanently wipe this round, all its custom questions, and all student submissions connected to it. This cannot be undone.',
            actionLabel: 'Delete Test',
            isDestructive: true,
            onConfirm: async () => {
                setBusy(b => ({ ...b, [`${round._id}-delete`]: true }));
                try {
                    await api.delete(`${API}/rounds/${round._id}`);
                    setRounds(prev => prev.filter(r => r._id !== round._id));
                } catch (e) { console.error(e); }
                finally {
                    setBusy(b => ({ ...b, [`${round._id}-delete`]: false }));
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };
    const handleAddTime = (round) => {
        const newLim = Number(prompt('Enter new duration limit in minutes:', round.durationMinutes + 5));
        if (newLim && !isNaN(newLim)) {
            act(round._id, 'status', 'PATCH', { durationMinutes: newLim });
        }
    };

    const handleAddRound = async (e) => {
        e.preventDefault();
        if (!newRound.name.trim()) return;
        setAdding(true);
        try {
            await api.post(`${API}/rounds`, newRound);
            setShowAddModal(false);
            setNewRound({ name: '', durationMinutes: 60 });
            fetchRounds();
        } catch (err) {
            console.error(err);
        } finally {
            setAdding(false);
        }
    };

    if (loading && rounds.length === 0) {
        return <div className="flex justify-center py-20"><Loader2 size={36} className="text-violet-500 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-gray-700 uppercase tracking-widest">Live Testing Operations</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                    <Plus size={16} /> Add Test / Round
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {rounds.map(round => (
                    <div key={round._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-5">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{round.name}</h3>
                                    <p className="text-xs text-gray-400 mt-1 font-mono">{round.durationMinutes} minutes allowed</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-gray-50 bg-opacity-50 ${STATUS_COLORS[round.status] || 'text-gray-500 border-gray-200'}`}>
                                    {round.status.replace(/_/g, ' ')}
                                </span>
                            </div>

                            <div className="flex gap-4 mb-6">
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Start OTP</p>
                                    <p className="text-2xl font-mono font-bold text-gray-800 tracking-widest">{round.startOtp || '——————'}</p>
                                </div>
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">End OTP</p>
                                    <p className="text-2xl font-mono font-bold text-violet-600 tracking-widest">{round.endOtp || '——————'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 border-t border-gray-100 p-4 flex flex-wrap gap-2">
                            {round.status === 'LOCKED' && (
                                <div className="flex w-full gap-2">
                                    <button onClick={() => handleGenerateOtp(round)} disabled={busy[`${round._id}-generate-otp`]}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
                                    >
                                        {busy[`${round._id}-generate-otp`] ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Generate OTPs
                                    </button>
                                    <button onClick={() => handleDeleteRound(round)} disabled={busy[`${round._id}-delete`]}
                                        className="px-4 py-2.5 bg-white hover:bg-red-50 border border-red-100 text-red-500 rounded-xl transition-colors font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                                        title="Delete Test/Round"
                                    >
                                        {busy[`${round._id}-delete`] ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            )}

                            {round.status === 'WAITING_FOR_OTP' && (
                                <button onClick={() => handleStart(round)} disabled={busy[`${round._id}-status`]}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
                                >
                                    <PlayCircle size={16} /> Mark as Running
                                </button>
                            )}

                            {(round.status === 'WAITING_FOR_OTP' || round.status === 'RUNNING') && (
                                <button onClick={() => setProjectorRound(round)}
                                    className="px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl transition-colors font-bold text-sm"
                                    title="Projector Mode (Full Screen OTP)"
                                >
                                    <Eye size={16} />
                                </button>
                            )}

                            {round.status === 'RUNNING' && (
                                <>
                                    <button onClick={() => handleAddTime(round)} disabled={busy[`${round._id}-status`]}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 bg-white"
                                    >
                                        <Clock size={14} /> Adjust Time
                                    </button>
                                    <button onClick={() => handleForceEnd(round)} disabled={busy[`${round._id}-status`]}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 bg-white"
                                    >
                                        <StopCircle size={14} /> Force End
                                    </button>
                                </>
                            )}

                            {round.status === 'COMPLETED' && (
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex text-gray-400 font-bold text-sm gap-2 items-center px-4">
                                        <CheckCircle2 size={16} /> Test Completed & Locked
                                    </div>
                                    <button onClick={() => handleDeleteRound(round)} disabled={busy[`${round._id}-delete`]}
                                        className="px-4 py-2 bg-white hover:bg-red-50 border border-red-100 text-red-500 rounded-xl transition-colors font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                                        title="Delete Test/Round"
                                    >
                                        {busy[`${round._id}-delete`] ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Round Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-900">Add New Test / Round</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
                            </div>
                            <form onSubmit={handleAddRound} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Test Name (e.g. SQL Contest)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                                        value={newRound.name}
                                        onChange={e => setNewRound({ ...newRound, name: e.target.value })}
                                        placeholder="Enter test name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Duration (Minutes)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                                        value={newRound.durationMinutes}
                                        onChange={e => setNewRound({ ...newRound, durationMinutes: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={adding || !newRound.name.trim()}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        {adding ? <Loader2 size={16} className="animate-spin" /> : 'Create Test'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmDialog.isOpen && (
                    <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                            <div className={`p-6 border-b ${confirmDialog.isDestructive ? 'border-red-100' : 'border-gray-100'} flex gap-4 items-start`}>
                                <div className={`p-3 rounded-full shrink-0 ${confirmDialog.isDestructive ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'}`}>
                                    {confirmDialog.isDestructive ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{confirmDialog.title}</h3>
                                    <p className="text-gray-500 text-sm mt-1 leading-relaxed">{confirmDialog.message}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 flex gap-3 justify-end">
                                <button
                                    onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                                    className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDialog.onConfirm}
                                    className={`px-5 py-2.5 font-bold rounded-xl transition-colors text-sm text-white ${confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'}`}
                                >
                                    {confirmDialog.actionLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Projector Mode Modal (Dark Theme purposefully retained for projector contrast) */}
            <AnimatePresence>
                {projectorRound && (
                    <div
                        className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center p-8 backdrop-blur-md"
                    >
                        <button onClick={() => setProjectorRound(null)}
                            className="absolute top-8 right-8 text-gray-400 hover:text-white transition-colors uppercase font-bold tracking-widest text-sm"
                        >
                            [ CLOSE ]
                        </button>

                        <div className="text-center w-full max-w-5xl">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                <p className="text-red-400 font-bold tracking-widest uppercase text-sm">Testing Environment Active</p>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black text-white mb-20 tracking-tight">{projectorRound.name}</h2>

                            <div className="flex flex-col md:flex-row gap-12 justify-center items-center">
                                <div className="text-center w-full">
                                    <p className="text-gray-400 font-bold tracking-widest uppercase mb-5 text-lg">START OTP</p>
                                    <div className="text-8xl md:text-[9rem] font-mono font-black text-white tracking-widest border-2 border-white/10 rounded-3xl py-12 px-8 bg-white/5 shadow-2xl">
                                        {projectorRound.startOtp}
                                    </div>
                                </div>
                                <div className="text-center w-full">
                                    <p className="text-violet-400 font-bold tracking-widest uppercase mb-5 text-lg">END / SUBMIT OTP</p>
                                    <div className="text-8xl md:text-[9rem] font-mono font-black text-violet-300 tracking-widest border-2 border-violet-500/30 rounded-3xl py-12 px-8 bg-violet-950/40 shadow-2xl">
                                        {projectorRound.endOtp}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LiveOpsTab;
