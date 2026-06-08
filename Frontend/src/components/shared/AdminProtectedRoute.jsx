import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import useAuthStore from '../../store/authStore';

const verifyAdminRoleWithDB = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, status, company_id')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
};

const AdminProtectedRoute = () => {
    const { user, profile, loading } = useAuthStore();
    const [dbVerified, setDbVerified] = useState(null);

    useEffect(() => {
      if (user) {
        verifyAdminRoleWithDB(user.id).then(setDbVerified);
      }
    }, [user]);

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-white">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const effectiveRole = dbVerified?.role || profile?.role;
    const effectiveStatus = dbVerified?.status || profile?.status;

    if (!effectiveRole) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#050508]">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    if (effectiveRole !== "admin" && effectiveRole !== "super_admin") {
        return <Navigate to="/" replace />;
    }

    if (effectiveStatus === "rejected") {
        return <Navigate to="/not-approved" replace />;
    } else if (effectiveStatus !== "active") {
        return <Navigate to="/admin-lobby" replace />;
    }

    return <Outlet />;
};

export default AdminProtectedRoute;
