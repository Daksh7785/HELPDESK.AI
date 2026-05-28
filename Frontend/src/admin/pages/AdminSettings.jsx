import React, { useState, useEffect } from 'react';
import {
    Settings,
    Cpu,
    Inbox,
    Bell,
    Save,
    ShieldCheck
} from 'lucide-react';
import useAdminStore from '../store/adminStore';
import useAuthStore from '../../store/authStore';
import useToastStore from '../../store/toastStore';
import { Card, CardContent } from "../../components/ui/card";
import { Select } from "../../components/ui/select";
import { API_CONFIG } from '../../config';

// Key mappings to bridge frontend camelCase and backend database snake_case
const mapToSnakeCase = (settings) => ({
    ai_confidence_threshold: settings.aiConfidenceThreshold,
    duplicate_sensitivity: settings.duplicateSensitivity,
    enable_auto_resolve: settings.enableAutoResolve,
    auto_close_days: settings.autoCloseDays,
    email_notifications: settings.emailNotifications,
    admin_alerts: settings.adminAlerts,
});

const mapToCamelCase = (settings) => ({
    aiConfidenceThreshold: settings.ai_confidence_threshold ?? 0.80,
    duplicateSensitivity: settings.duplicate_sensitivity ?? 0.85,
    enableAutoResolve: settings.enable_auto_resolve ?? false,
    autoCloseDays: settings.auto_close_days ?? 7,
    emailNotifications: settings.email_notifications ?? true,
    adminAlerts: settings.admin_alerts ?? true,
});

/**
 * AdminSettings Page
 * Comprehensive configuration for system parameters, AI thresholds, and notifications.
 */
const AdminSettings = () => {
    const { settings, updateSettings } = useAdminStore();
    const { profile } = useAuthStore();
    const { showToast } = useToastStore();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!profile?.company_id) {
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_CONFIG.BACKEND_URL}/settings/${profile.company_id}`);
                if (response.ok) {
                    const data = await response.json();
                    updateSettings(mapToCamelCase(data));
                } else {
                    console.warn("Failed to fetch settings from backend, status:", response.status);
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [profile?.company_id, updateSettings]);

    // Handlers
    const handleChange = (key, value) => {
        updateSettings({ [key]: value });
    };

    const handleSave = async () => {
        if (!profile?.company_id) {
            showToast("No company associated with this account.", "error");
            return;
        }
        setSaving(true);
        try {
            const payload = mapToSnakeCase(settings);
            const response = await fetch(`${API_CONFIG.BACKEND_URL}/settings/${profile.company_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const updated = await response.json();
                updateSettings(mapToCamelCase(updated));
                showToast("System settings successfully synced to cloud database.", "success");
            } else {
                const errData = await response.json().catch(() => ({}));
                showToast(errData.detail || "Failed to save settings to database.", "error");
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            showToast("Network error. Failed to save settings.", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-10 pb-20 animate-in fade-in duration-700">
            {/* 1. Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase flex items-center gap-3">
                        <Settings size={28} className="text-indigo-600" /> Settings
                    </h1>
                    <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <ShieldCheck size={14} className="text-emerald-500" /> Administrator Account
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                    <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>

            <div className="space-y-8">
                {/* 2. System Settings (AI Parameters) */}
                <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
                    <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                        <h3 className="text-sm font-black uppercase italic tracking-tight flex items-center gap-3">
                            <Cpu size={18} className="text-indigo-400" /> AI Settings
                        </h3>
                    </div>
                    <CardContent className="p-8 space-y-8">
                        {/* AI Confidence Threshold */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                    AI Confidence Threshold (<span className="text-indigo-600">{(settings.aiConfidenceThreshold * 100).toFixed(0)}%</span>)
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-lg mb-2">
                                Minimum confidence required for AI to process and categorize tickets automatically.
                            </p>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.aiConfidenceThreshold}
                                onChange={(e) => handleChange('aiConfidenceThreshold', parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        {/* Duplicate Detection Sensitivity */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                    Duplicate Detection (<span className="text-indigo-600">{(settings.duplicateSensitivity * 100).toFixed(0)}%</span>)
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-lg mb-2">
                                Semantic similarity score needed to flag incoming tickets as duplicates.
                            </p>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.duplicateSensitivity}
                                onChange={(e) => handleChange('duplicateSensitivity', parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        {/* Auto Resolve Toggle */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div>
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Enable Auto Resolve</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Allow AI to close easily solved requests.</p>
                            </div>
                            <button
                                onClick={() => handleChange('enableAutoResolve', !settings.enableAutoResolve)}
                                className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner shrink-0 ${settings.enableAutoResolve ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${settings.enableAutoResolve ? 'right-1' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Ticket Settings */}
                <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
                    <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
                            <Inbox size={18} className="text-emerald-500" /> Ticket Settings
                        </h3>
                    </div>
                    <CardContent className="p-8 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Auto-Close Tickets</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Automatically archive resolved tickets after inactivity.</p>
                            </div>
                            <Select
                                value={settings.autoCloseDays}
                                onChange={(e) => handleChange('autoCloseDays', parseInt(e.target.value))}
                                className="w-full md:w-auto"
                                buttonClassName="w-full md:w-auto min-w-[140px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 uppercase outline-none focus:border-indigo-600 transition-colors flex justify-between items-center"
                                options={[
                                    { value: 3, label: "3 Days" },
                                    { value: 7, label: "7 Days" },
                                    { value: 14, label: "14 Days" }
                                ]}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Notification Settings */}
                <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
                    <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
                            <Bell size={18} className="text-amber-500" /> Notifications
                        </h3>
                    </div>
                    <CardContent className="p-8 space-y-6">
                        {/* Email Notifications toggle */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Email Notifications</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Receive daily system digests via email.</p>
                            </div>
                            <button
                                onClick={() => handleChange('emailNotifications', !settings.emailNotifications)}
                                className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner shrink-0 ${settings.emailNotifications ? 'bg-amber-500' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${settings.emailNotifications ? 'right-1' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Admin Alert Notifications toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Critical Admin Alerts</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Push notifications for Priority 1 system events.</p>
                            </div>
                            <button
                                onClick={() => handleChange('adminAlerts', !settings.adminAlerts)}
                                className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner shrink-0 ${settings.adminAlerts ? 'bg-amber-500' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${settings.adminAlerts ? 'right-1' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminSettings;
