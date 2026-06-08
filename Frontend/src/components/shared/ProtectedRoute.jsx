import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import useAuthStore from '../../store/authStore';

const verifyProfileWithDB = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, status, company_id, company')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
};

const ProtectedRoute = () => {
    const { user, profile, loading, getCurrentUser } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);
    const [dbRole, setDbRole] = useState(null);

    const checkSession = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            setIsChecking(false);
            return;
        }

        if (!user) {
            await getCurrentUser();
        }

        if (session.user) {
          const dbProfile = await verifyProfileWithDB(session.user.id);
          if (dbProfile) {
            setDbRole(dbProfile.role);
            if (dbProfile.role !== profile?.role || dbProfile.status !== profile?.status) {
              useAuthStore.setState({ profile: { ...profile, role: dbProfile.role, status: dbProfile.status } });
            }
          }
        }

        setIsChecking(false);
    }, [user, getCurrentUser, profile]);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const effectiveRole = dbRole || profile?.role;

    if (loading || isChecking) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-white">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const currentPath = window.location.pathname;

    if (effectiveRole === 'master_admin' && !currentPath.startsWith('/master-admin')) {
        return <Navigate to="/master-admin/dashboard" replace />;
    }
    if (effectiveRole === 'admin' && profile?.status === 'active' && !currentPath.startsWith('/admin')) {
        return <Navigate to="/admin/dashboard" replace />;
    }
    if (effectiveRole === 'user' && profile?.status !== 'active' && !currentPath.startsWith('/user-lobby')) {
        return <Navigate to="/user-lobby" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
