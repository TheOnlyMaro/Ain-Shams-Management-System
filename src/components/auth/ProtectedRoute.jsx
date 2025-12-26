import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../common';

export const ProtectedRoute = ({ children, roles = null }) => {
  const { isAuthenticated, userRole, loading, user } = useAuth();

  if (loading) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles) {
    // Accept role from multiple possible sources and compare as strings for robustness
    const candidate = userRole || (user && (user.role || user.roleId || user.role_id));
    const candidateStr = candidate !== undefined && candidate !== null ? String(candidate) : '';
    const allowed = roles.map((r) => String(r));
    if (!allowed.includes(candidateStr)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};
