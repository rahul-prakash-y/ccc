import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, Loader2, AlertTriangle, X, Check,
    Users, Trash2, Search, UserPlus, UserMinus
} from 'lucide-react';
import { api } from '../../store/authStore';
import { SkeletonList } from '../Skeleton';
import toast from 'react-hot-toast';
import { useConfirm } from '../../store/confirmStore';

const API = '/superadmin';

const TeamManagerTab = () => {
    const [teams, setTeams] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { showConfirm } = useConfirm();

    const fetchTeams = useCallback(async () => {
        try {
            const res = await api.get(`${API}/teams`);
            setTeams(res.data.data || []);
        } catch {
            toast.error("Failed to load teams");
        }
    }, []);

    const fetchStudents = useCallback(async () => {
        try {
            const res = await api.get(`${API}/students?limit=100`);
            setStudents(res.data.data || []);
        } catch {
            toast.error("Failed to load students");
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchTeams(), fetchStudents()]);
            setLoading(false);
        };
        init();
    }, [fetchTeams, fetchStudents]);

    const handleDeleteTeam = async (team) => {
        const confirmed = await showConfirm({
            title: `Delete Team: ${team.name}?`,
            message: "All members will be unassigned from this team. This cannot be undone.",
            actionLabel: "Delete Team",
            isDestructive: true
        });

        if (confirmed) {
            try {
                await api.delete(`${API}/teams/${team._id}`);
                setTeams(prev => prev.filter(t => t._id !== team._id));
                toast.success("Team deleted");
            } catch {
                toast.error("Failed to delete team");
            }
        }
    };

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.members.some(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || m.studentId?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Squad Management</h2>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">Teams & Groupings</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search teams or members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all font-bold"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        <Plus size={18} /> Create Team
                    </button>
                </div>
            </div>

            {loading ? (
                <SkeletonList count={5} />
            ) : filteredTeams.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No teams found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-medium">Create your first team to start grouping students for collective scoring.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map(team => (
                        <TeamCard
                            key={team._id}
                            team={team}
                            allStudents={students}
                            onUpdate={fetchTeams}
                            onDelete={() => handleDeleteTeam(team)}
                        />
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showAddModal && (
                    <TeamDialog
                        onClose={() => setShowAddModal(false)}
                        onCreated={() => { fetchTeams(); setShowAddModal(false); }}
                        allStudents={students}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const TeamCard = ({ team, allStudents, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group overflow-hidden"
        >
            <div className="p-6 border-b border-slate-50 flex justify-between items-start bg-indigo-50/30">
                <div>
                    <h3 className="font-black text-slate-800 text-lg tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{team.name}</h3>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{team.members?.length || 0} Members</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm">
                        <UserPlus size={16} />
                    </button>
                    <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-3">
                {team.members?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {team.members.map(member => (
                            <div key={member._id} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2 group/member">
                                <span className="text-[10px] font-black text-slate-700 uppercase">{member.name}</span>
                                <span className="text-[9px] font-bold text-slate-400 font-mono">{member.studentId}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 font-medium italic">No students assigned yet</p>
                )}
            </div>

            <AnimatePresence>
                {isEditing && (
                    <TeamDialog
                        team={team}
                        onClose={() => setIsEditing(false)}
                        onCreated={onUpdate}
                        allStudents={allStudents}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const TeamDialog = ({ team, onClose, onCreated, allStudents }) => {
    const isEdit = !!team;
    const [name, setName] = useState(team?.name || '');
    const [selectedMembers, setSelectedMembers] = useState(team?.members?.map(m => m._id) || []);
    const [saving, setSaving] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            const payload = { name, members: selectedMembers };
            if (isEdit) {
                await api.put(`${API}/teams/${team._id}`, payload);
            } else {
                await api.post(`${API}/teams`, payload);
            }
            toast.success(isEdit ? "Team updated" : "Team created");
            onCreated();
        } catch (err) {
            toast.error(err.response?.data?.error || "Operation failed");
        } finally {
            setSaving(false);
        }
    };

    const toggleMember = (id) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
        );
    };

    const filteredStudents = allStudents.filter(s =>
        s.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(memberSearch.toLowerCase())
    ).slice(0, 10); // Limit results for performance

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border border-slate-200 rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">{isEdit ? 'Edit Team Assignment' : 'Generate New Team'}</h2>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Squad Configuration</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white border border-slate-100 text-slate-400 hover:text-slate-600 rounded-full shadow-sm transition-all"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Team Name */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Team Identity</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Cyber Ninjas"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 text-lg font-black focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                        />
                    </div>

                    {/* Member Selection */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end pl-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Squad Roster ({selectedMembers.length})</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                                <input
                                    type="text"
                                    placeholder="Find students..."
                                    value={memberSearch}
                                    onChange={(e) => setMemberSearch(e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-500 w-40 transition-all"
                                />
                            </div>
                        </div>

                        {/* Selected Members Preview */}
                        <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                            {selectedMembers.length === 0 ? (
                                <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mx-auto self-center">No members selected</p>
                            ) : (
                                selectedMembers.map(sid => {
                                    const student = allStudents.find(s => s._id === sid) || team?.members?.find(m => m._id === sid);
                                    return (
                                        <div key={sid} className="bg-white border border-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-200">
                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{student?.name || 'Unregistered'}</span>
                                            <button type="button" onClick={() => toggleMember(sid)} className="text-indigo-300 hover:text-red-500 transition-colors"><X size={12} /></button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Search Results */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredStudents.map(student => {
                                const isSelected = selectedMembers.includes(student._id);
                                return (
                                    <button
                                        key={student._id}
                                        type="button"
                                        onClick={() => toggleMember(student._id)}
                                        className={`p-3 rounded-xl border flex items-center justify-between transition-all text-left ${isSelected
                                            ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10'
                                            : 'bg-white border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        <div>
                                            <p className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{student.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 font-mono">{student.studentId}</p>
                                        </div>
                                        {isSelected ? <Check size={14} className="text-indigo-600" /> : <Plus size={14} className="text-slate-300" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 shrink-0">
                        <button type="button" onClick={onClose} className="flex-1 py-4 font-black text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors">Abort</button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="flex-2 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                            {isEdit ? 'Save Changes' : 'Initialize Team'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default TeamManagerTab;
