import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, PlayCircle, Eye, Loader2, StopCircle,
  Clock, CheckCircle2, Plus, AlertTriangle, Trash2, X, Timer, Shuffle, Settings2
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API, STATUS_COLORS } from './constants';

// ── Per-round OTP panel with live countdown ───────────────────────────────────
const OtpPanel = ({ round, onOtpChange }) => {
  const [otp, setOtp] = useState({ startOtp: round.startOtp, endOtp: round.endOtp, secondsLeft: null });
  const [flashing, setFlashing] = useState(false);
  const prevOtpRef = useRef(round.startOtp);
  const active = round.status === 'WAITING_FOR_OTP' || round.status === 'RUNNING';

  const poll = useCallback(async () => {
    if (!active) return;
    try {
      const res = await api.get(`/rounds/${round._id}/refresh-otp`);
      const d = res.data.data;
      if (d.startOtp !== prevOtpRef.current) {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 800);
        prevOtpRef.current = d.startOtp;
        onOtpChange?.(round._id, d);
      }
      setOtp({ startOtp: d.startOtp, endOtp: d.endOtp, secondsLeft: d.secondsLeft });
    } catch (_) { /* silently skip */ }
  }, [active, round._id, onOtpChange]);

  useEffect(() => {
    if (!active) return;
    poll(); // immediate first fetch
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [active, poll]);

  // Per-second visual countdown (client-side only)
  useEffect(() => {
    if (!active || otp.secondsLeft === null) return;
    const tick = setInterval(() => {
      setOtp(prev => ({ ...prev, secondsLeft: Math.max(0, (prev.secondsLeft ?? 1) - 1) }));
    }, 1000);
    return () => clearInterval(tick);
  }, [active, otp.secondsLeft]);

  const pct = otp.secondsLeft !== null ? (otp.secondsLeft / 60) * 100 : 0;
  const danger = otp.secondsLeft !== null && otp.secondsLeft <= 10;

  if (!active) {
    return (
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
    );
  }

  return (
    <div className="mb-4 space-y-2">
      {/* Countdown bar */}
      <div className="flex items-center gap-2">
        <Timer size={10} className={danger ? 'text-red-500 animate-pulse' : 'text-slate-400'} />
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${danger ? 'bg-red-400' : 'bg-emerald-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[10px] font-black font-mono tabular-nums ${danger ? 'text-red-500' : 'text-slate-400'}`}>
          {otp.secondsLeft !== null ? `${otp.secondsLeft}s` : '—'}
        </span>
      </div>

      {/* OTP blocks */}
      <div className={`grid grid-cols-2 gap-3 transition-all ${flashing ? 'scale-[1.02]' : ''}`}>
        <div className={`border rounded-xl p-3 text-center transition-colors ${flashing ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Start OTP</p>
          <p className={`text-lg font-mono font-bold tracking-widest transition-colors ${flashing ? 'text-emerald-600' : 'text-slate-700'}`}>
            {otp.startOtp || '------'}
          </p>
        </div>
        <div className={`border rounded-xl p-3 text-center transition-colors ${flashing ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
          <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">End OTP</p>
          <p className={`text-lg font-mono font-bold tracking-widest transition-colors ${flashing ? 'text-emerald-600' : 'text-indigo-600'}`}>
            {otp.endOtp || '------'}
          </p>
        </div>
      </div>
      <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">
        Auto-rotates every 60s
      </p>
    </div>
  );
};

// ── Projector live OTP (polls independently) ─────────────────────────────────
const ProjectorOtp = ({ round }) => {
  const [otp, setOtp] = useState({ startOtp: round.startOtp, endOtp: round.endOtp, secondsLeft: null });
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(round.startOtp);

  const poll = useCallback(async () => {
    try {
      const res = await api.get(`/rounds/${round._id}/refresh-otp`);
      const d = res.data.data;
      if (d.startOtp !== prevRef.current) {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 1000);
        prevRef.current = d.startOtp;
      }
      setOtp({ startOtp: d.startOtp, endOtp: d.endOtp, secondsLeft: d.secondsLeft });
    } catch (_) { }
  }, [round._id]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    if (otp.secondsLeft === null) return;
    const tick = setInterval(() => {
      setOtp(prev => ({ ...prev, secondsLeft: Math.max(0, (prev.secondsLeft ?? 1) - 1) }));
    }, 1000);
    return () => clearInterval(tick);
  }, [otp.secondsLeft]);

  const pct = otp.secondsLeft !== null ? (otp.secondsLeft / 60) * 100 : 0;
  const danger = otp.secondsLeft !== null && otp.secondsLeft <= 10;

  return (
    <>
      {/* Countdown bar for projector */}
      <div className="flex items-center gap-4 mb-16">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${danger ? 'bg-red-500' : 'bg-emerald-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-2xl font-black font-mono tabular-nums ${danger ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
          {otp.secondsLeft !== null ? `${otp.secondsLeft}s` : '—'}
        </span>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-16 transition-all ${flashing ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'}`}>
        <div className="space-y-6">
          <p className="text-slate-500 font-black tracking-widest text-xl uppercase">Entry Access Key</p>
          <div className={`border-2 rounded-[40px] py-16 text-[10rem] font-mono font-black leading-none shadow-2xl transition-colors ${flashing ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white'}`}>
            {otp.startOtp}
          </div>
        </div>
        <div className="space-y-6">
          <p className="text-indigo-400 font-black tracking-widest text-xl uppercase">Submission Key</p>
          <div className={`border-2 rounded-[40px] py-16 text-[10rem] font-mono font-black leading-none shadow-2xl transition-colors ${flashing ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
            {otp.endOtp}
          </div>
        </div>
      </div>
      <p className="text-slate-600 font-black tracking-[0.3em] uppercase text-sm mt-10">
        Keys rotate automatically every 60 seconds
      </p>
    </>
  );
};

// ── Question pool settings per round ─────────────────────────────────────────
const QuestionSettings = ({ round, onSave, busy }) => {
  const [qCount, setQCount] = useState(round.questionCount ?? '');
  const [shuffle, setShuffle] = useState(round.shuffleQuestions !== false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onSave(round._id, qCount === '' ? null : Number(qCount), shuffle);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mb-3 p-3 bg-violet-50/60 border border-violet-100 rounded-xl">
      <div className="flex items-center gap-1.5 mb-2">
        <Settings2 size={10} className="text-violet-500" />
        <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest">Question Pool Settings</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Questions per student */}
        <div className="flex items-center gap-1.5 flex-1">
          <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Qs per student</label>
          <input
            type="number"
            min={1}
            value={qCount}
            onChange={e => setQCount(e.target.value)}
            placeholder="All"
            className="w-16 text-center text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
          />
        </div>
        {/* Shuffle toggle */}
        <button
          onClick={() => setShuffle(s => !s)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${shuffle ? 'bg-violet-100 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-400'
            }`}
        >
          <Shuffle size={10} />
          {shuffle ? 'Shuffle ON' : 'Shuffle OFF'}
        </button>
        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={busy}
          className={`px-3 py-1 rounded-lg text-[10px] font-black border transition-all disabled:opacity-50 ${saved ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
            }`}
        >
          {busy ? <Loader2 size={10} className="animate-spin" /> : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      {qCount && (
        <p className="text-[9px] text-violet-400 mt-1.5 font-medium">
          Each student gets {qCount} randomly selected question{qCount > 1 ? 's' : ''} from the pool
        </p>
      )}
    </div>
  );
};

const LiveOpsTab = () => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectorRound, setProjectorRound] = useState(null);
  const [busy, setBusy] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newRound, setNewRound] = useState({ name: '', durationMinutes: 60, type: 'GENERAL' });

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

      const res = await api({ method: resolvedMethod, url: `${API}${path}`, data: body });

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

  const handleSaveQuestionSettings = async (roundId, questionCount, shuffleQuestions) => {
    setBusy(b => ({ ...b, [`${roundId}-qsettings`]: true }));
    try {
      const res = await api.patch(`${API}/rounds/${roundId}/question-settings`, { questionCount, shuffleQuestions });
      const updatedRound = res.data.data;
      setRounds(prev => prev.map(r => r._id === roundId ? { ...r, ...updatedRound } : r));
    } catch (e) {
      console.error('Failed to save question settings:', e);
    } finally {
      setBusy(b => ({ ...b, [`${roundId}-qsettings`]: false }));
    }
  };

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

              {/* Live OTP Panel */}
              <OtpPanel round={round} />

              {/* Question Settings */}
              <QuestionSettings
                round={round}
                onSave={handleSaveQuestionSettings}
                busy={busy[`${round._id}-qsettings`]}
              />

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
                    value={newRound.name} onChange={e => setNewRound({ ...newRound, name: e.target.value })} placeholder="e.g. Finals Phase 1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Duration (Min)</label>
                    <input type="number" required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                      value={newRound.durationMinutes} onChange={e => setNewRound({ ...newRound, durationMinutes: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Type</label>
                    <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none"
                      value={newRound.type} onChange={e => setNewRound({ ...newRound, type: e.target.value })}>
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
                <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                <button onClick={confirmDialog.onConfirm} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${confirmDialog.isDestructive ? 'bg-red-500 shadow-red-200' : 'bg-indigo-600 shadow-indigo-200'}`}>
                  {confirmDialog.actionLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Projector Mode with live OTP */}
        {projectorRound && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-10">
            <button onClick={() => setProjectorRound(null)} className="absolute top-10 right-10 text-slate-500 hover:text-white font-black tracking-[0.3em] text-xs transition-colors">[ ESC / CLOSE ]</button>
            <div className="text-center w-full max-w-6xl">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                <p className="text-red-400 font-black tracking-[0.4em] uppercase text-sm">Operation Underway</p>
              </div>
              <h2 className="text-6xl md:text-8xl font-black text-white mb-12 tracking-tighter">{projectorRound.name}</h2>
              <ProjectorOtp round={projectorRound} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveOpsTab;
