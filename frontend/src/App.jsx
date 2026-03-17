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
import SuperAdminDashboard from './components/SuperAdminDashboard';
import BlockedAccount from './pages/BlockedAccount';
import OnboardingPage from './components/OnboardingPage';

import { useAuthStore } from './store/authStore';

/**
 * Handle Login redirection separately if already authenticated
 */
const PublicRoute = ({ children }) => {
    const { user } = useAuthStore();
    
    React.useEffect(() => {
        if (user && user.role === 'STUDENT' && user.allocatedServer) {
            const currentOrigin = window.location.origin;
            if (user.allocatedServer !== currentOrigin) {
                window.location.replace(`${user.allocatedServer}/dashboard`);
            }
        }
    }, [user]);

    if (user) {
        if (user.isBanned) return <Navigate to="/blocked" replace />;
        if (user.role === 'STUDENT' && !user.isOnboarded) return <Navigate to="/onboarding" replace />;
        if (user.role === 'SUPER_ADMIN') return <Navigate to="/superadmin" replace />;
        if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
        
        // Return null while redirecting to another server
        if (user.role === 'STUDENT' && user.allocatedServer && user.allocatedServer !== window.location.origin) {
            return null;
        }
        
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};

const RoleFallback = () => {
    const { user } = useAuthStore();

    React.useEffect(() => {
        if (user?.role === 'STUDENT' && user?.allocatedServer) {
            const currentOrigin = window.location.origin;
            if (user.allocatedServer !== currentOrigin) {
                window.location.replace(`${user.allocatedServer}/dashboard`);
            }
        }
    }, [user]);

    if (user?.role === 'SUPER_ADMIN') return <Navigate to="/superadmin" replace />;
    if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
    
    if (user?.role === 'STUDENT' && user?.allocatedServer && user.allocatedServer !== window.location.origin) {
        return null;
    }
    
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
        </Router>
    );
}

export default App;
