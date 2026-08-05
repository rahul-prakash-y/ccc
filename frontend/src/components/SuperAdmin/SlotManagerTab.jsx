import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Clock, Plus, Trash2, Loader2, X, Users, Calendar,
    CheckCircle, XCircle, MessageSquare, ArrowRight,
    Edit3, Save, AlertTriangle, Timer
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import toast from 'react-hot-toast';

// ── Format ISO Date String to 'YYYY-MM-DDTHH:mm' in IST (Asia/Kolkata) for input ──────────────
const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type) => parts.find(p => p.type === type)?.value || '00';

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const rawHour = getPart('hour');
    const hour = rawHour === '24' ? '00' : rawHour;
    const minute = getPart('minute');

    return `${year}-${month}-${day}T${hour}:${minute}`;
};

// ── Convert datetime-local input string (in IST) to UTC ISO string ───────────────────
const istInputToISO = (datetimeLocalVal) => {
    if (!datetimeLocalVal) return '';
    const istDate = new Date(datetimeLocalVal.includes('+') ? datetimeLocalVal : `${datetimeLocalVal}:00+05:30`);
    return istDate.toISOString();
};

const formatSlotTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

// ── Slot Card ─────────────────────────────────────────────────────────────────
const SlotCard = ({ slot, onEdit, onDelete, busy }) => {
    const now = new Date();
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    const isActive = now >= start && now <= end;
    const isPast = now > end;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`bg-white border rounded-2xl p-5 transition-all relative overflow-hidden group
                ${isActive ? 'border-emerald-300 ring-4 ring-emerald-50' :
                  isPast ? 'border-slate-200 opacity-60' : 'border-indigo-200 hover:border-indigo-300'}`}
        >
            {/* Status Indicator */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : isPast ? 'bg-slate-300' : 'bg-indigo-500'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-600' : isPast ? 'text-slate-400' : 'text-indigo-500'}`}>
                        {isActive ? 'Active Now' : isPast ? 'Completed' : 'Upcoming'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onEdit(slot)}
                        className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                        <Edit3 size={12} />
                    </button>
                    <button
                        onClick={() => onDelete(slot._id)}
                        disabled={busy}
                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                </div>
            </div>

            {/* Label */}
            <h3 className="text-base font-bold text-slate-800 mb-3 tracking-tight">{slot.label}</h3>

            {/* Time Window */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Timer size={14} className="text-indigo-500 shrink-0" />
                <div className="text-xs">
                    <span className="font-bold text-slate-700">{formatSlotTime(slot.startTime)}</span>
                    <span className="text-slate-400 mx-1.5">→</span>
                    <span className="font-bold text-slate-700">{formatSlotTime(slot.endTime)}</span>
                </div>
            </div>

            {/* Teams */}
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Assigned Teams</p>
                {slot.teams?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {slot.teams.map(team => (
                            <span
                                key={team._id}
                                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100 capitalize"
                            >
                                {team.name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 italic">No teams assigned</p>
                )}
            </div>
        </motion.div>
    );
};

// ── Create/Edit Slot Modal ───────────────────────────────────────────────────
const SlotModal = ({ isOpen, onClose, slot, roundId, teams, onSave }) => {
    const [label, setLabel] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [selectedTeams, setSelectedTeams] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (slot) {
            setLabel(slot.label || '');
            setStartTime(formatDateForInput(slot.startTime));
            setEndTime(formatDateForInput(slot.endTime));
            setSelectedTeams(slot.teams?.map(t => t._id || t) || []);
        } else {
            setLabel('');
            setStartTime('');
            setEndTime('');
            setSelectedTeams([]);
        }
    }, [slot, isOpen]);

    const handleSubmit = async () => {
        if (!label || !startTime || !endTime) {
            toast.error('Please fill all required fields');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                label,
                startTime: istInputToISO(startTime),
                endTime: istInputToISO(endTime),
                teams: selectedTeams
            };

            if (slot?._id) {
                await api.patch(`${API}/slots/${slot._id}`, payload);
                toast.success('Slot updated');
            } else {
                await api.post(`${API}/slots`, { ...payload, round: roundId });
                toast.success('Slot created');
            }

            onSave();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save slot');
        } finally {
            setSaving(false);
        }
    };

    const toggleTeam = (teamId) => {
        setSelectedTeams(prev =>
            prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
        );
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 10 }}
                    className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-indigo-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Clock size={18} />
                            </div>
                            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-tight">
                                {slot?._id ? 'Edit Slot' : 'Create New Slot'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-5">
                        {/* Label */}
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Slot Label *</label>
                            <input
                                type="text"
                                value={label}
                                onChange={e => setLabel(e.target.value)}
                                placeholder="e.g. Slot A — Morning Batch"
                                className="w-full text-sm font-medium bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
                            />
                        </div>

                        {/* Time Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Start Time *</label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">End Time *</label>
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                                />
                            </div>
                        </div>

                        {/* Team Selection */}
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Assign Teams</label>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                                {teams.length > 0 ? teams.map(team => (
                                    <label
                                        key={team._id}
                                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border
                                            ${selectedTeams.includes(team._id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:border-slate-200'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTeams.includes(team._id)}
                                            onChange={() => toggleTeam(team._id)}
                                            className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-bold text-slate-700 capitalize">{team.name}</span>
                                        <span className="text-[9px] text-slate-400 ml-auto">{team.members?.length || 0} members</span>
                                    </label>
                                )) : (
                                    <p className="text-xs text-slate-400 italic text-center py-3">No teams found</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || !label || !startTime || !endTime}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-200"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {slot?._id ? 'Update' : 'Create'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ── Slot Change Request Card ──────────────────────────────────────────────────
const ChangeRequestCard = ({ req, onAction, busy }) => {
    const [note, setNote] = useState('');

    const statusStyle = {
        PENDING: 'bg-amber-50 border-amber-200 text-amber-700',
        APPROVED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        REJECTED: 'bg-red-50 border-red-200 text-red-700'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 transition-all"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-sm font-bold text-slate-800">
                        {req.student?.name || 'Unknown Student'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase">
                        {req.student?.studentId} · {req.round?.name || 'Unknown Round'}
                    </p>
                </div>
                <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${statusStyle[req.status]}`}>
                    {req.status}
                </span>
            </div>

            {/* Slot Change Arrow */}
            <div className="flex items-center gap-3 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Current</p>
                    <p className="text-xs font-bold text-slate-700">{req.currentSlot?.label || '—'}</p>
                    <p className="text-[10px] text-slate-400">{formatSlotTime(req.currentSlot?.startTime)}</p>
                </div>
                <ArrowRight size={16} className="text-indigo-400 shrink-0" />
                <div className="flex-1">
                    <p className="text-[8px] font-black text-indigo-500 uppercase mb-0.5">Requested</p>
                    <p className="text-xs font-bold text-indigo-700">{req.requestedSlot?.label || '—'}</p>
                    <p className="text-[10px] text-indigo-400">{formatSlotTime(req.requestedSlot?.startTime)}</p>
                </div>
            </div>

            {/* Reason */}
            <div className="flex items-start gap-2 mb-3">
                <MessageSquare size={12} className="text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">{req.reason}</p>
            </div>

            {/* Admin Actions (only if PENDING) */}
            {req.status === 'PENDING' && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <input
                        type="text"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Admin note (optional)..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => onAction(req._id, 'APPROVED', note)}
                            disabled={busy}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            Approve
                        </button>
                        <button
                            onClick={() => onAction(req._id, 'REJECTED', note)}
                            disabled={busy}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 border border-red-100"
                        >
                            {busy ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            Reject
                        </button>
                    </div>
                </div>
            )}

            {/* Admin Note (if processed) */}
            {req.adminNote && req.status !== 'PENDING' && (
                <div className="mt-2 p-2 bg-slate-50 rounded-lg text-[10px] text-slate-500">
                    <span className="font-bold">Admin Note:</span> {req.adminNote}
                </div>
            )}
        </motion.div>
    );
};

// ── Main SlotManagerTab ───────────────────────────────────────────────────────
const SlotManagerTab = () => {
    const [rounds, setRounds] = useState([]);
    const [teams, setTeams] = useState([]);
    const [selectedRound, setSelectedRound] = useState('');
    const [slots, setSlots] = useState([]);
    const [changeRequests, setChangeRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState(null);
    const [busy, setBusy] = useState({});
    const [activePanel, setActivePanel] = useState('slots'); // 'slots' | 'requests'

    // Fetch rounds list
    const fetchRounds = useCallback(async () => {
        try {
            const res = await api.get(`${API}/rounds`);
            setRounds(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch rounds:', e);
        }
    }, []);

    // Fetch teams
    const fetchTeams = useCallback(async () => {
        try {
            const res = await api.get(`${API}/teams`);
            setTeams(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch teams:', e);
        }
    }, []);

    // Fetch slots for selected round
    const fetchSlots = useCallback(async () => {
        if (!selectedRound) { setSlots([]); return; }
        setLoading(true);
        try {
            const res = await api.get(`${API}/slots/${selectedRound}`);
            setSlots(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch slots:', e);
        } finally {
            setLoading(false);
        }
    }, [selectedRound]);

    // Fetch change requests
    const fetchRequests = useCallback(async () => {
        setRequestsLoading(true);
        try {
            const query = selectedRound ? `?roundId=${selectedRound}` : '';
            const res = await api.get(`${API}/slot-change-requests${query}`);
            setChangeRequests(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch change requests:', e);
        } finally {
            setRequestsLoading(false);
        }
    }, [selectedRound]);

    useEffect(() => { fetchRounds(); fetchTeams(); }, [fetchRounds, fetchTeams]);
    useEffect(() => { fetchSlots(); fetchRequests(); }, [fetchSlots, fetchRequests]);

    const handleDeleteSlot = async (slotId) => {
        if (!confirm('Delete this slot?')) return;
        setBusy(prev => ({ ...prev, [slotId]: true }));
        try {
            await api.delete(`${API}/slots/${slotId}`);
            toast.success('Slot deleted');
            fetchSlots();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to delete');
        } finally {
            setBusy(prev => ({ ...prev, [slotId]: false }));
        }
    };

    const handleRequestAction = async (requestId, status, adminNote) => {
        setBusy(prev => ({ ...prev, [requestId]: true }));
        try {
            await api.patch(`${API}/slot-change-requests/${requestId}`, { status, adminNote });
            toast.success(`Request ${status.toLowerCase()}`);
            fetchRequests();
            fetchSlots(); // Refresh slots since team assignments may have changed
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to process request');
        } finally {
            setBusy(prev => ({ ...prev, [requestId]: false }));
        }
    };

    const pendingCount = changeRequests.filter(r => r.status === 'PENDING').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Slot Timing Manager</h3>
                    <p className="text-xs text-slate-500 mt-1">Create time slots for rounds, assign teams, and manage slot change requests.</p>
                </div>
            </div>

            {/* Round Selector + Panel Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full sm:w-auto">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Select Round</label>
                    <select
                        value={selectedRound}
                        onChange={e => setSelectedRound(e.target.value)}
                        className="w-full text-sm font-medium bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
                    >
                        <option value="">Choose a round...</option>
                        {rounds.filter(r => r.type !== 'PRACTICE').map(r => (
                            <option key={r._id} value={r._id}>{r.name}</option>
                        ))}
                    </select>
                </div>

                {/* Panel Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                    <button
                        onClick={() => setActivePanel('slots')}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all
                            ${activePanel === 'slots' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Clock size={12} className="inline mr-1.5" />
                        Slots
                    </button>
                    <button
                        onClick={() => setActivePanel('requests')}
                        className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all relative
                            ${activePanel === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <MessageSquare size={12} className="inline mr-1.5" />
                        Requests
                        {pendingCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* No Round Selected */}
            {!selectedRound && (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                    <Calendar size={48} className="text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400">Select a round to manage its time slots</p>
                </div>
            )}

            {/* ── Slots Panel ──────────────────────────────────────────────── */}
            {selectedRound && activePanel === 'slots' && (
                <div>
                    {/* Add Slot Button */}
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {slots.length} slot{slots.length !== 1 ? 's' : ''} configured
                        </p>
                        <button
                            onClick={() => { setEditingSlot(null); setModalOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-200"
                        >
                            <Plus size={14} /> New Slot
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-indigo-400" />
                        </div>
                    ) : slots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                            <Clock size={40} className="text-slate-200 mb-3" />
                            <p className="text-sm font-bold text-slate-400">No slots created yet</p>
                            <p className="text-xs text-slate-400 mt-1">Click "New Slot" to create one.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <AnimatePresence>
                                {slots.map(slot => (
                                    <SlotCard
                                        key={slot._id}
                                        slot={slot}
                                        onEdit={(s) => { setEditingSlot(s); setModalOpen(true); }}
                                        onDelete={handleDeleteSlot}
                                        busy={busy[slot._id]}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            )}

            {/* ── Change Requests Panel ────────────────────────────────────── */}
            {selectedRound && activePanel === 'requests' && (
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        {changeRequests.length} request{changeRequests.length !== 1 ? 's' : ''}
                        {pendingCount > 0 && <span className="text-amber-600 ml-2">({pendingCount} pending)</span>}
                    </p>

                    {requestsLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-indigo-400" />
                        </div>
                    ) : changeRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                            <MessageSquare size={40} className="text-slate-200 mb-3" />
                            <p className="text-sm font-bold text-slate-400">No slot change requests</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {changeRequests.map(req => (
                                <ChangeRequestCard
                                    key={req._id}
                                    req={req}
                                    onAction={handleRequestAction}
                                    busy={busy[req._id]}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Slot Modal */}
            <SlotModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingSlot(null); }}
                slot={editingSlot}
                roundId={selectedRound}
                teams={teams}
                onSave={fetchSlots}
            />
        </div>
    );
};

export default SlotManagerTab;
