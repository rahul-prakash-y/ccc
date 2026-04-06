import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import { Toaster } from 'react-hot-toast';
import ConfirmModal from './components/ConfirmModal';

// Route Component Imports
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import CodeArena from './components/CodeArena';
import AdminDashboard from './components/AdminDashboard';
const ProfilePage = React.lazy(() => import('./components/ProfilePage'));
const PerformanceReport = React.lazy(() => import('./components/PerformanceReport'));
const SuperAdminDashboard = React.lazy(() => import('./components/SuperAdminDashboard'));
import BlockedAccount from './pages/BlockedAccount';
import OnboardingPage from './components/OnboardingPage';

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
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/performance" element={<PerformanceReport />} />
                <Route path="/dashboard" element={<StudentDashboard />} />

                {/* Dynamic route targeting the active Hackathon/Challenge ID */}
                <Route path="/arena/:roundId" element={<CodeArena />} />
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

            {/* Student Onboarding Page */}
            <Route
                path="/onboarding"
                element={
                    <ProtectedRoute>
                        <OnboardingPage />
                    </ProtectedRoute>
                }
            />

            {/* 404 Fallback Catch */}
            <Route path="*" element={<RoleFallback />} />
        </Routes>
    );
};

function App() {
    const initialize = useAuthStore(state => state.initialize);

    React.useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <Router>
            <Toaster position="top-right" />
            <ConfirmModal />
            <AppRoutes />
            <div 
                style={{
                    position: 'fixed',
                    bottom: '1.5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#64748b', // slate-500
                    background: 'rgba(255, 255, 255, 0.4)', 
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    padding: '6px 14px',
                    borderRadius: '14px',
                    zIndex: 9999,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(226, 232, 240, 0.5)', // slate-200
                    fontFamily: '"Sen", sans-serif',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase'
                }}
            >
                Website Created by <span style={{ color: '#4f46e5' }}>RCB Fan boy</span> ❤️
            </div>
        </Router>
    );
}

export default App;
