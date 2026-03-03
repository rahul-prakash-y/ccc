import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * ProtectedRoute Wrapper
 * Enforces presence of authentication state. If the user object is missing
 * inside the React Context, they are instantly booted to the /login screen.
 */
const ProtectedRoute = ({ children }) => {
    const { user } = useAuthStore();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.isBanned) {
        return <Navigate to="/blocked" replace />;
    }

    if (user.role === 'STUDENT' && !user.isOnboarded && window.location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
