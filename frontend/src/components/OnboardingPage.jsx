import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Loader2, Rocket, ShieldCheck, Phone, FileText, Lock, CheckCircle2, Calendar, Mail, Building, Users, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { DEPARTMENTS } from '../config/constants';

const formatDate = (date) => {
    if (!date) return '';

    const d = new Date(date);

    if (isNaN(d.getTime())) return '';

    return d.toISOString().split('T')[0];
};


const OnboardingPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [bio, setBio] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [gender, setGender] = useState('');
    const [accommodation, setAccommodation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { onboard, user, fetchProfile } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setDob(formatDate(user.dob) || '');
            setBio(user.bio || '');
            setDepartment(user.department || '');
            setGender(user.gender || '');
            setAccommodation(user.accommodation || '');
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (name.trim().length < 2) {
            setError('Please enter your full name');
            return;
        }

        if (password && password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');
        const res = await onboard(name, email, phone, bio, dob, password, department, gender, accommodation);
        setLoading(false);

        if (res.success) {
            navigate('/dashboard');
        } else {
            setError(res.error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-y-auto relative scrollbar-hide">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg relative z-10"
            >
                <div className="bg-white border border-slate-100 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl shadow-slate-200/60">
                    <div className="flex justify-center mb-8">
                        <div className="w-20 h-20 bg-linear-to-tr from-violet-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-violet-500/20 rotate-3 transform">
                            <Rocket className="text-white" size={40} />
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                            Welcome to the Platform
                        </h1>
                        <p className="text-slate-500 font-medium">
                            First things first, let's get to know you.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                Your Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-lg font-medium"
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="yourname@example.com"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-lg font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Enter contact number..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-base font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                    Date of Birth
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                                    <input
                                        type="date"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-base font-medium"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                Department
                            </label>
                            <div className="relative">
                                <Building className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                                <select
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-base font-medium appearance-none"
                                    required
                                >
                                    <option value="" disabled>Select Department</option>
                                    {DEPARTMENTS.map((dept) => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                    Gender
                                </label>
                                <div className="relative">
                                    <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-base font-medium appearance-none"
                                        required
                                    >
                                        <option value="" disabled>Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                    Accommodation
                                </label>
                                <div className="relative">
                                    <Home className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                                    <select
                                        value={accommodation}
                                        onChange={(e) => setAccommodation(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-base font-medium appearance-none"
                                        required
                                    >
                                        <option value="" disabled>Select Accommodation</option>
                                        <option value="Hostel">Hostel</option>
                                        <option value="Dayscholar">Dayscholar</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                Short Bio
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-5 top-5 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell us a bit about yourself..."
                                    rows={3}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-base font-medium resize-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-base font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <CheckCircle2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all text-base font-medium"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-red-400 text-sm font-bold text-center px-2"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl py-4 font-black text-lg transition-all shadow-xl shadow-violet-600/20 active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : (
                                <>
                                    Complete Profile
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={24} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            Secure Platform
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <Rocket size={14} className="text-violet-500" />
                            Fast Performance
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate-600 text-sm font-medium italic">
                        Logged in as {user?.studentId}
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default OnboardingPage;
