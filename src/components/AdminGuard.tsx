import React from 'react';
import { Navigate } from 'react-router-dom';
import AdminUsers from './AdminUsers';

interface AdminGuardWrapperProps {
  children: React.ReactNode;
}

function checkIsAdmin(): boolean {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.role) return user.role === 'admin';
    }
  } catch { /* ignore */ }
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return payload.role === 'admin';
    }
  } catch { /* ignore */ }
  return false;
}

export const AdminGuardWrapper: React.FC<AdminGuardWrapperProps> = ({ children }) => {
  const isAdmin = checkIsAdmin();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AdminGuard: React.FC = () => {
  return (
    <AdminGuardWrapper>
      <AdminUsers />
    </AdminGuardWrapper>
  );
};

export default AdminGuard;
