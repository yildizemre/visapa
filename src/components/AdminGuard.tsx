import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import AdminUsers from './AdminUsers';

interface AdminGuardWrapperProps {
  children: React.ReactNode;
}

export const AdminGuardWrapper: React.FC<AdminGuardWrapperProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // First try reading role from stored user object (most reliable)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === 'admin');
        return;
      } catch {}
    }
    // Fallback: decode JWT (base64url → base64 conversion needed)
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAdmin(false);
      return;
    }
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      setIsAdmin(payload.role === 'admin');
    } catch {
      setIsAdmin(false);
    }
  }, []);

  if (isAdmin === null) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

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
