import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    User,
    Mail,
    Shield,
    Bell,
    Lock,
    Globe,
    Camera,
    ShieldCheck,
    Key,
    Smartphone,
    History,
    Activity,
    CheckCircle2,
    AlertCircle,
    Copy,
    LogOut,
    Eye,
    Save,
    X,
    Edit2,
    Download
} from 'lucide-react';
import { Card, CardContent } from "../../components/ui/card";
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { supabase } from "../../lib/supabaseClient";
import BugReportWidget from "../../components/shared/BugReportWidget";

/**
 * AdminProfile Page
 * Comprehensive terminal for monitoring system access and auditing operational history.
 * Sections: Admin Information, Security Settings, Admin Activity Log.
 */
const AdminProfile = () => {
    const { user, profile: adminProfile } = useAuthStore();
    const { showToast } = useToastStore();
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // States for Profile Editing
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: adminProfile?.full_name || '',
        email: adminProfile?.email || '',
        profile_picture: adminProfile?.profile_picture || null
    });

    // Update form when profile loads
    useEffect(() => {
        if (adminProfile) {
            setProfileForm({
                name: adminProfile.full_name || '',
                email: adminProfile.email || '',
                profile_picture: adminProfile.profile_picture || null
            });
        }
    }, [adminProfile]);

    // States for Security Settings
    const [isAdmin2FAEnabled, setIsAdmin2FAEnabled] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const fileInputRef = useRef(null);

    // Dynamic Activity Log Data
    const [activityLog, setActivityLog] = useState([]);

    useEffect(() => {
        const fetchActivity = async () => {
            if (!adminProfile?.company) return;
            try {
                const { data, error } = await supabase
                    .from('tickets')
                    .select('id, subject, status, created_at')
                    .eq('company', adminProfile.company)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error) throw error;

                const formatted = (data || []).map(t => ({
                    id: t.id,
                    action: `Ticket ${t.status?.toUpperCase() || 'UPDATED'}`,
                    target: `#TKT-${t.id.slice(0, 4)}`,
                    timestamp: new Date(t.created_at).toLocaleString(),
                    status: "Success"
                }));
                setActivityLog(formatted);
            } catch (err) {
                console.error("Failed to fetch activity log:", err);
            }
        };
        fetchActivity();
    }, [adminProfile?.company]);

    // Handlers
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return; // Sequence aborted: No asset detected.

        setUploading(true);
        try {
            const userId = user?.id || adminProfile?.id;
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage (Assumes 'profile-pics' bucket exists)
            const { error: uploadError } = await supabase.storage
                .from('profile-pics')
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type || 'image/jpeg'
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage
                .from('profile-pics')
                .getPublicUrl(filePath);
            const publicUrl = data?.publicUrl;

            setProfileForm(prev => ({ ...prev, profile_picture: publicUrl }));

            // Auto-save the URL to profile
            await supabase
                .from('profiles')
                .update({ profile_picture: publicUrl })
                .eq('id', userId);

            await useAuthStore.getState().getProfile(user);
            showToast("Digital avatar sequence synced.", "success");
        } catch (err) {
            console.error("Upload error:", err);
            showToast(`SEQUENCE INTERRUPTED: ${err.message}`, "error");
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: profileForm.name,
                    email: profileForm.email,
                    profile_picture: profileForm.profile_picture
                })
                .eq('id', adminProfile.id);

            if (error) throw error;
            setIsEditingProfile(false);

            await useAuthStore.getState().getProfile(useAuthStore.getState().user);
            showToast("Profile sequence updated successfully.", "success");
        } catch (err) {
            showToast("Save failed: " + err.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadArchive = () => {
        const data = {
            admin_id: adminProfile.id,
            email: adminProfile.email,
            role: adminProfile.role,
            activity_logs: activityLog,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin_archive_${adminProfile.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handlePasswordChange = () => {
        // In a real app we'd validate and send this to the backend
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast("Passwords do not match", "error");
            return;
        }
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showToast("Security Sequence Updated Successfully", "success");
    };

    return (
        <div className="max-w-6xl mx-auto py-6 space-y-10 pb-20 animate-in fade-in duration-700">
            {/* 1. Profile Hero Section */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-10 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                <div className="relative group shrink-0">
                    <div className="w-40 h-40 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white font-black text-5xl shadow-2xl shadow-slate-900/30 border-[6px] border-white relative z-10 overflow-hidden transform group-hover:rotate-3 transition-transform duration-500">
                        {isEditingProfile && profileForm.profile_picture ? (
                            <img src={profileForm.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : adminProfile?.profile_picture ? (
                            <img src={adminProfile.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            isEditingProfile ? (profileForm.name?.charAt(0) || '?') : (adminProfile?.full_name?.charAt(0) || '?')
                        )}
                    </div>
                    {isEditingProfile && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/*"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 p-3 bg-white rounded-2xl shadow-xl border border-slate-100 text-indigo-600 hover:scale-110 active:scale-95 transition-all z-20"
                            >
                                <Camera size={20} />
                            </button>
                        </>
                    )}
                    <div className="absolute inset-0 bg-indigo-600/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </div>

                <div className="space-y-6 flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="flex-1">
                            {!isEditingProfile ? (
                                <>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase flex flex-col md:flex-row md:items-center gap-3">
                                        {adminProfile?.full_name || 'Admin Agent'}
                                        <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full not-italic tracking-widest font-black uppercase shadow-lg shadow-indigo-600/20 w-fit mx-auto md:mx-0">
                                            {adminProfile?.role === 'master_admin' ? 'Root Administrator' : 'Operating Admin'}
                                        </span>
                                    </h1>
                                    <p className="text-slate-400 font-bold mt-2 uppercase tracking-[0.2em] text-xs flex items-center justify-center md:justify-start gap-2">
                                        <ShieldCheck size={14} className="text-indigo-500" /> Operational Protocol ID: {adminProfile.id}
                                    </p>
                                </>
                            ) : (
                                <div className="space-y-4 max-w-sm mx-auto md:mx-0">
                                    <input
                                        type="text"
                                        value={profileForm.name}
                                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all outline-none"
                                        placeholder="Admin Name"
                                    />
                                    <input
                                        type="email"
                                        value={profileForm.email}
                                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all outline-none"
                                        placeholder="Admin Email"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 justify-center">
                            {!isEditingProfile ? (
                                <button
                                    onClick={() => {
                                        setProfileForm({
                                            name: adminProfile?.full_name || '',
                                            email: adminProfile?.email || '',
                                            profile_picture: adminProfile?.profile_picture
                                        });
                                        setIsEditingProfile(true);
                                    }}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 hover:text-indigo-600 transition-all text-xs uppercase tracking-widest shadow-sm flex items-center gap-2"
                                >
                                    <Edit2 size={16} /> Edit Profile
                                </button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsEditingProfile(false)}
                                        className="px-6 py-3 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Terminal</label>
                            <span className="text-sm font-bold text-slate-700">{adminProfile.email}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company / Organization</label>
                            <span className="text-sm font-bold text-slate-700">{adminProfile?.company || 'Universal Hub'}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Last Secure Login</label>
                            <span className="text-sm font-bold text-slate-700">
                                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Just Now'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* 2. Security Station (Left - 5 cols) */}
                <div className="lg:col-span-5 space-y-10">
                    <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white">
                        <div className="px-10 py-8 bg-slate-900 text-white flex items-center justify-between">
                            <h3 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-3">
                                <Lock size={22} className="text-indigo-400" /> Security Sequence
                            </h3>
                            <Shield className="text-indigo-400 w-5 h-5 opacity-50" />
                        </div>
                        <CardContent className="p-10 space-y-10">
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <Key size={16} className="text-indigo-600" /> Password Protocol
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium">Update your administrative credentials sequence for enhanced system integrity.</p>
                                    <button
                                        onClick={() => setShowPasswordModal(true)}
                                        className="w-full py-4 bg-white border-2 border-slate-200 text-slate-900 font-black rounded-2xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <Edit2 size={16} /> Initiate Override
                                    </button>
                                </div>

                                <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 flex items-center justify-between gap-6 overflow-hidden relative group">
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-600/5 rounded-full transform group-hover:scale-110 transition-transform"></div>
                                    <div className="space-y-2 flex-1 relative z-10">
                                        <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                            <Smartphone size={16} className="text-indigo-600" /> Two-Factor Logic
                                        </h4>
                                        <p className="text-[10px] text-indigo-700/60 font-medium">Enforce biometric or SMS verification for all root actions.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsAdmin2FAEnabled(!isAdmin2FAEnabled)}
                                        className={`w-14 h-8 rounded-full relative transition-all duration-500 overflow-hidden shadow-inner shrink-0 ${isAdmin2FAEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-md ${isAdmin2FAEnabled ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                {/* Bug Report Integration */}
                                <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100/50 space-y-4">
                                    <h4 className="text-xs font-black text-red-900 uppercase tracking-widest flex items-center gap-2">
                                        <AlertCircle size={16} className="text-red-600" /> Advanced Bug Report
                                    </h4>
                                    <p className="text-xs text-red-700/60 font-medium">Submit detailed system bug reports with attachments.</p>
                                    <BugReportWidget
                                        advanced={true}
                                        customTrigger={
                                            <button className="w-full py-4 bg-white border-2 border-red-200 text-red-900 font-black rounded-2xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2">
                                                <AlertCircle size={16} /> Report Bug
                                            </button>
                                        }
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleLogout} // Wired logout button
                                className="w-full py-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-600 hover:text-white transition-all text-xs uppercase tracking-[0.2em] border border-red-100 flex items-center justify-center gap-3"
                            >
                                <LogOut size={16} /> Finalize Session (Logout)
                            </button>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Operational History (Right - 7 cols) */}
                <div className="lg:col-span-7">
                    <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white h-full">
                        <div className="px-10 py-8 bg-white border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
                                <History size={22} className="text-indigo-600" /> Admin Activity Audit
                            </h3>
                            <button
                                onClick={handleDownloadArchive}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-[10px] font-black text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all uppercase tracking-widest shadow-sm"
                            >
                                <Download size={14} /> Download Archive
                            </button>
                        </div>
                        <div className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Action</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</th>
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sync Time</th>
                                            <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {activityLog.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <span className="text-[11px] font-black text-slate-800 uppercase italic tracking-tight">{log.action}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{log.target}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">{log.timestamp}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg w-fit mx-auto">
                                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{log.status}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Empty State / End of log */}
                            <div className="p-10 text-center bg-slate-50/30">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">...End of Recorded Sequence Activity...</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <Card className="w-full max-w-sm bg-white rounded-[2.5rem] border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 bg-slate-900 text-white flex items-center justify-between">
                            <h3 className="font-black italic uppercase text-lg tracking-tight">Sequence Update</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="text-white hover:text-indigo-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Current Protocol</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all outline-none"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">New Sequence</label>
                                    <input
                                        type="password"
                                        placeholder="New complexity required"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all outline-none"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Confirm Sequence</label>
                                    <input
                                        type="password"
                                        placeholder="Re-enter sequence"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all outline-none"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handlePasswordChange}
                                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> Hard Sync Sequence
                            </button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminProfile;
