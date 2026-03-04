import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, PlayCircle, Eye, Loader2, StopCircle, 
  Clock, CheckCircle2, Plus, AlertTriangle, Trash2, X 
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API, STATUS_COLORS } from './constants';

const LiveOpsTab = () => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectorRound, setProjectorRound] = useState(null);
  const [busy, setBusy] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newRound, setNewRound] = useState({ name: '', durationMinutes: 60, type: 'GENERAL' });

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, title: '', message: '', actionLabel: '', isDestructive: false, onConfirm: null 
  });

  const fetchRounds = useCallback(async () => {
    try {
      const res = await api.get(`${API}/rounds`);
      setRounds(res.data.data || []);
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRounds();
    const t = setInterval(fetchRounds, 15000);
    return () => clearInterval(t);
  }, [fetchRounds]);

  const act = async (roundId, action, reqMethod = 'PATCH', body = {}) => {
    setBusy(b => ({ ...b, [`${roundId}-${action}`]: true }));
    try {
      const path = action === 'generate-otp' ? `/rounds/${roundId}/generate-otp` : `/rounds/${roundId}/status`;
      const resolvedMethod = action === 'generate-otp' ? 'post' : reqMethod.toLowerCase();

      const res = await api({
        method: resolvedMethod,
        url: `${API}${path}`,
        data: body
      });
      
      const updatedRound = res.data.data;
      setRounds(prev => prev.map(r => r._id === roundId ? { ...r, ...updatedRound } : r));
      
      if (projectorRound && projectorRound._id === roundId) {
        setProjectorRound({ ...projectorRound, ...updatedRound });
      }
    } catch (e) {
      console.error(`Action ${action} failed:`, e);
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
      message: 'This will permanently lock out all active students and end the test immediately.',
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
      message: 'WARNING: This will permanently wipe this round and all student submissions. This cannot be undone.',
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
      setNewRound({ name: '', durationMinutes: 60, type: 'GENERAL' });
      fetchRounds();
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  if (loading && rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={40} className="text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Initializing Control Panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">System Overlord</h2>
          <p className="text-xl font-bold text-slate-800">Live Operations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
        >
          <Plus size={18} /> Create Round
        </button>
      </div>

      {/* Rounds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rounds.map(round => (
          <motion.div 
            layout 
            key={round._id} 
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 transition-colors shadow-sm"
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate uppercase tracking-tight">{round.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{round.durationMinutes} MIN</span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border ${STATUS_COLORS[round.status] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  {round.status.replace(/_/g, ' ')}
                </div>
              </div>

              {/* OTP Display Blocks */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Start OTP</p>
                  <p className="text-lg font-mono font-bold text-slate-700 tracking-widest">{round.startOtp || '------'}</p>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-center">
                  <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">End OTP</p>
                  <p className="text-lg font-mono font-bold text-indigo-600 tracking-widest">{round.endOtp || '------'}</p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                {round.status === 'LOCKED' && (
                  <button 
                    onClick={() => handleGenerateOtp(round)} 
                    disabled={busy[`${round._id}-generate-otp`]}
                    className="flex-1 h-9 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {busy[`${round._id}-generate-otp`] ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 
                    Init Keys
                  </button>
                )}

                {round.status === 'WAITING_FOR_OTP' && (
                  <button 
                    onClick={() => handleStart(round)}
                    className="flex-1 h-9 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    <PlayCircle size={16} /> Activate Round
                  </button>
                )}

                {round.status === 'RUNNING' && (
                  <div className="flex-1 flex gap-2">
                    <button 
                      onClick={() => handleAddTime(round)}
                      className="flex-1 h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      + Time
                    </button>
                    <button 
                      onClick={() => handleForceEnd(round)}
                      className="flex-1 h-9 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <StopCircle size={14} /> Kill
                    </button>
                  </div>
                )}

                {(round.status === 'WAITING_FOR_OTP' || round.status === 'RUNNING') && (
                  <button 
                    onClick={() => setProjectorRound(round)}
                    className="h-9 w-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    title="Projector Mode"
                  >
                    <Eye size={16} />
                  </button>
                )}

                <button 
                  onClick={() => handleDeleteRound(round)}
                  disabled={busy[`${round._id}-delete`]}
                  className="h-9 w-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  {busy[`${round._id}-delete`] ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* Create Round Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">New Operation</h3>
                <button onClick={() => setShowAddModal(false)}><X size={20} className="text-slate-400" /></button>
              </div>
              <form onSubmit={handleAddRound} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Round Name</label>
                  <input required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                    value={newRound.name} onChange={e => setNewRound({...newRound, name: e.target.value})} placeholder="e.g. Finals Phase 1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Duration (Min)</label>
                    <input type="number" required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                      value={newRound.durationMinutes} onChange={e => setNewRound({...newRound, durationMinutes: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Type</label>
                    <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none"
                      value={newRound.type} onChange={e => setNewRound({...newRound, type: e.target.value})}>
                      <option value="GENERAL">General</option>
                      <option value="SQL_CONTEST">SQL</option>
                      <option value="MINI_HACKATHON">Hackathon</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={adding} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                  {adding ? <Loader2 className="animate-spin" /> : 'Deploy Round'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Global Confirmation Dialog */}
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${confirmDialog.isDestructive ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                {confirmDialog.isDestructive ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDialog({...confirmDialog, isOpen: false})} className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                <button onClick={confirmDialog.onConfirm} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${confirmDialog.isDestructive ? 'bg-red-500 shadow-red-200' : 'bg-indigo-600 shadow-indigo-200'}`}>
                  {confirmDialog.actionLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Projector Mode (OTP Fullscreen) */}
        {projectorRound && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-10">
            <button onClick={() => setProjectorRound(null)} className="absolute top-10 right-10 text-slate-500 hover:text-white font-black tracking-[0.3em] text-xs transition-colors">[ ESC / CLOSE ]</button>
            <div className="text-center w-full max-w-6xl">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                <p className="text-red-400 font-black tracking-[0.4em] uppercase text-sm">Operation Underway</p>
              </div>
              <h2 className="text-6xl md:text-8xl font-black text-white mb-24 tracking-tighter">{projectorRound.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="space-y-6">
                  <p className="text-slate-500 font-black tracking-widest text-xl uppercase">Entry Access Key</p>
                  <div className="bg-white/5 border-2 border-white/10 rounded-[40px] py-16 text-[10rem] font-mono font-black text-white leading-none shadow-2xl">
                    {projectorRound.startOtp}
                  </div>
                </div>
                <div className="space-y-6">
                  <p className="text-indigo-400 font-black tracking-widest text-xl uppercase">Submission Key</p>
                  <div className="bg-indigo-500/10 border-2 border-indigo-500/20 rounded-[40px] py-16 text-[10rem] font-mono font-black text-indigo-400 leading-none shadow-2xl shadow-indigo-500/10">
                    {projectorRound.endOtp}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveOpsTab;