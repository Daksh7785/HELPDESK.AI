import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Ticket,
    AlertTriangle,
    Bot,
    Users,
    Activity,
    ShieldCheck,
    Cpu,
    Binary,
    Eye,
    Copy
} from 'lucide-react';
import useTicketStore from "../../store/ticketStore";
import useAuthStore from "../../store/authStore";
import { supabase } from "../../lib/supabaseClient";
import StatCard from "../components/StatCard";
import TicketTable from "../components/TicketTable";
import { Card, CardContent } from "../../components/ui/card";
import { formatTimelineDate } from "../../utils/dateUtils";

/**
 * AdminDashboard Page
 * Central hub for monitoring system KPIs, recent activity, and AI subsystem health.
 * Follows the high-fidelity Emerald Prime design system.
 */
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('tickets')
                .select('*')
                .order('created_at', { ascending: false });

            const { profile } = useAuthStore.getState();
            if (profile?.role === 'admin' && profile?.company) {
                query = query.eq('company', profile.company);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTickets(data || []);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchStats();
        // Polling for real-time-ish updates every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    // Derived Metrics for KPI Cards
    const metrics = useMemo(() => {
        const total = tickets.length;
        const active = tickets.filter(t => !t.status?.toLowerCase()?.includes('resolv') && !t.status?.toLowerCase()?.includes('closed')).length;
        const autoResolved = tickets.filter(t => t.status?.toLowerCase()?.includes('auto')).length;
        const humanEscalated = tickets.filter(t =>
            t.status?.toLowerCase()?.includes('progress') ||
            t.status?.toLowerCase()?.includes('escalat')
        ).length;

        return { total, active, autoResolved, humanEscalated };
    }, [tickets]);

    // Dynamic AI and System Coverage Data
    const aiSubsystems = useMemo(() => {
        const totalCount = tickets.length || 1;
        const categorized = tickets.filter(t => t.category && t.category.toLowerCase() !== 'unassigned' && t.category !== 'Other').length;
        const prioritized = tickets.filter(t => t.priority).length;

        return [
            { name: 'Classifier Engine', icon: Cpu, status: categorized > 0 ? 'Active' : 'Standby', latency: `${((categorized / totalCount) * 100).toFixed(0)}% Coverage` },
            { name: 'Priority Routing', icon: Binary, status: prioritized > 0 ? 'Active' : 'Standby', latency: `${((prioritized / totalCount) * 100).toFixed(0)}% Routed` },
            { name: 'Semantic Analysis', icon: Eye, status: tickets.length > 0 ? 'Active' : 'Standby', latency: `${tickets.length} Scanned` },
            { name: 'Duplicate Detection', icon: Copy, status: 'Active', latency: 'Optimal' },
        ];
    }, [tickets]);

    return (
        <div style={{ background: '#f8faf9', minHeight: '100vh', paddingBottom: '40px' }} className="space-y-10 -m-6 p-6 md:-m-10 md:p-10">
            {/* 1. Header Area with Global Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, color: '#0f1f12', letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
                        System Overview
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                        <Activity size={14} color="#16a34a" /> Real-time operational telemetry active
                    </p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
                    background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                    borderRadius: '100px'
                }}>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Global Protocol Active</span>
                </div>
            </div>

            {/* 2. KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <button
                    onClick={() => navigate('/admin/tickets')}
                    className="text-left group focus:outline-none"
                >
                    <StatCard
                        label="Total Tickets"
                        value={metrics.total}
                        icon={Ticket}
                        color="indigo"
                        subtitle="Lifetime generated"
                        className="group-hover:shadow-2xl group-hover:-translate-y-1 transition-all"
                    />
                </button>
                <button
                    onClick={() => navigate('/admin/tickets')}
                    className="text-left group focus:outline-none"
                >
                    <StatCard
                        label="Active Incidents"
                        value={metrics.active}
                        icon={AlertTriangle}
                        color="amber"
                        subtitle="Requires attention"
                        className="group-hover:shadow-2xl group-hover:-translate-y-1 transition-all"
                    />
                </button>
                <button
                    onClick={() => navigate('/admin/tickets?filter=auto')}
                    className="text-left group focus:outline-none"
                >
                    <StatCard
                        label="AI Auto-Resolved"
                        value={metrics.autoResolved}
                        icon={Bot}
                        color="emerald"
                        subtitle="Success without human"
                        className="group-hover:shadow-2xl group-hover:-translate-y-1 transition-all"
                    />
                </button>
                <button
                    onClick={() => navigate('/admin/tickets?filter=human')}
                    className="text-left group focus:outline-none"
                >
                    <StatCard
                        label="Human Escalations"
                        value={metrics.humanEscalated}
                        icon={Users}
                        color="red"
                        subtitle="Expert intervention"
                        className="group-hover:shadow-2xl group-hover:-translate-y-1 transition-all"
                    />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* 3. Recent Activity (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, color: '#0f1f12', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={20} color="#2563eb" /> RECENT TICKET ACTIVITY
                        </h2>
                    </div>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        border: '1px solid #f0fdf4',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                        overflow: 'hidden'
                    }}>
                        <TicketTable tickets={tickets} limit={10} isLoading={isLoading} />
                    </div>
                </div>

                {/* 4. AI System Health (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="px-2 flex items-center justify-between">
                        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, color: '#0f1f12', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Cpu size={20} color="#16a34a" /> AI SYSTEM HEALTH
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Sync</span>
                        </div>
                    </div>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        border: '1px solid #f0fdf4',
                        padding: '32px'
                    }}>
                        <div className="space-y-6">
                            {aiSubsystems.map((sub, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 transition-all cursor-default hover:bg-white hover:border-green-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white shadow-sm border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 transition-colors">
                                            <sub.icon size={20} />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>{sub.name}</p>
                                            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', fontWeight: 500 }}>Status: {sub.latency}</p>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                                        background: sub.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                                        color: sub.status === 'Active' ? '#15803d' : '#6b7280',
                                        border: sub.status === 'Active' ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                                        borderRadius: '100px'
                                    }}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${sub.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>{sub.status}</span>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4 mt-6 border-t border-gray-100 flex flex-col items-center gap-2">
                                <p style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '0.14em', fontWeight: 600, textTransform: 'uppercase' }}>
                                    All AI Nodes Synchronized
                                </p>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-200 mt-1">
                                    <Activity size={10} color="#9ca3af" />
                                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        Last Telemetry Sync: {formatTimelineDate(new Date())}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
