import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, FileText, Calendar, Building, Users, Home, Loader2, Save, ArrowLeft, Sparkles, ShieldCheck, MapPin, Code } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { DEPARTMENTS } from '../config/constants';

const ProfilePage = () => {
    const { user, fetchProfile, updateProfile } = useAuthStore();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        bio: '',
        dob: '',
        department: '',
        gender: '',
        accommodation: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            const res = await fetchProfile();
            if (res.success && res.profile) {
                const profile = res.profile;
                setFormData({
                    name: profile.name || '',
                    email: profile.email || '',
                    phone: profile.phone || '',
                    bio: profile.bio || '',
                    dob: profile.dob ? new Date(profile.dob).toISOString().split('T')[0] : '',
                    department: profile.department || '',
                    gender: profile.gender || '',
                    accommodation: profile.accommodation || ''
                });
            }
            setLoading(false);
        };
        loadProfile();
    }, [fetchProfile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const res = await updateProfile(formData);
        setSaving(false);
        if (res.success) {
            toast.success('Profile updated successfully!');
        } else {
            toast.error(res.error || 'Failed to update profile');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-violet-600" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700 relative overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate('/dashboard')}
                    className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] mb-8 transition-all active:scale-95"
                >
                    <div className="p-2 rounded-xl bg-white border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all">
                        <ArrowLeft size={14} />
                    </div>
                    Back to Terminal
                </motion.button>

                <div className="flex flex-col lg:flex-row gap-10 items-start">
                    {/* Left Column: Personal Identity Header */}
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:w-[380px] w-full shrink-0 space-y-8"
                    >
                        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 border border-white/60 text-center flex flex-col items-center">
                            <motion.div 
                                whileHover={{ scale: 1.05 }}
                                className="relative group mb-8"
                            >
                                <div className="absolute -inset-1 bg-linear-to-tr from-indigo-600 to-violet-600 rounded-[2.2rem] blur opacity-25 group-hover:opacity-40 transition-all duration-500" />
                                <div className="relative w-32 h-32 bg-linear-to-tr from-indigo-600 to-violet-600 rounded-4xl flex items-center justify-center text-white font-black text-5xl shadow-xl">
                                    {formData.name ? formData.name.charAt(0) : '?'}
                                    <div className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 border-4 border-white rounded-2xl shadow-lg ring-4 ring-emerald-50">
                                        <ShieldCheck size={20} className="text-white" />
                                    </div>
                                </div>
                            </motion.div>

                            <div className="space-y-4 w-full">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase truncate w-full">
                                    {formData.name || 'Protocol Student'}
                                </h1>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                        <Code size={12} />
                                        Verified
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/50 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                        <Users size={12} />
                                        Member
                                    </span>
                                </div>
                                <div className="h-px bg-slate-100/60 w-1/2 mx-auto" />
                                <div className="flex flex-col gap-2">
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Protocol Identifier</p>
                                    <code className="bg-slate-900 text-slate-100 px-4 py-2 rounded-xl text-sm font-black tracking-widest block">
                                        {user?.studentId}
                                    </code>
                                </div>
                                <div className="pt-4">
                                    <p className="text-slate-400 font-medium leading-relaxed text-xs italic">
                                        {formData.bio || "No profile bio initialized. Information is currently categorized as 'Classified'."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats or Additional Info */}
                        <div className="bg-linear-to-br from-indigo-600 to-violet-600 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-600/20 text-white overflow-hidden relative group">
                            <Sparkles className="absolute -top-4 -right-4 text-white/10 group-hover:rotate-12 transition-transform duration-700" size={120} />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100 mb-4">Encryption Status</h4>
                            <p className="text-xl font-black leading-tight">Secure Sectors Fully Synchronized</p>
                            <div className="mt-6 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Live Monitoring Active</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Profile Configuration Form */}
                    <motion.div 
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1 w-full"
                    >
                        <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-2xl rounded-[3rem] shadow-2xl shadow-indigo-500/10 border border-white/60 p-8 sm:p-12 space-y-12">
                            {/* Section 1: Personal Identity */}
                            <section className="space-y-6">
                                <FormSectionHeader title="Personal Identity" lucideIcon={User} color="amber" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormGroup label="Display Name" name="name" lucideIcon={User} value={formData.name} onChange={handleChange} placeholder="Protocol Name" />
                                    <FormGroup label="Birth Date" name="dob" lucideIcon={Calendar} value={formData.dob} onChange={handleChange} type="date" />
                                    <FormGroup label="Biological Gender" name="gender" lucideIcon={Users} value={formData.gender} onChange={handleChange} type="select" options={["Male", "Female", "Other", "Prefer not to say"]} />
                                    <FormGroup label="Residential Status" name="accommodation" lucideIcon={Home} value={formData.accommodation} onChange={handleChange} type="select" options={["Hostel", "Dayscholar"]} />
                                </div>
                            </section>

                            {/* Section 2: Academic Credentials */}
                            <section className="space-y-6">
                                <FormSectionHeader title="Academic Credentials" lucideIcon={Building} color="indigo" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormGroup label="Department Branch" name="department" lucideIcon={Building} value={formData.department} onChange={handleChange} type="select" options={DEPARTMENTS} />
                                    <div className="relative group">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                            Operational Bio
                                        </label>
                                        <div className="relative">
                                            <FileText className="absolute left-5 top-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                            <textarea
                                                name="bio"
                                                value={formData.bio}
                                                onChange={handleChange}
                                                rows={3}
                                                className="w-full bg-slate-50 border border-slate-200/60 rounded-3xl py-4 pl-14 pr-6 font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all resize-none"
                                                placeholder="Write a brief deployment description..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 3: Contact Vector */}
                            <section className="space-y-6">
                                <FormSectionHeader title="Contact Vector" lucideIcon={MapPin} color="teal" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormGroup label="Secure Email" name="email" lucideIcon={Mail} value={formData.email} onChange={handleChange} type="email" placeholder="agent@codecircle.club" />
                                    <FormGroup label="Mobile Frequency" name="phone" lucideIcon={Phone} value={formData.phone} onChange={handleChange} type="tel" placeholder="+91 00000 00000" />
                                </div>
                            </section>

                            <div className="pt-12 border-t border-slate-100/60 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <p className="text-xs text-slate-400 font-medium flex items-center gap-2 italic">
                                    <Sparkles size={14} className="text-indigo-400" />
                                    Your data is sealed within encrypted sectors.
                                </p>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={saving}
                                    className="group relative overflow-hidden bg-slate-900 text-white rounded-2xl py-4 px-10 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 min-w-[200px]"
                                >
                                    <div className="absolute inset-0 bg-linear-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative flex items-center gap-3">
                                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        {saving ? 'Synchronizing...' : 'Upload Changes'}
                                    </div>
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

// Sub-component for form sections to keep the landscape code readable
const FormSectionHeader = ({ title, lucideIcon: Icon, color }) => {
    const colors = {
        amber: 'bg-amber-50 text-amber-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        teal: 'bg-teal-50 text-teal-600'
    };
    return (
        <div className="flex items-center gap-3 mb-8">
            <div className={`p-2 rounded-xl ${colors[color]}`}>
                <Icon size={18} />
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
            <div className="flex-1 h-px bg-slate-100/60 ml-2" />
        </div>
    );
};

// Helper component for form inputs to keep the code clean and premium
const FormGroup = ({ label, name, lucideIcon: Icon, value, onChange, type = "text", options = [], placeholder = "" }) => (
    <div className="relative group">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
            {label}
        </label>
        <div className="relative">
            <Icon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            {type === "select" ? (
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.2rem] py-4 pl-14 pr-10 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all appearance-none cursor-pointer"
                    required
                >
                    <option value="" disabled>Initialize {label}</option>
                    {options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.2rem] py-4 pl-14 pr-6 font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all"
                    required
                    placeholder={placeholder}
                />
            )}
            {type === "select" && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Save size={14} className="rotate-90" /> {/* Just a visual arrow-like element */}
                </div>
            )}
        </div>
    </div>
);

export default ProfilePage;
