import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * AdminRoute Wrapper
 * Enforces presence of authentication state AND the ADMIN role.
 * Students who try predicting the URL will be booted back to their dashboard.
 */
const AdminRoute = () => {
    const { user } = useAuthStore();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'ADMIN') {
        // If a student tries to access admin, send them back to where they belong
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
