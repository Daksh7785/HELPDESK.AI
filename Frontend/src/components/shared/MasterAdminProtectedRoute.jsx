import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import useAuthStore from '../../store/authStore';

const verifyMasterAdminWithDB = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    return data?.role || null;
  } catch {
    return null;
  }
};

const MasterAdminProtectedRoute = () => {
    const { user, profile, loading } = useAuthStore();
    const [dbRole, setDbRole] = useState(null);

    useEffect(() => {
      if (user) {
        verifyMasterAdminWithDB(user.id).then(setDbRole);
      }
    }, [user]);

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/master-admin-login" replace />;
    }

    const effectiveRole = dbRole || profile?.role;

    if (effectiveRole !== 'master_admin') {
        console.warn(
            `[MasterAdminPortal] Unauthorized access attempt by ${user.email} (role: ${effectiveRole})`
        );
        return <Navigate to="/master-admin-login" replace />;
    }

    return <Outlet />;
};

export default MasterAdminProtectedRoute;
