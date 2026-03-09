import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, Edit2, Check, Loader2, Mail, Phone, Calendar, Briefcase, Users2, Home, FileText, Linkedin, Github } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const ProfileModal = ({ isOpen, onClose }) => {
    const { user, updateProfile } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', dob: '', department: '',
        gender: '', accommodation: '', bio: '', linkedinProfile: '', githubProfile: ''
    });

    useEffect(() => {
        if (!isOpen) return;

        // Use a timeout to avoid synchronous setState inside render phase
        const timer = setTimeout(() => {
            if (user) {
                setFormData({
                    name: user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
                    department: user.department || '',
                    gender: user.gender || '',
                    accommodation: user.accommodation || '',
                    bio: user.bio || '',
                    linkedinProfile: user.linkedinProfile || '',
                    githubProfile: user.githubProfile || ''
                });
                setError('');
                setSuccess('');
                setIsEditing(false);
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [user, isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        const res = await updateProfile(
            formData.name, formData.email, formData.linkedinProfile, formData.githubProfile,
            formData.phone, formData.bio, formData.dob, null, // null password mapped out in UI
            formData.department, formData.gender, formData.accommodation
        );

        setLoading(false);
        if (res.success) {
            setSuccess('Profile updated successfully!');
            setTimeout(() => {
                setIsEditing(false);
                setSuccess('');
            }, 1500);
        } else {
            setError(res.error || 'Failed to update profile');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto"
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <User size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">My Profile</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Student Data Record</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs uppercase hover:bg-indigo-100 transition-colors"
                                >
                                    <Edit2 size={14} /> Edit
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Body contents */}
                    <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">

                        {(error || success) && (
                            <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2 ${success ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                {success ? <Check size={16} /> : <X size={16} />}
                                {success || error}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Required Core Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><User size={12} /> Full Name</label>
                                    <input
                                        name="name" value={formData.name} onChange={handleChange} disabled={!isEditing}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Mail size={12} /> Email Address</label>
                                    <input
                                        name="email" type="email" value={formData.email} onChange={handleChange} disabled={!isEditing}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                                    />
                                </div>
                            </div>

                            {/* Demographics */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Briefcase size={12} /> Department</label>
                                    <input
                                        name="department" value={formData.department} onChange={handleChange} disabled={!isEditing}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Users2 size={12} /> Gender</label>
                                    <select
                                        name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                                    >
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Home size={12} /> Stay Type</label>
                                    <select
                                        name="accommodation" value={formData.accommodation} onChange={handleChange} disabled={!isEditing}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                                    >
                                        <option value="">Select...</option>
                                        <option value="Hostel">Hostel</option>
                                        <option value="Day Scholar">Day Scholar</option>
                                    </select>
                                </div>
                            </div>

                            {/* Contact & Personal */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Phone size={12} /> Phone</label>
                                    <input
                                        name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} /> Date of Birth</label>
                                    <input
                                        name="dob" type="date" value={formData.dob} onChange={handleChange} disabled={!isEditing}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                                    />
                                </div>
                            </div>

                            {/* Social Links */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Linkedin size={12} /> LinkedIn</label>
                                    <input
                                        name="linkedinProfile" value={formData.linkedinProfile} onChange={handleChange} disabled={!isEditing}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                                        placeholder="https://"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Github size={12} /> GitHub</label>
                                    <input
                                        name="githubProfile" value={formData.githubProfile} onChange={handleChange} disabled={!isEditing}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                                        placeholder="https://"
                                    />
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12} /> Bio</label>
                                <textarea
                                    name="bio" value={formData.bio} onChange={handleChange} disabled={!isEditing} rows={3}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer / Save Button */}
                    {isEditing && (
                        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                SAVE CHANGES
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
            {/* Inject small global CSS for custom scrollbar in modal to maintain style consistency */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}} />
        </AnimatePresence>
    );
};

export default ProfileModal;
