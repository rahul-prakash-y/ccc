import React from 'react';
import { RefreshCw, ShieldAlert, Wifi } from 'lucide-react';

/**
 * StudentRecoveryBoundary
 * ────────────────────────────────────────────────────────────────────────────
 * A native React class-based Error Boundary that catches any unhandled render
 * error in the component tree below it.
 *
 * CRITICAL: The "Reload and Restore" button calls window.location.reload()
 * WITHOUT touching localStorage. This deliberately preserves any
 * `backup_submission_*` keys written by CodeArena so the submission fallback
 * logic in StudentDashboard can retry the re-fire on next load.
 *
 * Usage:
 *   Wrap <App /> (or <AppRoutes />) in main.jsx or App.jsx:
 *
 *   import StudentRecoveryBoundary from './components/StudentRecoveryBoundary';
 *   ...
 *   <StudentRecoveryBoundary>
 *     <App />
 *   </StudentRecoveryBoundary>
 */
class StudentRecoveryBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            errorMessage: '',
        };
    }

    // Called synchronously during render when a child throws.
    // Update state so the next render shows the recovery UI.
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            errorMessage: error?.message || 'An unexpected error occurred.',
        };
    }

    // Called after the error is caught — good place to log to an error service.
    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Component crashed:', error);
        console.error('[ErrorBoundary] Component stack:', info?.componentStack);
        // If you add Sentry later: Sentry.captureException(error, { extra: info });
    }

    handleReloadAndRestore = () => {
        // ─── DO NOT clear localStorage ────────────────────────────────────────
        // backup_submission_* keys must survive this reload so the submission
        // recovery logic in StudentDashboard can re-fire dropped POST requests.
        // We only reset the in-memory error state before reloading.
        this.setState({ hasError: false, errorMessage: '' });
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        // ─── Student Recovery Screen ──────────────────────────────────────────
        return (
            <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-8 font-sans text-center">

                {/* Ambient glow for "arena" feel */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-md w-full">

                    {/* Icon */}
                    <div className="w-20 h-20 bg-red-50 border border-red-100 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
                        <ShieldAlert size={36} />
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                        System Fault Detected
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
                        A rendering error interrupted your session. Your test progress is
                        <span className="font-bold text-emerald-600"> safely backed up</span> and
                        will be automatically restored when you reload.
                    </p>

                    {/* Error Detail (collapsible for cleanliness) */}
                    <details className="mb-6 text-left bg-white border border-red-100 rounded-2xl overflow-hidden shadow-sm">
                        <summary className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-red-500 cursor-pointer select-none hover:bg-red-50 transition-colors">
                            View Error Details
                        </summary>
                        <pre className="px-5 py-4 text-xs text-slate-500 font-mono whitespace-pre-wrap border-t border-red-100 bg-slate-50/50">
                            {this.state.errorMessage}
                        </pre>
                    </details>

                    {/* Recovery Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={this.handleReloadAndRestore}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white font-black tracking-wide rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            <RefreshCw size={18} />
                            Reload and Restore Session
                        </button>

                        <p className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <Wifi size={12} />
                            Your answers are preserved in local storage
                        </p>
                    </div>
                </div>
            </div>
        );
    }
}

export default StudentRecoveryBoundary;
