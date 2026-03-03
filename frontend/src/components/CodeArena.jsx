import React, { useState, useEffect } from 'react';
import Split from 'react-split';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Lock, Send, AlertTriangle, Save, Loader2 } from 'lucide-react';

import useContestTimer from '../hooks/useContestTimer';
import useAutoSave from '../hooks/useAutoSave';

const MOCK_START_TIME = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago

const CodeArena = ({ roundId = 'mock_round_id', language = 'javascript' }) => {
    const [code, setCode] = useState('// Write your solution here...');
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [endOtp, setEndOtp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Time Limit & Anti-Cheat Hooks
    const { timeLeft, formattedTime, isTimeUp, isDangerZone } = useContestTimer({
        roundId,
        serverStartTime: MOCK_START_TIME,
        durationMinutes: 60, // 1 hour strict limit
        onTimeUp: () => handleTimeUp(),
        onCheatDetected: (flags) => console.log('Cheat detected:', flags)
    });

    // Debounced AutoSave Integration
    const { saveStatus } = useAutoSave(code, roundId, 5000, isTimeUp);

    useEffect(() => {
        // Recover drafts from local storage on load if API doesn't provide one
        const draft = localStorage.getItem(`draft_${roundId}`);
        if (draft && draft !== code) {
            setCode(draft);
        }
    }, [roundId]);

    const handleTimeUp = () => {
        setIsSubmitModalOpen(true);
        // Code in Editor is now readOnly
    };

    const handleEditorChange = (value) => {
        if (!isTimeUp) {
            setCode(value);
        }
    };

    const handleFinalSubmit = async (e) => {
        if (e) e.preventDefault();
        if (endOtp.length !== 6) {
            setSubmitError('OTP must be exactly 6 digits.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // API call to Fastify backend logic
            /*
            const res = await fetch(`/api/rounds/${roundId}/submit`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ...` },
               body: JSON.stringify({ endOtp, codeContent: code })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            */

            // Mock submit latency
            await new Promise(resolve => setTimeout(resolve, 1500));
            if (endOtp !== '999999') {
                throw new Error('Access Denied: Invalid End Authorization Code');
            }

            alert("Submission Successful! Return to Dashboard.");
            window.location.href = '/dashboard';

        } catch (err) {
            setSubmitError(err.message || 'System Error. Try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-screen w-full bg-[#0a0a0f] text-gray-300 font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">

            {/* Sleek Top HeaderBar */}
            <header className="h-16 shrink-0 border-b border-gray-800 bg-[#0d0d14] flex items-center justify-between px-6 z-10 shadow-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
                        <Terminal size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-gray-100 tracking-wider">Mini Hackathon</h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            ID: {roundId.slice(0, 8)} | Environment Active
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2 text-xs font-mono font-medium">
                        {saveStatus === 'SAVING' && <><Loader2 size={14} className="animate-spin text-cyan-400" /> <span className="text-cyan-400">Syncing...</span></>}
                        {saveStatus === 'PENDING' && <><Save size={14} className="text-gray-500" /> <span className="text-gray-500">Unsaved changes</span></>}
                        {saveStatus === 'SAVED' && <><Save size={14} className="text-emerald-400" /> <span className="text-emerald-400">Draft saved</span></>}
                        {saveStatus === 'LOCKED' && <><Lock size={14} className="text-red-400" /> <span className="text-red-400">Locked</span></>}
                    </div>

                    {/* Strict Countdown Timer */}
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg font-mono text-lg font-bold border ${isTimeUp ? 'bg-red-950/30 border-red-500/50 text-red-400' :
                            isDangerZone ? 'bg-orange-950/30 border-orange-500/50 text-orange-400 animate-pulse' :
                                'bg-gray-900 border-gray-700 text-gray-100'
                        }`}>
                        {isTimeUp ? <AlertTriangle size={20} className="animate-bounce" /> : <Lock size={18} className="opacity-50" />}
                        {isTimeUp ? '00:00:00 (LOCKED)' : formattedTime}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => setIsSubmitModalOpen(true)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] disabled:opacity-50"
                    >
                        <Send size={16} />
                        {isTimeUp ? 'FORCE SUBMIT' : 'Finish & Submit'}
                    </button>
                </div>
            </header>

            {/* Main Split Interface */}
            <Split
                sizes={[35, 65]}
                minSize={[300, 400]}
                gutterSize={8}
                gutterAlign="center"
                direction="horizontal"
                className="flex-1 flex w-full overflow-hidden"
                cursor="col-resize"
            >

                {/* Left Pane - Problem Panel */}
                <div className="flex flex-col h-full bg-[#11111a] border-r border-gray-800 p-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-gray-100 mb-4 font-sans tracking-tight">Challenge Overview</h2>
                    <div className="prose prose-invert prose-p:text-gray-400 max-w-none">
                        <p>
                            You are tasked with engineering the core logic for a real-time analytics system. Your solution must handle concurrent connections efficiently without generating memory leaks.
                        </p>
                        <h4 className="text-cyan-400 font-medium uppercase text-xs tracking-widest mt-6">System Constraints</h4>
                        <ul className="text-sm border-l-2 border-cyan-800 pl-4 space-y-2 text-gray-400">
                            <li>Strict Time Limit: <strong>1 Hour</strong>.</li>
                            <li>Closing the tab or triggering the Page Visibility API will notify the server of potential anti-cheat violations.</li>
                            <li>Only exact API inputs strictly matching the parameters will pass the hidden test cases.</li>
                        </ul>
                    </div>

                    <div className="mt-auto pt-8">
                        <div className="bg-black/50 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
                            <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 text-xs font-mono text-gray-500 flex justify-between items-center">
                                <span>Console Output</span>
                                <span className="flex gap-1.5 hidden group-hover:flex">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/50"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></span>
                                </span>
                            </div>
                            <div className="p-4 h-48 font-mono text-sm text-gray-400 overflow-y-auto">
                                <div className="text-gray-600">~/_system/runner -v active</div>
                                <div className="text-gray-500 mt-2">Waiting for implementation... Execute run command to compile test cases.</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Pane - Monaco Editor Panel */}
                <div className="h-full flex flex-col bg-[#1e1e1e]">
                    <div className="h-10 bg-[#181818] border-b border-[#2d2d2d] flex items-center px-4 shrink-0">
                        <div className="flex space-x-2 bg-[#1e1e1e] px-4 py-1.5 rounded-t-md border-t border-x border-[#2d2d2d] border-b-0 text-sm font-mono text-gray-300 shadow-[0_-2px_10px_rgba(0,0,0,0.2)] mt-2">
                            <span>solution.{language === 'javascript' ? 'js' : language}</span>
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        {isTimeUp && (
                            <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm pointer-events-none flex items-center justify-center">
                                <div className="px-6 py-3 bg-red-950/80 border border-red-500/50 rounded-xl flex items-center gap-3 backdrop-blur-md">
                                    <Lock className="text-red-500" />
                                    <span className="text-red-200 font-bold tracking-wider">EDITOR LOCKED - TIME EXPIRED</span>
                                </div>
                            </div>
                        )}
                        <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={code}
                            onChange={handleEditorChange}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                                lineHeight: 24,
                                padding: { top: 20 },
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                cursorBlinking: "smooth",
                                readOnly: isTimeUp
                            }}
                            loading={
                                <div className="flex items-center justify-center h-full text-cyan-500 gap-3 font-mono">
                                    <Loader2 className="animate-spin" /> Initializing Environment...
                                </div>
                            }
                        />
                    </div>
                </div>
            </Split>

            {/* End OTP Submission Gate Modal */}
            <AnimatePresence>
                {isSubmitModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0d0d14] border shadow-2xl ${isTimeUp ? 'border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.15)]'
                                    : 'border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]'
                                }`}
                        >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isTimeUp ? 'from-transparent via-red-500 to-transparent' : 'from-transparent via-cyan-400 to-transparent'}`}></div>

                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`p-4 rounded-xl ${isTimeUp ? 'bg-red-950/50 text-red-500 border border-red-900/50' : 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/50'}`}>
                                        {isTimeUp ? <AlertTriangle size={32} /> : <Lock size={32} />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
                                            {isTimeUp ? 'Time Expired' : 'Secure Submission'}
                                        </h2>
                                        <p className={`text-sm tracking-wide ${isTimeUp ? 'text-red-400' : 'text-cyan-500'}`}>FINAL AUTHORIZATION</p>
                                    </div>
                                </div>

                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    {isTimeUp
                                        ? "The competition window has closed. Enter the Admin's Final End OTP immediately to secure your current draft before the network drops."
                                        : "Are you ready to submit your code? Enter the 6-digit End OTP provided by the Administrator to finalize your solution."}
                                </p>

                                <form onSubmit={handleFinalSubmit} className="space-y-6">
                                    <div>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={endOtp}
                                            onChange={(e) => setEndOtp(e.target.value.toUpperCase())}
                                            className={`block w-full px-4 py-4 bg-black/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all font-mono text-center tracking-[0.5em] text-2xl uppercase ${isTimeUp ? 'focus:border-red-500 focus:ring-red-500/50' : 'focus:border-cyan-400 focus:ring-cyan-400/50'
                                                }`}
                                            placeholder="------"
                                            disabled={isSubmitting}
                                            autoComplete="off"
                                            autoFocus
                                        />
                                        {submitError && (
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-3 text-red-400 text-sm font-medium flex items-start gap-2"
                                            >
                                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                                {submitError}
                                            </motion.p>
                                        )}
                                    </div>

                                    <div className="flex gap-4 pt-2">
                                        {!isTimeUp && (
                                            <button
                                                type="button"
                                                onClick={() => setIsSubmitModalOpen(false)}
                                                disabled={isSubmitting}
                                                className="flex-1 px-4 py-3 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || endOtp.length !== 6}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isTimeUp ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                                                }`}
                                        >
                                            {isSubmitting ? (
                                                <><Loader2 size={18} className="animate-spin" /> Verifying...</>
                                            ) : (
                                                <><Send size={18} /> Confirm Override</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Required for react-split to load its layout without collapsing completely
const styleLink = document.createElement("style");
styleLink.innerHTML = `
.gutter {
    background-color: #11111a;
    background-repeat: no-repeat;
    background-position: 50%;
    transition: background-color 0.2s;
}
.gutter:hover {
    background-color: #2dd4bf; 
}
.gutter.gutter-horizontal {
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
    cursor: col-resize;
}
`;
document.head.appendChild(styleLink);

export default CodeArena;
