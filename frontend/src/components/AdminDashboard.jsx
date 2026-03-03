import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Users, Server, CheckSquare, Power, Clock, StopCircle, RefreshCw, Eye, UploadCloud, FileSpreadsheet, Loader2 } from 'lucide-react';
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

    // Bulk Upload State
    const [uploadStatus, setUploadStatus] = useState('IDLE'); // IDLE, UPLOADING, SUCCESS, ERROR
    const [uploadMessage, setUploadMessage] = useState('');

    // Stats
    const totalStudents = 250;
    const activeSessions = rounds.reduce((acc, r) => acc + r.activeStudents, 0);
    const completedRounds = rounds.filter(r => r.status === 'COMPLETED').length;

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploadStatus('UPLOADING');
        setUploadMessage('Processing spreadsheet and generating secure credentials...');

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Mock Fastify POST /api/admin/bulk-upload-students
            /*
            const response = await fetch('/api/admin/bulk-upload-students', {
               method: 'POST',
               headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
               body: formData
            });
            
            if (!response.ok) {
               const errData = await response.json();
               throw new Error(errData.error || 'Upload failed');
            }

            // Automatically trigger the browser to download the returned CSV Blob
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'generated_student_credentials.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            */

            // Mock processing latency
            await new Promise(res => setTimeout(res, 2000));

            setUploadStatus('SUCCESS');
            setUploadMessage('Successfully processed 150 students. CSV Download initiated.');

            setTimeout(() => { setUploadStatus('IDLE'); }, 5000);

        } catch (error) {
            console.error(error);
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
            // Mock Fastify POST /api/rounds/:roundId/generate-otp
            /*
            const response = await fetch(`/api/rounds/${roundId}/generate-otp`, {
               method: 'POST',
               headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            */

            await new Promise(res => setTimeout(res, 800));

            // Mock Data Update
            const newStart = Math.floor(100000 + Math.random() * 900000).toString();
            const newEnd = Math.floor(100000 + Math.random() * 900000).toString();

            setRounds(rounds.map(r => {
                if (r.id === roundId) return { ...r, status: 'WAITING_FOR_OTP', startOtp: newStart, endOtp: newEnd };
                return r;
            }));

            // Auto-open projector mode for newly generated OTPs
            setProjectorRound({ ...rounds.find(r => r.id === roundId), startOtp: newStart, endOtp: newEnd });

        } catch (error) {
            console.error(error);
            alert("Failed to generate OTPs");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEmergencyAction = (action, roundName) => {
        if (window.confirm(`WARNING: Are you sure you want to trigger [${action}] on ${roundName}?`)) {
            console.log(`Executing ${action} on ${roundName}`);
            // Mock API call to control endpoints...
        }
    };

    const statusColors = {
        LOCKED: 'text-gray-500 bg-gray-900/50 border-gray-700',
        WAITING_FOR_OTP: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50',
        RUNNING: 'text-emerald-400 bg-emerald-900/30 border-emerald-500/50',
        COMPLETED: 'text-cyan-400 bg-cyan-900/30 border-cyan-500/50'
    };

    return (
        <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-red-500/30 pb-12 pt-8">

            <div className="max-w-7xl mx-auto px-6 space-y-8">

                {/* Mission Control Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/80 pb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-500">
                            <ShieldAlert size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white">MISSION CONTROL</h1>
                            <p className="text-sm font-mono text-gray-400 mt-1 uppercase tracking-widest">
                                {user?.name || 'Authorized Admin'} • {user?.studentId || 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (window.confirm("ENGAGE GLOBAL KILL SWITCH? This pauses all timers immediately.")) {
                                    console.warn("GLOBAL PAUSE ENGAGED");
                                }
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-950/80 hover:bg-red-600 border border-red-900/50 hover:border-red-500 text-red-500 hover:text-white font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(220,38,38,0.15)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                        >
                            <Power size={18} /> Kill Switch
                        </button>
                        <button onClick={logout} className="px-4 py-2.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-400 transition-colors uppercase text-sm font-bold tracking-wider">
                            Logout
                        </button>
                    </div>
                </header>

                {/* Top Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#0b0b12] border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-bold tracking-widest uppercase mb-1">Total Users</p>
                            <p className="text-4xl font-black text-white">{totalStudents}</p>
                        </div>
                        <div className="p-4 bg-blue-950/30 rounded-full text-blue-500"><Users size={32} /></div>
                    </div>

                    <div className="bg-[#0b0b12] border border-emerald-900/30 rounded-2xl p-6 flex items-center justify-between shadow-[0_0_30px_rgba(16,185,129,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                        <div className="relative z-10">
                            <p className="text-emerald-500/80 text-sm font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Sessions
                            </p>
                            <p className="text-4xl font-black text-emerald-400">{activeSessions}</p>
                        </div>
                        <div className="p-4 bg-emerald-950/30 rounded-full text-emerald-500 relative z-10"><Server size={32} /></div>
                    </div>

                    <div className="bg-[#0b0b12] border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-bold tracking-widest uppercase mb-1">Items Completed</p>
                            <p className="text-4xl font-black text-white">{completedRounds} / 5</p>
                        </div>
                        <div className="p-4 bg-cyan-950/30 rounded-full text-cyan-500"><CheckSquare size={32} /></div>
                    </div>
                </div>

                {/* Bulk User Upload Zone */}
                <section className="bg-[#0b0b12] border border-gray-800 rounded-2xl p-8 relative overflow-hidden">
                    {uploadStatus === 'UPLOADING' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                            <Loader2 size={48} className="text-cyan-500 animate-spin mb-4" />
                            <p className="text-cyan-400 font-mono tracking-widest uppercase font-bold">{uploadMessage}</p>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="md:w-1/3 space-y-4">
                            <h2 className="text-2xl font-bold font-mono tracking-widest text-white uppercase flex items-center gap-3">
                                <Users className="text-purple-500" />
                                User Operations
                            </h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Upload a strict Excel Spreadsheet (.xlsx) containing columns for <strong className="text-gray-300">Name</strong> and <strong className="text-gray-300">RollNumber</strong>.
                                The system will auto-generate secure 8-character cryptographic login credentials for each student.
                            </p>
                        </div>

                        <div className="md:w-2/3 w-full">
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${uploadStatus === 'ERROR' ? 'border-red-500/50 bg-red-950/20' :
                                        uploadStatus === 'SUCCESS' ? 'border-emerald-500/50 bg-emerald-950/20' :
                                            isDragActive ? 'border-purple-500 bg-purple-950/20' : 'border-gray-700 hover:border-purple-500/50 hover:bg-white/5'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    {uploadStatus === 'SUCCESS' ? (
                                        <CheckSquare size={48} className="text-emerald-500" />
                                    ) : uploadStatus === 'ERROR' ? (
                                        <ShieldAlert size={48} className="text-red-500" />
                                    ) : (
                                        <div className="p-4 bg-gray-900 rounded-full text-gray-400 group-hover:text-purple-400 transition-colors">
                                            <UploadCloud size={32} />
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-lg font-bold text-gray-200">
                                            {uploadStatus === 'SUCCESS' ? 'Processing Complete' :
                                                uploadStatus === 'ERROR' ? 'Upload Failed' :
                                                    isDragActive ? 'Drop Spreadsheet Here' : 'Drag & Drop Roster Spreadsheet'}
                                        </p>
                                        <p className={`text-sm mt-1 font-mono ${uploadStatus === 'ERROR' ? 'text-red-400' :
                                                uploadStatus === 'SUCCESS' ? 'text-emerald-400' : 'text-gray-500'
                                            }`}>
                                            {uploadMessage || 'Supports .xlsx or .xls (Max 10MB)'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {uploadStatus === 'SUCCESS' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-start gap-3">
                                    <FileSpreadsheet className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="text-emerald-400 font-bold text-sm">Action Required: Secure Distribution</p>
                                        <p className="text-emerald-500/80 text-xs mt-1">A CSV payload containing the generated Passwords has been automatically downloaded to your machine. Distribute these credentials to students immediately.</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Round Control Grid */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold font-mono tracking-widest text-gray-300 uppercase">Live Operations Grid</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {rounds.map((round) => (
                            <div key={round.id} className="bg-[#0a0a0f] border border-gray-800 rounded-2xl overflow-hidden shadow-xl hover:border-gray-700 transition-colors">

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-2xl font-bold tracking-tight text-white">{round.name}</h3>
                                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${statusColors[round.status]}`}>
                                            {round.status.replace(/_/g, ' ')}
                                        </div>
                                    </div>

                                    {/* OTP & Generator Row */}
                                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                        <div className="flex-1 bg-black/60 rounded-xl border border-gray-800/80 p-4">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Start OTP</p>
                                            <p className="text-3xl font-mono text-white tracking-[0.2em]">{round.startOtp || '------'}</p>
                                        </div>
                                        <div className="flex-1 bg-black/60 rounded-xl border border-gray-800/80 p-4">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">End OTP</p>
                                            <p className="text-3xl font-mono text-cyan-400 tracking-[0.2em]">{round.endOtp || '------'}</p>
                                        </div>
                                    </div>

                                    {/* Actions Row */}
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => handleGenerateOtps(round.id)}
                                            disabled={isProcessing}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-950 border border-cyan-800 hover:bg-cyan-900 text-cyan-400 font-bold rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw size={18} className={isProcessing ? 'animate-spin' : ''} />
                                            Generate Keys
                                        </button>

                                        <button
                                            onClick={() => setProjectorRound(round)}
                                            disabled={!round.startOtp}
                                            className="flex-none px-4 py-3 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title="Projector Mode"
                                        >
                                            <Eye size={18} />
                                        </button>

                                        {round.status === 'RUNNING' && (
                                            <div className="w-full flex gap-3 mt-1">
                                                <button
                                                    onClick={() => handleEmergencyAction('Extend +5m', round.name)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-emerald-900/50 hover:bg-emerald-950/50 text-emerald-500 rounded-lg text-sm font-bold transition-colors"
                                                >
                                                    <Clock size={16} /> +5 Min
                                                </button>
                                                <button
                                                    onClick={() => handleEmergencyAction('Force End', round.name)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-900/50 hover:bg-red-950/50 text-red-500 rounded-lg text-sm font-bold transition-colors"
                                                >
                                                    <StopCircle size={16} /> Force End
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

            {/* Projector Mode Modal (Massive Typography) */}
            <AnimatePresence>
                {projectorRound && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8"
                    >
                        <button
                            onClick={() => setProjectorRound(null)}
                            className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors uppercase font-bold tracking-widest"
                        >
                            [ ESCAPE / CLOSE ]
                        </button>

                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="text-center w-full max-w-5xl"
                        >
                            <div className="flex items-center justify-center gap-4 mb-4">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                <p className="text-red-500 font-bold tracking-[0.3em] uppercase">Confidential Payload</p>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black text-white mb-24 tracking-tight">
                                {projectorRound.name}
                            </h2>

                            <div className="flex flex-col md:flex-row gap-12 md:gap-24 justify-center items-center">
                                <div className="text-center w-full relative">
                                    <div className="absolute inset-0 bg-white/5 blur-3xl -z-10 rounded-full"></div>
                                    <p className="text-gray-400 font-bold tracking-[0.4em] uppercase mb-6 text-xl">START OTP</p>
                                    <div className="text-8xl md:text-[9rem] font-mono font-bold text-white tracking-[0.1em] border-2 border-white/10 rounded-3xl py-12 px-8 bg-white/5 backdrop-blur-sm shadow-2xl">
                                        {projectorRound.startOtp}
                                    </div>
                                </div>

                                <div className="text-center w-full relative">
                                    <div className="absolute inset-0 bg-cyan-500/10 blur-3xl -z-10 rounded-full"></div>
                                    <p className="text-cyan-500 font-bold tracking-[0.4em] uppercase mb-6 text-xl">END / SUBMIT OTP</p>
                                    <div className="text-8xl md:text-[9rem] font-mono font-bold text-cyan-400 tracking-[0.1em] border-2 border-cyan-500/30 rounded-3xl py-12 px-8 bg-cyan-950/20 backdrop-blur-sm shadow-[0_0_50px_rgba(6,182,212,0.15)]">
                                        {projectorRound.endOtp}
                                    </div>
                                </div>
                            </div>

                            <p className="mt-24 text-gray-500 font-mono tracking-widest text-lg">
                                Input Start OTP to unlock environment. 1 Hour Strict Limit enforces automatically.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default AdminDashboard;
