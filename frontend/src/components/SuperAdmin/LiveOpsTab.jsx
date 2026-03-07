import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, PlayCircle, Eye, Loader2, StopCircle,
  Clock, CheckCircle2, Plus, AlertTriangle, Trash2, X, Timer, Shuffle, Settings2,
  KeyRound,
  Play, LayoutGrid
} from 'lucide-react';
import { api } from '../../store/authStore';
import { useRoundStore } from '../../store/roundStore';
import { API, STATUS_COLORS } from './constants';
import { SkeletonGrid } from '../Skeleton';

// ── Per-section OTP panel with live countdown ───────────────────────────────────
const OtpPanel = ({ section, onOtpChange }) => {
  const [otp, setOtp] = useState({ startOtp: section.startOtp, endOtp: section.endOtp, secondsLeft: null });
  const [flashing, setFlashing] = useState(false);
  const prevOtpRef = useRef(section.startOtp);
  const active = section.status === 'WAITING_FOR_OTP' || section.status === 'RUNNING';

  const poll = useCallback(async () => {
    if (!active) return;
    try {
      const res = await api.get(`/rounds/${section._id}/refresh-otp`);
      const d = res.data.data;
      if (d.startOtp !== prevOtpRef.current) {
        setFlashing(true);
        setTimeout(() => setFlashing(false), 800);
        prevOtpRef.current = d.startOtp;
        onOtpChange?.(section._id, d);
      }
      setOtp({ startOtp: d.startOtp, endOtp: d.endOtp, secondsLeft: d.secondsLeft });
    } catch {
      // Fallback to section data if refresh fails (might be stale but better than empty)
      setOtp(prev => ({ ...prev, startOtp: section.startOtp, endOtp: section.endOtp }));
    }
  }, [active, section._id, section.startOtp, section.endOtp, onOtpChange]);

  useEffect(() => {
    if (!active) return;
    // Initial fetch pushed to next tick to avoid cascading renders
    const init = setTimeout(poll, 0);
    const t = setInterval(poll, 5000);
    return () => {
      clearTimeout(init);
      clearInterval(t);
    };
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
          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Start Auth OTP</p>
          <p className="text-lg font-mono font-bold text-slate-700 tracking-widest">{section.startOtp || '------'}</p>
        </div>
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-center">
          <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Final Auth OTP</p>
          <p className="text-lg font-mono font-bold text-indigo-600 tracking-widest">{section.endOtp || '------'}</p>
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
        Auto-rotates every 60s
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
const QuestionSettings = ({ section, onSave, busy }) => {
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

// ── A unified Test Card representing a group of sections ─────────────────────────
const TestCard = ({ group, busy, onAct, onSaveSettings, onDeleteGroup, onAddTime, onDeleteSection, onProjector }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const section = group.sections[activeIdx] || group.sections[0];
  const isMulti = group.sections.length > 1;

  return (
    <motion.div
      layout
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 transition-all shadow-sm flex flex-col h-full"
    >
      {/* Card Header: Group/Test Name */}
      <div className="p-5 pb-3 border-b border-slate-50">
        <div className="flex justify-between items-start mb-1">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-900 truncate tracking-tight">{group.name}</h3>
            {group.testGroupId && (
              <p className="text-[9px] text-slate-400 font-mono uppercase">ID: {group.testGroupId}</p>
            )}
          </div>
          <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border shrink-0 ml-2 ${STATUS_COLORS[section.status] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            {section.status.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={12} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            {section.testDurationMinutes || section.durationMinutes} MIN (GLOBAL)
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {/* Section Selector for Multi-section Tests */}
        {isMulti && (
          <div className="flex flex-wrap gap-1.5 mb-4 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
            {group.sections.map((s, idx) => (
              <button
                key={s._id}
                onClick={() => setActiveIdx(idx)}
                className={`flex-1 min-w-[60px] py-1 px-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeIdx === idx
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
              >
                Section {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Live OTP Panel */}
        <OtpPanel section={section} />

        {/* Question Settings */}
        <QuestionSettings
          section={section}
          onSave={onSaveSettings}
          busy={busy[`${section._id}-qsettings`]}
        />

        {/* Action Toolbar */}
        <div className="mt-auto pt-4 border-t border-slate-50 flex flex-wrap items-center gap-2">
          {section.status === 'LOCKED' && (
            <button
              onClick={() => onAct(section._id, 'generate-otp')}
              disabled={busy[`${section._id}-generate-otp`]}
              className="flex-1 h-10 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              <KeyRound size={14} /> Initialize Keys
            </button>
          )}

          {section.status === 'WAITING_FOR_OTP' && (
            <button
              onClick={() => onAct(section._id, 'status', 'PATCH', { status: 'RUNNING' })}
              disabled={busy[`${section._id}-start`]}
              className="flex-1 h-10 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              <Play size={14} /> Activate
            </button>
          )}

          {section.status === 'RUNNING' && (
            <div className="flex-1 flex gap-2">
              <button
                onClick={() => onAddTime(section)}
                className="flex-1 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                + Time
              </button>
              <button
                onClick={() => onAct(section, 'FORCE_END')}
                className="flex-1 h-10 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <StopCircle size={14} /> Kill
              </button>
            </div>
          )}

          {(section.status === 'WAITING_FOR_OTP' || section.status === 'RUNNING') && (
            <button
              onClick={onProjector}
              className="h-10 w-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all shadow-sm"
              title="Projector Mode"
            >
              <Eye size={16} />
            </button>
          )}

          <button
            onClick={() => isMulti ? onDeleteSection(section) : onDeleteGroup(group)}
            disabled={busy[`${section._id}-delete`] || busy[`${group.id}-delete`]}
            className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            {(busy[`${section._id}-delete`] || busy[`${group.id}-delete`]) ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const LiveOpsTab = () => {
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

  const handleTestCardAction = (sectionOrId, action, method, body) => {
    if (action === 'FORCE_END') {
      handleForceEnd(sectionOrId);
    } else {
      act(sectionOrId, action, method, body);
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
        maxParticipants: maxParticipants === '' ? null : Number(maxParticipants)
      });
      setShowAddModal(false);
      setTestName('');
      setTestDurationMinutes(60);
      setIsTeamTest(false);
      setMaxParticipants('');
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
          <Plus size={18} /> Create Test
        </button>
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
            onDeleteGroup={handleDeleteGroup}
            onAddTime={handleAddTime}
            onDeleteSection={handleDeleteSection}
            onProjector={() => setProjectorSection(group.sections[0])}
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
      </AnimatePresence >
    </div >
  );
};

export default LiveOpsTab;
