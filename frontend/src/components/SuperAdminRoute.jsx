import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * SuperAdminRoute Wrapper
 * Only allows SUPER_ADMIN role through. All others are redirected.
 */
const SuperAdminRoute = () => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'SUPER_ADMIN') {
        const fallback = user.role === 'ADMIN' ? '/admin' : '/dashboard';
        return <Navigate to={fallback} replace />;
    }

    return <Outlet />;
};

export default SuperAdminRoute;
