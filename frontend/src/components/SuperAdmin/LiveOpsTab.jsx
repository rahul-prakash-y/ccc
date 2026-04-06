import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  RefreshCw, PlayCircle, Eye, Loader2, StopCircle,
  Clock, CheckCircle2, Plus, AlertTriangle, Trash2, X, Timer, Shuffle, Settings2,
  KeyRound, User, Pencil, Users,
  Play, LayoutGrid,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { api, useAuthStore } from '../../store/authStore';
import { useRoundStore } from '../../store/roundStore';
import { useAdminStore } from '../../store/adminStore';
import { API, STATUS_COLORS } from './constants';
import { SkeletonGrid } from '../Skeleton';
import toast from 'react-hot-toast';

// ── Per-section OTP panel with live countdown ───────────────────────────────────
const OtpPanel = ({ section, onOtpChange }) => {
  const [otp, setOtp] = useState({ startOtp: null, endOtp: null, secondsLeft: null });
  const [flashing, setFlashing] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(true);
  const prevOtpRef = useRef(null);
  const active = section.status === 'WAITING_FOR_OTP' || section.status === 'RUNNING';

  // Always fetch on mount so each admin sees THEIR OWN keys
  const fetchOtp = useCallback(async (isInitial = false) => {
    if (isInitial) setLoadingOtp(true);
    try {
      const res = await api.get(`/rounds/${section._id}/refresh-otp`);
      const d = res.data.data;
      if (d.startOtp !== prevOtpRef.current && prevOtpRef.current !== null) {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 800);
        onOtpChange?.(section._id, d);
      }
      prevOtpRef.current = d.startOtp;
      setOtp({ startOtp: d.startOtp, endOtp: d.endOtp, secondsLeft: d.secondsLeft });
    } catch {
      // If no OTP has been generated yet for this admin, show dashes
      setOtp(prev => ({ ...prev, startOtp: prev.startOtp ?? '------', endOtp: prev.endOtp ?? '------' }));
    } finally {
      if (isInitial) setLoadingOtp(false);
    }
  }, [section._id, onOtpChange]);

  // Initial fetch on mount — always, regardless of active state
  useEffect(() => {
    fetchOtp(true);
  }, [fetchOtp]);

  // Continuous polling only while active
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => fetchOtp(false), 5000);
    return () => clearInterval(t);
  }, [active, fetchOtp]);

  // Per-second visual countdown (client-side only, active only)
  useEffect(() => {
    if (!active || otp.secondsLeft === null) return;
    const tick = setInterval(() => {
      setOtp(prev => ({ ...prev, secondsLeft: Math.max(0, (prev.secondsLeft ?? 1) - 1) }));
    }, 1000);
    return () => clearInterval(tick);
  }, [active, otp.secondsLeft]);

  const pct = otp.secondsLeft !== null ? (otp.secondsLeft / 60) * 100 : 0;
  const danger = otp.secondsLeft !== null && otp.secondsLeft <= 10;

  if (loadingOtp) {
    return (
      <div className="grid grid-cols-2 gap-3 mb-4 animate-pulse">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center h-16" />
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-center h-16" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Start Auth OTP</p>
          <p className="text-lg font-mono font-bold text-slate-500 tracking-widest opacity-60">{otp.startOtp || '------'}</p>
          <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-0.5">Not Broadcasting</p>
        </div>
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-center">
          <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Final Auth OTP</p>
          <p className="text-lg font-mono font-bold text-indigo-400 tracking-widest opacity-60">{otp.endOtp || '------'}</p>
          <p className="text-[8px] text-indigo-300 font-bold uppercase tracking-widest mt-0.5">Not Broadcasting</p>
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
          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Start Auth OTP</p>
          <p className={`text-lg font-mono font-bold tracking-widest transition-colors ${flashing ? 'text-emerald-600' : 'text-slate-700'}`}>
            {otp.startOtp || '------'}
          </p>
        </div>
        <div className={`border rounded-xl p-3 text-center transition-colors ${flashing ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
          <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Final Auth OTP</p>
          <p className={`text-lg font-mono font-bold tracking-widest transition-colors ${flashing ? 'text-emerald-600' : 'text-indigo-600'}`}>
            {otp.endOtp || '------'}
          </p>
        </div>
      </div>
      <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">
        Auto-rotates every 60s · Your personal keys
      </p>
    </div>
  );
};


// ── Projector live OTP (polls independently) ─────────────────────────────────
const ProjectorOtp = ({ section }) => {
  const [otp, setOtp] = useState({ startOtp: section.startOtp, endOtp: section.endOtp, secondsLeft: null });
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(section.startOtp);

  const poll = useCallback(async () => {
    try {
      const res = await api.get(`/rounds/${section._id}/refresh-otp`);
      const d = res.data.data;
      if (d.startOtp !== prevRef.current) {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 1000);
        prevRef.current = d.startOtp;
      }
      setOtp({ startOtp: d.startOtp, endOtp: d.endOtp, secondsLeft: d.secondsLeft });
    } catch {
      // Silently ignore rotation fetch errors
    }
  }, [section._id]);

  useEffect(() => {
    // Initial fetch pushed to next tick to avoid cascading renders
    const init = setTimeout(poll, 0);
    const t = setInterval(poll, 5000);
    return () => {
      clearTimeout(init);
      clearInterval(t);
    };
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
          <p className="text-slate-500 font-black tracking-widest text-xl uppercase">Start Authorization OTP</p>
          <div className={`border-2 rounded-[40px] py-16 text-[10rem] font-mono font-black leading-none shadow-2xl transition-colors ${flashing ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white'}`}>
            {otp.startOtp}
          </div>
        </div>
        <div className="space-y-6">
          <p className="text-indigo-400 font-black tracking-widest text-xl uppercase">Final Authorization OTP</p>
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

// ── Question pool settings per section ─────────────────────────────────────────
const QuestionSettings = ({ section, onSave, busy, isSuperAdmin }) => {
  const [qCount, setQCount] = useState(section.questionCount ?? '');
  const [shuffle, setShuffle] = useState(section.shuffleQuestions !== false);
  const [saved, setSaved] = useState(false);


  const handleSave = async () => {
    await onSave(section._id, qCount === '' ? null : Number(qCount), shuffle);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mb-3 p-3 bg-violet-50/60 border border-violet-100 rounded-xl">
      <div className="flex items-center gap-1.5 mb-2">
        <Settings2 size={10} className="text-violet-500" />
        <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest">Question Pool Settings</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {/* Questions per student */}
        <div className="flex items-center gap-1.5 min-w-[120px]">
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
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${shuffle ? 'bg-violet-100 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-400'
            }`}
        >
          <Shuffle size={10} />
          {shuffle ? 'Shuffle ON' : 'Shuffle OFF'}
        </button>
        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={busy}
          className={`flex-1 px-3 py-1 rounded-lg text-[10px] font-black border transition-all disabled:opacity-50 ${saved ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
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

// ── Time window settings per section ──────────────────────────────────────────
const TimeWindowSettings = ({ section, onSave, busy, isSuperAdmin }) => {
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    // Explicitly force IST (UTC + 5:30) for everyone
    const istOffset = 330 * 60 * 1000; 
    const local = new Date(d.getTime() + istOffset);
    return local.toISOString().slice(0, 16);
  };

  const [start, setStart] = useState(formatDateForInput(section.startTime));
  const [end, setEnd] = useState(formatDateForInput(section.endTime));
  const [saved, setSaved] = useState(false);


  const handleSave = async () => {
    await onSave(section._id, start || null, end || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mb-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock size={10} className="text-indigo-500" />
        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Test Window Limits</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Start Time</label>
          <input
            type="datetime-local"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
        <div>
          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">End Time</label>
          <input
            type="datetime-local"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={busy}
        className={`w-full py-1.5 rounded-lg text-[10px] font-black border transition-all disabled:opacity-50 ${saved ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
          }`}
      >
        {busy ? <Loader2 size={10} className="animate-spin" /> : saved ? '✓ Window Updated' : 'Update Timing Window'}
      </button>
    </div>
  );
};

// ── Admin access settings per section (SuperAdmin only) ─────────────────────────
const AdminAccessSettings = ({ section, onSave, busy, isSuperAdmin }) => {
  const { admins, fetchAdmins } = useAdminStore();
  const [selectedAdmins, setSelectedAdmins] = useState(section.authorizedAdmins || []);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) fetchAdmins();
  }, [isOpen, fetchAdmins]);

  if (!isSuperAdmin) return null;

  const handleToggleAdmin = (adminId) => {
    setSelectedAdmins(prev => 
      prev.includes(adminId) ? prev.filter(id => id !== adminId) : [...prev, adminId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(section._id, selectedAdmins);
      setIsOpen(false);
      toast.success('Admin permissions updated');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-3 p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <User size={10} className="text-amber-600" />
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Authorized Admins</p>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-[9px] font-bold text-amber-700 hover:underline"
        >
          {isOpen ? 'Close' : 'Manage Access'}
        </button>
      </div>

      {!isOpen ? (
        <div className="flex flex-wrap gap-1">
          {section.authorizedAdmins?.length > 0 ? (
            <p className="text-[10px] text-slate-500 font-medium italic">
              {section.authorizedAdmins.length} admin(s) authorized
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 font-medium italic">No admins assigned (SuperAdmin only access)</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {admins.map(admin => (
              <label key={admin._id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-amber-100">
                <input 
                  type="checkbox" 
                  checked={selectedAdmins.includes(admin._id)}
                  onChange={() => handleToggleAdmin(admin._id)}
                  className="rounded border-amber-200 text-amber-600 focus:ring-amber-500"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-700 truncate capitalize">{admin.name}</p>
                  <p className="text-[8px] font-mono text-slate-400 uppercase">{admin.studentId}</p>
                </div>
              </label>
            ))}
            {admins.length === 0 && <p className="text-[10px] text-center text-slate-400 py-2 italic font-medium">No admins found</p>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || busy}
            className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black transition-all disabled:opacity-50 shadow-sm shadow-amber-200"
          >
            {saving || busy ? <Loader2 size={10} className="animate-spin mx-auto" /> : 'Save Permissions'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Inline name + team mode editor (Admin & SuperAdmin) ──────────────────────────
const TestCardEditSettings = ({ group, onSave, busy }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editTeam, setEditTeam] = useState(group.sections[0]?.isTeamTest || false);
  const [editDuration, setEditDuration] = useState(group.sections[0]?.testDurationMinutes || group.sections[0]?.durationMinutes || 60);
  const [saved, setSaved] = useState(false);

  // Don't use a useEffect to sync — let the parent re-key the component if group changes
  // (Edit state is intentionally local; user can close/reopen to see fresh values)

  const handleSave = async () => {
    await onSave(group, editName, editTeam, editDuration);
    setSaved(true);
    setTimeout(() => { setSaved(false); setIsOpen(false); }, 1500);
  };

  return (
    <div className="mb-3 p-3 bg-sky-50/60 border border-sky-100 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Pencil size={10} className="text-sky-500" />
          <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Test Identity</p>
        </div>
        <button
          onClick={() => setIsOpen(o => !o)}
          className="text-[9px] font-bold text-sky-700 hover:underline"
        >
          {isOpen ? 'Close' : 'Edit'}
        </button>
      </div>

      {!isOpen ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-600 truncate flex-1">{group.name}</span>
            {group.sections[0]?.isTeamTest && (
              <span className="flex items-center gap-0.5 text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                <Users size={8} /> TEAM
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
            <Clock size={10} className="text-slate-300" />
            <span>{group.sections[0]?.testDurationMinutes || group.sections[0]?.durationMinutes || 60} minutes</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Name and Duration Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Test Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                placeholder="Test name…"
              />
            </div>
            <div>
              <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Duration</label>
              <div className="relative">
                <input
                  type="number"
                  value={editDuration}
                  onChange={e => setEditDuration(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg pl-2 pr-6 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400/40 appearance-none"
                  placeholder="Min"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 pointer-events-none">MIN</span>
              </div>
            </div>
          </div>
          {/* Team mode toggle */}
          <div
            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
              editTeam ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
            }`}
            onClick={() => setEditTeam(t => !t)}
          >
            <div className={`w-8 h-4 rounded-full relative transition-all ${editTeam ? 'bg-indigo-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${editTeam ? 'left-4' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-0.5 text-slate-700">Team Mode</p>
              <p className="text-[8px] text-slate-400 font-medium">{editTeam ? 'Enabled — scores halved' : 'Disabled — full scores'}</p>
            </div>
          </div>
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={busy || !editName.trim()}
            className={`w-full py-1.5 rounded-lg text-[10px] font-black border transition-all disabled:opacity-50 ${
              saved ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700'
            }`}
          >
            {busy ? <Loader2 size={10} className="animate-spin mx-auto" /> : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Test Settings Modal Handler ──────────────────────────────────────────────
const TestSettingsModal = ({ isOpen, onClose, group, section, busy, onSaveSettings, onSaveTimeWindow, onSaveAdmins, onSaveTestMeta, isSuperAdmin }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 py-8"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-full flex flex-col shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-indigo-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Settings2 size={18} />
              </div>
              <h2 className="font-bold text-slate-900 text-lg uppercase tracking-tight">Configure {group.name}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto no-scrollbar p-6 flex-1 space-y-6">
            <TestCardEditSettings
              group={group}
              onSave={onSaveTestMeta}
              busy={busy[`${group.id}-meta`]}
            />
            <QuestionSettings
              section={section}
              onSave={onSaveSettings}
              busy={busy[`${section._id}-qsettings`]}
            />
            <TimeWindowSettings
              section={section}
              onSave={onSaveTimeWindow}
              busy={busy[`${section._id}-timesettings`]}

            />
            <AdminAccessSettings
              section={section}
              onSave={onSaveAdmins}
              busy={busy[`${section._id}-adminsettings`]}
              isSuperAdmin={isSuperAdmin}
            />
          </div>

          <div className="p-5 border-t border-slate-100 bg-slate-50/80 shrink-0 flex justify-end">
             <button
               onClick={onClose}
               className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
             >
               Finish & Sync
             </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── A unified Test Card representing a group of sections ─────────────────────────
const TestCard = ({ group, busy, onAct, onSaveSettings, onSaveTimeWindow, onSaveAdmins, onSaveTestMeta, onDeleteGroup, onAddTime, onDeleteSection, onProjector, isSuperAdmin, onJumpToTab }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const section = group.sections[activeIdx] || group.sections[0];
  const isMulti = group.sections.length > 1;

  return (
    <motion.div
      layout
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 transition-all shadow-sm flex flex-col h-full relative"
    >
      {/* Settings Modal Injection */}
      <TestSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        group={group}
        section={section}
        busy={busy}
        onSaveSettings={onSaveSettings}
        onSaveTimeWindow={onSaveTimeWindow}
        onSaveAdmins={onSaveAdmins}
        onSaveTestMeta={onSaveTestMeta}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Card Header: Group/Test Name */}
      <div className="p-4 pb-3 border-b border-slate-50">
        <div className="flex justify-between items-start mb-1">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-800 truncate tracking-tight">{group.name}</h3>
            {group.testGroupId && (
              <p className="text-[8px] text-slate-400 font-mono uppercase">ID: {group.testGroupId}</p>
            )}
          </div>
          <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border shrink-0 ml-2 ${STATUS_COLORS[section.status] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            {section.status.replace(/_/g, ' ')}
          </div>
          {section.type === 'PRACTICE' && (
            <div className="absolute top-0 right-0 p-1.5">
               <span className="flex items-center gap-1 bg-amber-500 text-white px-1.5 py-0.5 rounded-bl-lg rounded-tr-lg text-[7px] font-black uppercase shadow-sm">
                  <Sparkles size={6} /> Practice
               </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Clock size={10} className="text-slate-400" />
          <span className="text-[9px] font-bold text-slate-500 uppercase">
            {section.testDurationMinutes || section.durationMinutes} MIN (GLOBAL)
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col no-scrollbar">
        {/* Section Selector for Multi-section Tests */}
        {isMulti && (
          <div className="flex flex-wrap gap-1 mb-3 p-1 bg-slate-50 rounded-lg border border-slate-100">
            {group.sections.map((s, idx) => (
              <button
                key={s._id}
                onClick={() => setActiveIdx(idx)}
                className={`flex-1 min-w-[50px] py-1 px-1.5 rounded text-[8px] font-black uppercase transition-all ${activeIdx === idx
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-100 text-slate-400 hover:text-slate-600'
                  }`}
              >
                S{idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Live OTP Panel */}
        <OtpPanel section={section} />

        {/* Action Toolbar */}
        <div className="mt-auto pt-3 border-t border-slate-50 flex flex-wrap items-center gap-1.5">
          {section.status === 'LOCKED' && (
            <button
              onClick={() => onAct(section._id, 'generate-otp')}
              disabled={busy[`${section._id}-generate-otp`]}
              className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              <KeyRound size={12} /> Initialize
            </button>
          )}

          {section.status === 'WAITING_FOR_OTP' && (
            <button
              onClick={() => onAct(section._id, 'status', 'PATCH', { status: 'RUNNING' })}
              disabled={busy[`${section._id}-start`]}
              className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              <Play size={12} /> Activate
            </button>
          )}

          {section.status === 'RUNNING' && (
            <div className="flex-1 flex gap-1.5">
              <button
                onClick={() => onAddTime(section)}
                className="flex-1 h-9 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm"
              >
                + Time
              </button>
              <button
                onClick={() => onAct(section, 'FORCE_END')}
                className="flex-1 h-9 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
              >
                <StopCircle size={12} /> Kill
              </button>
            </div>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all shadow-sm"
            title="Configure Settings"
          >
            <Eye size={14} />
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => isMulti ? onDeleteSection(section) : onDeleteGroup(group)}
              disabled={busy[`${section._id}-delete`] || busy[`${group.id}-delete`]}
              className="h-9 w-9 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              {(busy[`${section._id}-delete`] || busy[`${group.id}-delete`]) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Platform-wide cached overview (Admin Monitoring) ──────────────────────────
const SystemOverview = () => {
  const { dashboardStats, statsLoading, fetchDashboardStats, refreshDashboardStats } = useAdminStore();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchDashboardStats();
    // Poll every 30s
    const t = setInterval(() => fetchDashboardStats(), 30000);
    return () => clearInterval(t);
  }, [fetchDashboardStats]);

  const stats = [
    { label: 'Total Enrolled Students', value: dashboardStats.totalUsers, icon: Users, color: 'text-indigo-600', bg: 'bg-transparent border-slate-100 hover:border-indigo-200' },
    { label: 'Submissions Captured', value: dashboardStats.totalSubmissions, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-transparent border-slate-100 hover:border-emerald-200' },
    { label: 'Integrity Flags Raised', value: dashboardStats.totalCheatFlags, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-transparent border-slate-100 hover:border-red-200', canRefresh: isSuperAdmin }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {stats.map((s, i) => (
        <div key={i} className={`p-6 rounded-4xl border-2 ${s.bg} relative overflow-hidden group transition-all bg-white`}>
          <div className="flex justify-between items-start">
            <div className="relative z-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-400">{s.label}</h4>
              <p className={`text-4xl font-black ${s.color}`}>
                {statsLoading ? <Loader2 className="animate-spin opacity-40" /> : s.value.toLocaleString()}
              </p>
            </div>
            <div className={`p-4 rounded-2xl ${s.color.replace('text', 'bg').replace('600', '50')} ${s.color} shrink-0`}>
              <s.icon size={24} />
            </div>
          </div>
          {s.canRefresh && (
            <button
              onClick={() => {
                toast.promise(refreshDashboardStats(), {
                  loading: 'Recalculating Platform Metrics...',
                  success: 'Master Cache Refreshed',
                  error: 'Failed to re-calculate'
                });
              }}
              className="absolute top-4 right-4 p-2 text-slate-200 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
              title="Force Master Re-calculation (Super Admin)"
            >
              <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} />
            </button>
          )}
          <div className="mt-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse" />
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                Live Protocol Sync: {dashboardStats.lastUpdated ? new Date(dashboardStats.lastUpdated).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Stale'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const LiveOpsTab = ({ onJumpToTab }) => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SUPER_MASTER';
  const { rounds: sections, fetchRounds, updateRound, removeRound, filterRounds } = useRoundStore();
  const [loading, setLoading] = useState(!sections.length);
  const [projectorSection, setProjectorSection] = useState(null);
  const [busy, setBusy] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [testName, setTestName] = useState('');
  const [testDurationMinutes, setTestDurationMinutes] = useState(60);
  const [roundsConfig, setRoundsConfig] = useState([{ type: 'GENERAL', questionCount: '' }]);
  const [isTeamTest, setIsTeamTest] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false, title: '', message: '', actionLabel: '', isDestructive: false, onConfirm: null
  });

  const fetchSections = useCallback(async (force = false) => {
    await fetchRounds(force);
    setLoading(false);
  }, [fetchRounds]);

  useEffect(() => {
    fetchSections();
    const t = setInterval(() => fetchSections(true), 15000);
    return () => clearInterval(t);
  }, [fetchSections]);

  const act = async (sectionId, action, reqMethod = 'PATCH', body = {}) => {
    setBusy(b => ({ ...b, [`${sectionId}-${action}`]: true }));
    try {
      const path = action === 'generate-otp' ? `/rounds/${sectionId}/generate-otp` : `/rounds/${sectionId}/status`;
      const resolvedMethod = action === 'generate-otp' ? 'post' : reqMethod.toLowerCase();

      const res = await api({ method: resolvedMethod, url: `${API}${path}`, data: body });

      const updatedSection = res.data.data;
      updateRound(sectionId, updatedSection);

      if (projectorSection && projectorSection._id === sectionId) {
        setProjectorSection({ ...projectorSection, ...updatedSection });
      }
    } catch (e) {
      console.error(`Action ${action} failed:`, e);
    } finally {
      setBusy(b => ({ ...b, [`${sectionId}-${action}`]: false }));
    }
  };

  const handleSaveQuestionSettings = async (sectionId, questionCount, shuffleQuestions) => {
    setBusy(b => ({ ...b, [`${sectionId}-qsettings`]: true }));
    try {
      const res = await api.patch(`${API}/rounds/${sectionId}/question-settings`, { questionCount, shuffleQuestions });
      const updatedSection = res.data.data;
      updateRound(sectionId, updatedSection);
    } catch (err) {
      console.error('Failed to save question settings:', err);
    } finally {
      setBusy(b => ({ ...b, [`${sectionId}-qsettings`]: false }));
    }
  };

  const handleSaveTimeWindow = async (sectionId, startTime, endTime) => {
    setBusy(b => ({ ...b, [`${sectionId}-timesettings`]: true }));
    try {
      const startIso = startTime ? (startTime.includes('+') ? startTime : `${startTime}+05:30`) : null;
      const endIso = endTime ? (endTime.includes('+') ? endTime : `${endTime}+05:30`) : null;
      const res = await api.patch(`${API}/rounds/${sectionId}/status`, { startTime: startIso, endTime: endIso });
      const updatedSection = res.data.data;
      updateRound(sectionId, updatedSection);
    } catch (err) {
      console.error('Failed to save time window settings:', err);
    } finally {
      setBusy(b => ({ ...b, [`${sectionId}-timesettings`]: false }));
    }
  };

  const handleSaveTestMeta = async (group, name, isTeamTest, duration) => {
    setBusy(b => ({ ...b, [`${group.id}-meta`]: true }));
    try {
      // Update all sections of the group with the new name, team mode, and duration
      await Promise.all(
        group.sections.map(section =>
          api.patch(`${API}/rounds/${section._id}/status`, { 
            name, 
            isTeamTest, 
            durationMinutes: duration, 
            testDurationMinutes: duration 
          })
            .then(res => updateRound(section._id, res.data.data))
        )
      );
      toast.success('Test updated successfully');
    } catch (err) {
      console.error('Failed to save test meta:', err);
      toast.error(err.response?.data?.error || 'Failed to update test');
    } finally {
      setBusy(b => ({ ...b, [`${group.id}-meta`]: false }));
    }
  };

  const handleSaveAdminPermissions = async (sectionId, authorizedAdmins) => {
    setBusy(b => ({ ...b, [`${sectionId}-adminsettings`]: true }));
    try {
      const res = await api.patch(`${API}/rounds/${sectionId}/admins`, { authorizedAdmins });
      const updatedSection = res.data.data;
      updateRound(sectionId, updatedSection);
    } catch (err) {
      console.error('Failed to save admin permissions:', err);
      toast.error(err.response?.data?.error || 'Failed to update permissions');
      throw err;
    } finally {
      setBusy(b => ({ ...b, [`${sectionId}-adminsettings`]: false }));
    }
  };

  const handleTestCardAction = (sectionOrId, action, method, body) => {
    if (action === 'FORCE_END') {
      handleForceEnd(sectionOrId);
    } else {
      act(sectionOrId, action, method, body);
    }
  };

  const handleSyncServers = async () => {
    setSyncing(true);
    setSyncResults(null);
    try {
      const res = await api.post(`${API}/sync-servers`);
      setSyncResults(res.data.results);
      toast.success('Sync broadcast complete');
    } catch (err) {
      console.error(err);
      toast.error('Failed to broadcast sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleForceEnd = (section) => {
    setConfirmDialog({
      isOpen: true,
      title: `Force End ${section.name}?`,
      message: 'This will permanently lock out all active students and end the test immediately.',
      actionLabel: 'Force End Test',
      isDestructive: true,
      onConfirm: () => {
        act(section._id, 'status', 'PATCH', { status: 'COMPLETED', isOtpActive: false });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteSection = (section) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${section.name}?`,
      message: 'WARNING: This will permanently wipe this section and all student submissions. This cannot be undone.',
      actionLabel: 'Delete Section',
      isDestructive: true,
      onConfirm: async () => {
        setBusy(b => ({ ...b, [`${section._id}-delete`]: true }));
        try {
          await api.delete(`${API}/rounds/${section._id}`);
          removeRound(section._id);
        } catch (e) { console.error(e); }
        finally {
          setBusy(b => ({ ...b, [`${section._id}-delete`]: false }));
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteGroup = (group) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Entire Test: ${group.name}?`,
      message: `WARNING: This will permanently wipe ALL ${group.sections.length} sections and all associated student submissions. THIS CANNOT BE UNDONE.`,
      actionLabel: 'Delete Entire Test',
      isDestructive: true,
      onConfirm: async () => {
        const ids = group.sections.map(s => s._id);
        setBusy(b => ({ ...b, [`${group.id}-delete`]: true }));
        try {
          // Delete sections individually (or we could add a bulk endpoint, but this is safer with existing backend)
          await Promise.all(ids.map(id => api.delete(`${API}/rounds/${id}`)));
          filterRounds(r => (r.testGroupId || r._id) !== group.id);
        } catch (e) { console.error("Bulk delete failed:", e); }
        finally {
          setBusy(b => ({ ...b, [`${group.id}-delete`]: false }));
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleAddTime = (section) => {
    const newLim = Number(prompt('Enter new duration limit in minutes:', section.durationMinutes + 5));
    if (newLim && !isNaN(newLim)) {
      act(section._id, 'status', 'PATCH', { durationMinutes: newLim });
    }
  };

  const handleAddRound = async (e) => {
    e.preventDefault();
    if (!testName.trim()) return;
    setAdding(true);

    try {
      await api.post(`${API}/rounds`, {
        name: testName,
        type: roundsConfig[0].type,
        durationMinutes: testDurationMinutes,
        testDurationMinutes,
        roundOrder: 1,
        questionCount: roundsConfig[0].questionCount === '' ? null : Number(roundsConfig[0].questionCount),
        isTeamTest,
        maxParticipants: maxParticipants === '' ? null : Number(maxParticipants),
        startTime: startTime ? (startTime.includes('+') ? startTime : `${startTime}+05:30`) : null,
        endTime: endTime ? (endTime.includes('+') ? endTime : `${endTime}+05:30`) : null
      });
      setShowAddModal(false);
      setTestName('');
      setTestDurationMinutes(60);
      setIsTeamTest(false);
      setMaxParticipants('');
      setStartTime('');
      setEndTime('');
      setRoundsConfig([{ type: 'GENERAL', questionCount: '' }]);
      fetchSections();
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  const displayGroups = React.useMemo(() => {
    const groups = {};
    sections.forEach(r => {
      const key = r.testGroupId || r._id;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          testGroupId: r.testGroupId,
          name: r.name.split(' - Section')[0] || r.name,
          sections: []
        };
      }
      groups[key].sections.push(r);
    });
    Object.values(groups).forEach(g => g.sections.sort((a, b) => (a.roundOrder || 1) - (b.roundOrder || 1)));
    return Object.values(groups).sort((a, b) => new Date(b.sections[0].createdAt) - new Date(a.sections[0].createdAt));
  }, [sections]);

  if (loading && sections.length === 0) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">System Overlord</h2>
            <p className="text-xl font-bold text-slate-800">Live Operations</p>
          </div>
          <button disabled className="opacity-50 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200">
            <Plus size={18} /> Create Test
          </button>
        </div>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 0. PLATFORM OVERVIEW (CACHED) */}
      <SystemOverview />
      
      {/* Header Section */}
      <div className="flex justify-between items-end border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">System Overlord</h2>
          <p className="text-xl font-bold text-slate-800">Live Operations</p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-3">
             <button
              onClick={handleSyncServers}
              disabled={syncing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 ${
                syncing ? 'bg-slate-100 text-slate-400' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-slate-50 shadow-indigo-100/50'
              }`}
            >
              {syncing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Sync All Servers
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
            >
              <Plus size={18} /> Create Test
            </button>
          </div>
        )}
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayGroups.map(group => (
          <TestCard
            key={group.id}
            group={group}
            busy={busy}
            onAct={handleTestCardAction}
            onSaveSettings={handleSaveQuestionSettings}
            onSaveTimeWindow={handleSaveTimeWindow}
            onSaveAdmins={handleSaveAdminPermissions}
            onSaveTestMeta={handleSaveTestMeta}
            onDeleteGroup={handleDeleteGroup}
            onAddTime={handleAddTime}
            onDeleteSection={handleDeleteSection}
            onProjector={() => setProjectorSection(group.sections[0])}
            isSuperAdmin={isSuperAdmin}
            onJumpToTab={onJumpToTab}
          />
        ))}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* Create Test Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800">New Assessment Generation</h3>
                <button type="button" onClick={() => setShowAddModal(false)}><X size={20} className="text-slate-400" /></button>
              </div>
              <form onSubmit={handleAddRound} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Test Name</label>
                  <input required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800"
                    value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g. Midterm Assessment" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Duration (Min)</label>
                  <input type="number" min="1" required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                    value={testDurationMinutes} onChange={e => setTestDurationMinutes(Number(e.target.value))} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start Window</label>
                    <input type="datetime-local" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-xs"
                      value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End Window</label>
                    <input type="datetime-local" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-xs"
                      value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 cursor-pointer transition-all hover:bg-indigo-100/50" onClick={() => setIsTeamTest(!isTeamTest)}>
                  <div className={`w-10 h-5 rounded-full transition-all relative ${isTeamTest ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isTeamTest ? 'left-6' : 'left-1'}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest leading-none mb-1">Team Test Mode</p>
                    <p className="text-[10px] font-bold text-slate-500">{isTeamTest ? 'Enabled (Scores halved for students)' : 'Disabled (Full scores awarded)'}</p>
                  </div>
                </div>

                <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Configuration</label>
                  </div>
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                    <div className="flex items-center gap-1.5 absolute top-4 right-4 z-60">
                      <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider whitespace-nowrap">Assessment Type</h4>
                      <div className="flex-1">
                        <select className="w-full bg-white border border-indigo-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none shadow-sm text-slate-800"
                          value={roundsConfig[0].type} onChange={e => {
                            const newConf = [...roundsConfig];
                            newConf[0].type = e.target.value;
                            setRoundsConfig(newConf);
                          }}>
                          <option value="GENERAL">General (Combined)</option>
                          <option value="SQL_CONTEST">SQL</option>
                          <option value="MINI_HACKATHON">Hackathon</option>
                          <option value="HTML_CSS_QUIZ">HTML/CSS</option>
                          <option value="UI_UX_CHALLENGE">UI/UX Design</option>
                          <option value="PRACTICE">🚀 Practice Arena (Personal Training)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Questions per student</label>
                      <input
                        type="number"
                        placeholder="All"
                        className="w-20 bg-white border border-indigo-100 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                        value={roundsConfig[0].questionCount}
                        onChange={e => {
                          const newConf = [...roundsConfig];
                          newConf[0].questionCount = e.target.value;
                          setRoundsConfig(newConf);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-indigo-100/30">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight italic">Max Participants (Top X Rank)</label>
                      <input
                        type="number"
                        placeholder="No Limit"
                        className="w-24 bg-white border border-indigo-100 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600 placeholder:text-slate-300"
                        value={maxParticipants}
                        onChange={e => setMaxParticipants(e.target.value)}
                      />
                    </div>
                    {roundsConfig[0].type === 'PRACTICE' && (
                      <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                        <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-amber-800 leading-tight">
                          Practice Mode: Students will see a dedicated "Attend Practice" button. Useful for orientation before the main event.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={adding} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-4">
                  {adding ? <Loader2 className="animate-spin" /> : 'Deploy Assessment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Global Confirmation Dialog */}
        {
          confirmDialog.isOpen && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
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
          )
        }

        {/* Projector Mode with live OTP */}
        {
          projectorSection && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-200 bg-slate-950 flex flex-col items-center justify-center p-10">
              <button onClick={() => setProjectorSection(null)} className="absolute top-10 right-10 text-slate-500 hover:text-white font-black tracking-[0.3em] text-xs transition-colors">[ ESC / CLOSE ]</button>
              <div className="text-center w-full max-w-6xl">
                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                  <p className="text-red-400 font-black tracking-[0.4em] uppercase text-sm">Operation Underway</p>
                </div>
                <h2 className="text-6xl md:text-8xl font-black text-white mb-12 tracking-tighter">{projectorSection.name}</h2>
                <ProjectorOtp section={projectorSection} />
              </div>
            </motion.div>
          )
        }

        {/* Sync Results Modal */}
        {
          syncResults && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Cluster Sync Report</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Cache Refresh Status</p>
                    </div>
                  </div>
                  <button onClick={() => setSyncResults(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
                  {syncResults.map((res, i) => (
                    <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      res.status === 'success' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
                    }`}>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{res.url}</p>
                        <p className={`text-[10px] font-medium ${res.status === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {res.status === 'success' ? res.message : res.error}
                        </p>
                      </div>
                      {res.status === 'success' ? (
                        <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 size={16} />
                        </div>
                      ) : (
                        <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                          <AlertTriangle size={16} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => setSyncResults(null)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    Close Report
                  </button>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >
    </div >
  );
};

export default LiveOpsTab;
