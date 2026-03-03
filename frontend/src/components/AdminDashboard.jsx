import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Users, Server, CheckSquare, Power, Clock, StopCircle, RefreshCw, Eye, UploadCloud, FileSpreadsheet, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDropzone } from 'react-dropzone';

const MOCK_ROUNDS = [
    { id: '1', name: 'SQL Contest', status: 'COMPLETED', startOtp: '112233', endOtp: '998877', activeStudents: 0 },
    { id: '2', name: 'HTML/CSS Quiz', status: 'RUNNING', startOtp: '458912', endOtp: null, activeStudents: 142 },
    { id: '3', name: 'UI/UX Challenge', status: 'WAITING_FOR_OTP', startOtp: '776655', endOtp: '334455', activeStudents: 0 },
    { id: '4', name: 'Debug Challenge', status: 'LOCKED', startOtp: null, endOtp: null, activeStudents: 0 },
    { id: '5', name: 'Mini Hackathon', status: 'LOCKED', startOtp: null, endOtp: null, activeStudents: 0 }
];

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [rounds, setRounds] = useState(MOCK_ROUNDS);
    const [isProcessing, setIsProcessing] = useState(false);
    const [projectorRound, setProjectorRound] = useState(null);

    const [uploadStatus, setUploadStatus] = useState('IDLE');
    const [uploadMessage, setUploadMessage] = useState('');

    const totalStudents = 250;
    const activeSessions = rounds.reduce((acc, r) => acc + r.activeStudents, 0);
    const completedRounds = rounds.filter(r => r.status === 'COMPLETED').length;

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;
        setUploadStatus('UPLOADING');
        setUploadMessage('Processing spreadsheet and generating secure credentials…');
        const formData = new FormData();
        formData.append('file', file);
        try {
            await new Promise(res => setTimeout(res, 2000));
            setUploadStatus('SUCCESS');
            setUploadMessage('Successfully processed 150 students. CSV download initiated.');
            setTimeout(() => { setUploadStatus('IDLE'); }, 5000);
        } catch (error) {
            setUploadStatus('ERROR');
            setUploadMessage(error.message || 'Fatal error during database processing.');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1
    });

    const handleGenerateOtps = async (roundId) => {
        setIsProcessing(true);
        try {
            await new Promise(res => setTimeout(res, 800));
            const newStart = Math.floor(100000 + Math.random() * 900000).toString();
            const newEnd = Math.floor(100000 + Math.random() * 900000).toString();
            setRounds(rounds.map(r => r.id === roundId ? { ...r, status: 'WAITING_FOR_OTP', startOtp: newStart, endOtp: newEnd } : r));
            setProjectorRound({ ...rounds.find(r => r.id === roundId), startOtp: newStart, endOtp: newEnd });
        } catch (error) {
            alert('Failed to generate OTPs');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEmergencyAction = (action, roundName) => {
        if (window.confirm(`WARNING: Are you sure you want to trigger [${action}] on ${roundName}?`)) {
            console.log(`Executing ${action} on ${roundName}`);
        }
    };

    const statusStyles = {
        LOCKED: 'bg-gray-100 text-gray-500 border-gray-200',
        WAITING_FOR_OTP: 'bg-amber-100 text-amber-700 border-amber-200',
        RUNNING: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200'
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-16">

            {/* Sticky NavBar */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-red-500">
                            <ShieldAlert size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Mission Control</h1>
                            <p className="text-xs text-gray-400 font-mono mt-0.5 uppercase tracking-widest">
                                {user?.name || 'Admin'} · {user?.studentId}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { if (window.confirm('Engage Global Kill Switch? This pauses all timers immediately.')) console.warn('GLOBAL PAUSE'); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-sm transition-colors"
                        >
                            <Power size={16} /> Kill Switch
                        </button>
                        <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors hover:bg-gray-50">
                            <LogOut size={14} /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                        { label: 'Total Users', value: totalStudents, icon: Users, accent: 'text-blue-500 bg-blue-50 border-blue-100' },
                        { label: 'Active Sessions', value: activeSessions, icon: Server, accent: 'text-emerald-600 bg-emerald-50 border-emerald-100', pulse: true },
                        { label: 'Items Completed', value: `${completedRounds} / 5`, icon: CheckSquare, accent: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
                    ].map(({ label, value, icon: Icon, accent, pulse }) => (
                        <div key={label} className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                                <p className={`text-4xl font-black ${pulse ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</p>
                            </div>
                            <div className={`p-4 rounded-2xl border ${accent}`}>
                                <Icon size={28} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bulk Upload */}
                <section className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                    {uploadStatus === 'UPLOADING' && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                            <Loader2 size={44} className="text-indigo-500 animate-spin mb-3" />
                            <p className="text-indigo-600 font-semibold tracking-wider">{uploadMessage}</p>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="md:w-1/3 space-y-3">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Users size={20} className="text-violet-500" /> User Operations
                            </h2>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Upload an Excel spreadsheet (.xlsx) with <strong>Name</strong> and <strong>RollNumber</strong> columns. The system auto-generates secure credentials for each student.
                            </p>
                        </div>

                        <div className="md:w-2/3 w-full">
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${uploadStatus === 'ERROR' ? 'border-red-300 bg-red-50' :
                                        uploadStatus === 'SUCCESS' ? 'border-emerald-300 bg-emerald-50' :
                                            isDragActive ? 'border-indigo-400 bg-indigo-50' :
                                                'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center justify-center space-y-3">
                                    {uploadStatus === 'SUCCESS' ? (
                                        <CheckSquare size={44} className="text-emerald-500" />
                                    ) : uploadStatus === 'ERROR' ? (
                                        <ShieldAlert size={44} className="text-red-500" />
                                    ) : (
                                        <div className="p-4 bg-gray-100 rounded-full text-gray-500">
                                            <UploadCloud size={30} />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-base font-bold text-gray-700">
                                            {uploadStatus === 'SUCCESS' ? 'Processing Complete' :
                                                uploadStatus === 'ERROR' ? 'Upload Failed' :
                                                    isDragActive ? 'Drop spreadsheet here' :
                                                        'Drag & Drop Roster Spreadsheet'}
                                        </p>
                                        <p className={`text-sm mt-1 ${uploadStatus === 'ERROR' ? 'text-red-500' : uploadStatus === 'SUCCESS' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                            {uploadMessage || 'Supports .xlsx or .xls — max 10 MB'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {uploadStatus === 'SUCCESS' && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                                    <FileSpreadsheet className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="text-emerald-700 font-bold text-sm">Action Required: Distribute CSV</p>
                                        <p className="text-emerald-600 text-xs mt-1">A CSV with generated passwords has been downloaded. Share with students immediately.</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Round Grid */}
                <section>
                    <h2 className="text-lg font-bold text-gray-700 uppercase tracking-widest mb-5">Live Operations Grid</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {rounds.map((round) => (
                            <div key={round.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 className="text-xl font-bold text-gray-900">{round.name}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusStyles[round.status]}`}>
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
                                            <p className="text-2xl font-mono font-bold text-indigo-600 tracking-widest">{round.endOtp || '——————'}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => handleGenerateOtps(round.id)}
                                            disabled={isProcessing}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} /> Generate Keys
                                        </button>

                                        <button
                                            onClick={() => setProjectorRound(round)}
                                            disabled={!round.startOtp}
                                            className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title="Projector Mode"
                                        >
                                            <Eye size={16} />
                                        </button>

                                        {round.status === 'RUNNING' && (
                                            <div className="w-full flex gap-3 mt-1">
                                                <button onClick={() => handleEmergencyAction('Extend +5m', round.name)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold transition-colors"
                                                >
                                                    <Clock size={14} /> +5 Min
                                                </button>
                                                <button onClick={() => handleEmergencyAction('Force End', round.name)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-sm font-bold transition-colors"
                                                >
                                                    <StopCircle size={14} /> Force End
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Projector Mode */}
            <AnimatePresence>
                {projectorRound && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center p-8"
                    >
                        <button onClick={() => setProjectorRound(null)}
                            className="absolute top-8 right-8 text-gray-400 hover:text-white transition-colors uppercase font-bold tracking-widest text-sm"
                        >
                            [ CLOSE ]
                        </button>

                        <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center w-full max-w-5xl">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                <p className="text-red-400 font-bold tracking-widest uppercase text-sm">Confidential Payload</p>
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
                                    <p className="text-indigo-400 font-bold tracking-widest uppercase mb-5 text-lg">END / SUBMIT OTP</p>
                                    <div className="text-8xl md:text-[9rem] font-mono font-black text-indigo-300 tracking-widest border-2 border-indigo-500/30 rounded-3xl py-12 px-8 bg-indigo-950/40 shadow-2xl">
                                        {projectorRound.endOtp}
                                    </div>
                                </div>
                            </div>

                            <p className="mt-20 text-gray-500 font-mono tracking-widest">
                                Input Start OTP to unlock environment. 1 hour strict limit enforces automatically.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
