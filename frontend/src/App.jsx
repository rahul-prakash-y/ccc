import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import { Toaster } from 'react-hot-toast';
import ConfirmModal from './components/ConfirmModal';
import StudentRecoveryBoundary from './components/StudentRecoveryBoundary';
import { AlertTriangle, WifiOff } from 'lucide-react';

// Route Component Imports
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import CodeArena from './components/CodeArena';
import AdminDashboard from './components/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import BlockedAccount from './pages/BlockedAccount';
import OnboardingPage from './components/OnboardingPage';
import ProfilePage from './components/ProfilePage';
import AttendanceHistoryPage from './components/AttendanceHistoryPage';
import AchievementsPage from './components/AchievementsPage';
import PerformanceReport from './components/PerformanceReport';
import PracticeArena from './components/PracticeArena';
import PracticeDashboard from './components/PracticeDashboard';
import StudentLayout from './components/StudentLayout';

import { useAuthStore } from './store/authStore';

/**
 * Handle Login redirection separately if already authenticated
 */
const PublicRoute = ({ children }) => {
    const { user } = useAuthStore();
    if (user) {
        if (user.isBanned) return <Navigate to="/blocked" replace />;
        if (user.role === 'STUDENT' && !user.isOnboarded) return <Navigate to="/onboarding" replace />;
        if (user.role === 'SUPER_ADMIN' || user.role === 'SUPER_MASTER') return <Navigate to="/superadmin" replace />;
        if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};

const RoleFallback = () => {
    const { user } = useAuthStore();
    console.log("user", user)
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'SUPER_MASTER') return <Navigate to="/superadmin" replace />;
    if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
    return (
        <Routes>
            {/* Root redirects to Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Public Login Route - blocked if already auth'd */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />

            {/* Protected App Core (STUDENTS) */}
            <Route element={<ProtectedRoute />}>
                <Route element={<StudentLayout />}>
                    <Route path="/dashboard" element={<StudentDashboard />} />
                    <Route path="/arena/:roundId" element={<CodeArena />} />
                    <Route path="/practice/:roundId" element={<PracticeArena />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/attendance-history" element={<AttendanceHistoryPage />} />
                    <Route path="/achievements" element={<AchievementsPage />} />
                    <Route path="/performance-report" element={<PerformanceReport />} />
                    <Route path="/practice-dashboard" element={<PracticeDashboard />} />
                </Route>
                <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            {/* Secure Command Center (ADMINS ONLY) */}
            <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Super Admin HQ (SUPER_ADMIN ONLY) */}
            <Route element={<SuperAdminRoute />}>
                <Route path="/superadmin" element={<SuperAdminDashboard />} />
            </Route>

            {/* Blocked Account Page */}
            <Route path="/blocked" element={<BlockedAccount />} />

            {/* 404 Fallback Catch */}
            <Route path="*" element={<RoleFallback />} />
        </Routes>
    );
};

const DuplicateTabGuard = ({ children }) => {
    const [isDuplicate, setIsDuplicate] = useState(false);

    useEffect(() => {
        const channel = new BroadcastChannel('ff_tab_sync');

        // Listen for presence of other tabs
        channel.onmessage = (event) => {
            if (event.data === 'ping') {
                // A new tab is asking if anyone is here. Let it know we exist.
                channel.postMessage('pong');
            } else if (event.data === 'pong') {
                // An existing tab responded to our ping. We are the duplicate.
                setIsDuplicate(true);
            }
        };

        // Announce ourselves when we mount
        channel.postMessage('ping');

        return () => channel.close();
    }, []);

    if (isDuplicate) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans tracking-tight">
                <div className="bg-red-500/10 text-red-500 p-5 rounded-4xl mb-8 border border-red-500/20 shadow-2xl shadow-red-500/20">
                    <AlertTriangle size={56} strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-black text-white mb-4">
                    Multiple Sessions Detected
                </h1>
                <p className="text-slate-400 max-w-sm mx-auto leading-relaxed font-medium mb-10">
                    The arena is already active in another browser tab. To prevent data corruption and local storage conflicts, please close this window and use your original session.
                </p>
                {/* Fallback UI element since window.close() doesn't always work if not opened by script */}
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-6 py-3 rounded-xl border border-slate-700/50">
                    Status: Locked
                </div>
            </div>
        );
    }

    return children;
};

const OfflineIndicator = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-9999 bg-red-500 text-white text-xs font-bold font-sans tracking-wide text-center py-2.5 flex items-center justify-center gap-2 shadow-md border-b border-red-600">
            <WifiOff size={15} />
            Offline: Your progress is being saved locally. Do not refresh.
        </div>
    );
};

function App() {
    const initialize = useAuthStore(state => state.initialize);

    React.useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <StudentRecoveryBoundary>
            <DuplicateTabGuard>
                <OfflineIndicator />
                <Router>
                    <Toaster position="top-right" />
                    <ConfirmModal />
                    <AppRoutes />
                </Router>
            </DuplicateTabGuard>
        </StudentRecoveryBoundary>
    );
}

export default App;
