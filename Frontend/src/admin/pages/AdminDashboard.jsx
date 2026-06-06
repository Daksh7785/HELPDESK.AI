import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

import useAuthStore from "../../store/authStore";
import { supabase } from "../../lib/supabaseClient";
import { api } from "../../services/api";
import StatCard from "../components/StatCard";
import TicketTable from "../components/TicketTable";
import { formatTimelineDate } from "../../utils/dateUtils";

// Inline SVG icon components
const TicketIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
);
const ActivityIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
);
const CpuIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
);
const UsersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);

// AI subsystem icons
const ClassifierIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
);
const PriorityIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
);
const SemanticIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
);
const DuplicateIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="8" y="8" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
);

const aiIconMap = [
    { icon: <ClassifierIcon />, bg: '#F0FDF4', color: '#16a34a' },
    { icon: <PriorityIcon />, bg: '#EFF6FF', color: '#3b82f6' },
    { icon: <SemanticIcon />, bg: '#F5F0FF', color: '#8b5cf6' },
    { icon: <DuplicateIcon />, bg: '#FFF7ED', color: '#f97316' },
];

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const [tickets, setTickets] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (profile) {
            const fetchStats = async () => {
                setIsLoading(true);
                try {
                    const data = await api.apiGetTickets(null, profile?.role === 'admin' ? profile?.company : null, 100);
                    const error = null;
                    if (error) {
                        // Secondary check: If the relation fails, try a simpler select
                        console.warn("Retrying dashboard fetch without relation...", error);
                        const basicData = await api.apiGetTickets(null, profile?.company, 100); const basicError = null;
                        if (basicError) throw basicError;
                        setTickets(basicData || []);
                    } else {
                        setTickets(data || []);
                    }
                } catch (err) { console.error("Dashboard fetch error:", err); }
                finally { setIsLoading(false); }
            };

            fetchStats();
            const interval = setInterval(fetchStats, 30000);
            return () => clearInterval(interval);
        }
    }, [profile]);

    const metrics = useMemo(() => {
        const total = tickets.length;
        const active = tickets.filter(t => !t.status?.toLowerCase()?.includes('resolv') && !t.status?.toLowerCase()?.includes('closed')).length;
        const autoResolved = tickets.filter(t => t.status?.toLowerCase()?.includes('auto')).length;
        const humanEscalated = tickets.filter(t => t.status?.toLowerCase()?.includes('progress') || t.status?.toLowerCase()?.includes('escalat')).length;
        return { total, active, autoResolved, humanEscalated };
    }, [tickets]);

    const aiSubsystems = useMemo(() => {
        const totalCount = tickets.length || 1;
        const categorized = tickets.filter(t => t.category && t.category.toLowerCase() !== 'unassigned' && t.category !== 'Other').length;
        const prioritized = tickets.filter(t => t.priority).length;
        return [
            { name: 'Classifier Engine', status: categorized > 0 ? 'Active' : 'Standby', latency: `${((categorized / totalCount) * 100).toFixed(0)}% Coverage` },
            { name: 'Priority Routing', status: prioritized > 0 ? 'Active' : 'Standby', latency: `${((prioritized / totalCount) * 100).toFixed(0)}% Routed` },
            { name: 'Semantic Analysis', status: tickets.length > 0 ? 'Active' : 'Standby', latency: `${tickets.length} Scanned` },
            { name: 'Duplicate Detection', status: 'Active', latency: 'Optimal' },
        ];
    }, [tickets]);

    return (
        <div className="space-y-10 -m-6 p-6 md:-m-10 md:p-10 bg-[#f8faf9] min-h-screen pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-syne text-2xl font-extrabold text-gray-900 tracking-tight m-0">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 text-[13px] mt-1 flex items-center gap-2 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                        Real-time updates active
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 border-[1.5px] border-green-200 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-[pulse-dot_2s_infinite]"></span>
                    <span className="text-[11px] font-bold text-green-700 tracking-[0.08em] uppercase">System Active</span>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <button onClick={() => navigate('/admin/tickets')} className="text-left group focus:outline-none">
                    <StatCard label="Total Tickets" value={metrics.total} color="indigo" subtitle="Lifetime generated" customIcon={<TicketIcon />} />
                </button>
                <button onClick={() => navigate('/admin/tickets')} className="text-left group focus:outline-none">
                    <StatCard label="Active Tickets" value={metrics.active} color="amber" subtitle="Need attention" customIcon={<ActivityIcon />} />
                </button>
                <button onClick={() => navigate('/admin/tickets?filter=auto')} className="text-left group focus:outline-none">
                    <StatCard label="AI Auto-Resolved" value={metrics.autoResolved} color="emerald" subtitle="Resolved by AI" customIcon={<CpuIcon />} />
                </button>
                <button onClick={() => navigate('/admin/tickets?filter=human')} className="text-left group focus:outline-none">
                    <StatCard label="Escalated Tickets" value={metrics.humanEscalated} color="red" subtitle="Requires support agent" customIcon={<UsersIcon />} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Recent Activity */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="font-syne text-[15px] font-bold text-gray-900 flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            Recent Tickets
                        </h2>
                    </div>
                    <div className="bg-white rounded-[20px] border border-green-50 shadow-[0_2px_16px_rgba(0,0,0,0.05)] overflow-hidden">
                        <TicketTable tickets={tickets} limit={10} isLoading={isLoading} />
                    </div>
                </div>

                {/* AI System Health */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="px-2 flex items-center justify-between">
                        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700, color: '#0f1f12', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                            AI Status
                        </h2>
                        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-[3px]">
                            <span className="w-[5px] h-[5px] rounded-full bg-green-500 inline-block animate-[pulse-dot_2s_infinite]"></span>
                            <span className="text-[10px] font-bold text-green-700">LIVE SYNC</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-[20px] border border-green-50 p-6">
                        <div className="space-y-4">
                            {aiSubsystems.map((sub, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 transition-all cursor-default hover:bg-white hover:border-green-100 bg-[#f8faf9]">
                                    <div className="flex items-center gap-3">
                                        <div style={{ background: aiIconMap[idx].bg, color: aiIconMap[idx].color }} className="w-9 h-9 rounded-[10px] flex items-center justify-center">
                                            {aiIconMap[idx].icon}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-semibold text-gray-900 m-0">{sub.name}</p>
                                            <p className="text-[11px] text-gray-500 mt-[1px]">Status: {sub.latency}</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border ${sub.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                        <div className={`w-[5px] h-[5px] rounded-full ${sub.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        <span className="text-[10px] font-bold uppercase">{sub.status}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col items-center gap-2">
                                <p className="text-[10px] text-gray-400 tracking-[0.14em] font-semibold uppercase">All systems operating normally</p>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f8faf9] rounded-full border border-gray-200">
                                    <Activity size={10} color="#9ca3af" />
                                    <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.1em]">
                                        Last Synced: {formatTimelineDate(new Date())}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pulse dot animation */}
            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.4); opacity: 0.7; }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
