import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../common';

export const ProtectedRoute = ({ children, roles = null }) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
