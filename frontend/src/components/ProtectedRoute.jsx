import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * ProtectedRoute Wrapper
 * Enforces presence of authentication state. If the user object is missing
 * inside the React Context, they are instantly booted to the /login screen.
 */
const ProtectedRoute = () => {
    const { user } = useAuthStore();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.isBanned) {
        return <Navigate to="/blocked" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
