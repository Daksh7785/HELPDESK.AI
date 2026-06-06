import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
    Activity, AlertCircle, BarChart3, Bot, Clock, Download,
    Inbox, Layers, Loader2, RefreshCw, ShieldCheck, Star,
    Target, TrendingUp, Users, Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import StatCard from '../components/StatCard';
import { Card } from '../../components/ui/card';
import useAuthStore from '../../store/authStore';
import { formatTimelineDate } from '../../utils/dateUtils';

// ─── Design tokens ──────────────────────────────────────────────────────────
const PALETTE = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const SLA_COLORS = { Critical: '#ef4444', High: '#f59e0b', Medium: '#6366f1', Low: '#10b981' };
const TOOLTIP_STYLE = {
    backgroundColor: '#fff',
    border: '1px solid #f0fdf4',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    fontSize: '12px',
};
const CARD_STYLE = {
    background: '#ffffff',
    borderRadius: '20px',
    border: '1px solid #f0fdf4',
    boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
    padding: '24px',
};

// ─── Utility helpers ─────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function fetchEndpoint(path, params = {}) {
    const url = new URL(`${API_BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
    return res.json();
}

function fmtHours(h) {
    if (h === null || h === undefined) return '—';
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 24) return `${h.toFixed(1)}h`;
    return `${(h / 24).toFixed(1)}d`;
}

function exportCsv(rows, filename) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).join(',');
    const body = rows.map(r => Object.values(r).map(v => JSON.stringify(v ?? '')).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, onExport, onRefresh, loading }) {
    return (
        <div className="flex items-center justify-between mb-6">
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#0f1f12', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Icon size={18} color="#22c55e" />
                {title}
            </h3>
            <div className="flex items-center gap-2">
                {onRefresh && (
                    <button
                        id={`btn-refresh-${title.replace(/\s+/g, '-').toLowerCase()}`}
                        onClick={onRefresh}
                        disabled={loading}
                        style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}
                        title="Refresh"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                )}
                {onExport && (
                    <button
                        id={`btn-export-${title.replace(/\s+/g, '-').toLowerCase()}`}
                        onClick={onExport}
                        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16a34a', fontWeight: 600 }}
                    >
                        <Download size={12} /> CSV
                    </button>
                )}
            </div>
        </div>
    );
}

function ChartShell({ loading, error, empty, height = 280, children }) {
    if (loading) return (
        <div style={{ height }} className="flex items-center justify-center">
            <Loader2 size={28} className="text-emerald-400 animate-spin" />
        </div>
    );
    if (error) return (
        <div style={{ height }} className="flex flex-col items-center justify-center gap-2">
            <AlertCircle size={24} className="text-red-300" />
            <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>Failed to load data</p>
        </div>
    );
    if (empty) return (
        <div style={{ height }} className="flex items-center justify-center">
            <p style={{ fontSize: '11px', color: '#d1d5db', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No data available</p>
        </div>
    );
    return <div style={{ height }}>{children}</div>;
}

function PeriodPicker({ value, onChange }) {
    const opts = [
        { label: '7 Days', value: '7d' },
        { label: '30 Days', value: '30d' },
        { label: '90 Days', value: '90d' },
    ];
    return (
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
            {opts.map(o => (
                <button
                    key={o.value}
                    id={`period-${o.value}`}
                    onClick={() => onChange(o.value)}
                    style={{
                        padding: '5px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        background: value === o.value ? '#ffffff' : 'transparent',
                        color: value === o.value ? '#16a34a' : '#6b7280',
                        boxShadow: value === o.value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

// ─── Custom SLA Bar ───────────────────────────────────────────────────────────
function SlaBarRow({ entry }) {
    const color = SLA_COLORS[entry.priority] ?? '#10b981';
    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{entry.priority}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>target: {entry.sla_target_hours}h</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: entry.compliance_rate < 70 ? '#ef4444' : entry.compliance_rate < 90 ? '#f59e0b' : '#16a34a' }}>
                    {entry.compliance_rate}%
                </span>
            </div>
            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${entry.compliance_rate}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <div className="flex justify-between mt-1">
                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>{entry.within_sla} within SLA</span>
                <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>{entry.breached} breached</span>
            </div>
        </div>
    );
}

// Skeleton view exported just in case it is ever imported or requested
export const AdminAnalyticsSkeleton = () => (
    <div
        style={{ background: '#f8faf9', minHeight: '100vh', paddingBottom: '80px' }}
        className="space-y-10 -m-6 p-6 md:-m-10 md:p-10 animate-pulse"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-atomic="true"
    >
        <span className="sr-only">Loading analytics...</span>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
                <div className="h-8 w-40 bg-slate-200 rounded-full" />
                <div className="h-4 w-56 bg-slate-100 rounded-full" />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
                <div key={index} className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="h-4 w-24 bg-slate-100 rounded-full" />
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl" />
                    </div>
                    <div className="h-8 w-20 bg-slate-200 rounded-full" />
                    <div className="h-3 w-32 bg-slate-100 rounded-full" />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
                <div className="bg-white rounded-[20px] border border-emerald-50 p-6 space-y-6">
                    <div className="h-5 w-48 bg-slate-200 rounded-full" />
                    <div className="h-[300px] w-full bg-slate-50 rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64 bg-white rounded-[20px] border border-emerald-50" />
                    <div className="h-64 bg-white rounded-[20px] border border-emerald-50" />
                </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
                {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-32 bg-white rounded-[20px] border border-emerald-50" />
                ))}
            </div>
        </div>
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const AdminAnalytics = () => {
    const { profile } = useAuthStore();
    const companyId = profile?.company_id ?? undefined;

    // ── period for volume chart ──
    const [period, setPeriod] = useState('30d');

    // ── API data state ──
    const [overview, setOverview] = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewError, setOverviewError] = useState(false);

    const [volumeData, setVolumeData] = useState(null);
    const [volumeLoading, setVolumeLoading] = useState(true);
    const [volumeError, setVolumeError] = useState(false);

    const [slaData, setSlaData] = useState(null);
    const [slaLoading, setSlaLoading] = useState(true);
    const [slaError, setSlaError] = useState(false);

    const [catData, setCatData] = useState(null);
    const [catLoading, setCatLoading] = useState(true);
    const [catError, setCatError] = useState(false);

    const [agentData, setAgentData] = useState(null);
    const [agentLoading, setAgentLoading] = useState(true);
    const [agentError, setAgentError] = useState(false);

    const [resTimeData, setResTimeData] = useState(null);
    const [resTimeLoading, setResTimeLoading] = useState(true);
    const [resTimeError, setResTimeError] = useState(false);

    // ── Supabase-direct data for legacy AI metrics section ──
    const [tickets, setTickets] = useState([]);

    // ── Fetch helpers ──
    const load = useCallback(async (setter, loadSetter, errSetter, path, params) => {
        loadSetter(true);
        errSetter(false);
        try {
            const data = await fetchEndpoint(path, params);
            setter(data);
        } catch (e) {
            console.error(e);
            errSetter(true);
        } finally {
            loadSetter(false);
        }
    }, []);

    const fetchOverview = useCallback(() => load(setOverview, setOverviewLoading, setOverviewError, '/admin/analytics/overview', { company_id: companyId }), [companyId, load]);
    const fetchVolume = useCallback(() => load(setVolumeData, setVolumeLoading, setVolumeError, '/admin/analytics/volume', { company_id: companyId, period }), [companyId, period, load]);
    const fetchSla = useCallback(() => load(setSlaData, setSlaLoading, setSlaError, '/admin/analytics/sla', { company_id: companyId }), [companyId, load]);
    const fetchCat = useCallback(() => load(setCatData, setCatLoading, setCatError, '/admin/analytics/categories', { company_id: companyId }), [companyId, load]);
    const fetchAgents = useCallback(() => load(setAgentData, setAgentLoading, setAgentError, '/admin/analytics/agents', { company_id: companyId }), [companyId, load]);
    const fetchResTime = useCallback(() => load(setResTimeData, setResTimeLoading, setResTimeError, '/admin/analytics/resolution-time', { company_id: companyId }), [companyId, load]);

    // Supabase direct fetch for AI metrics (legacy)
    const fetchTicketsDirect = useCallback(async () => {
        if (!supabase) return;
        try {
            let q = supabase.from('tickets').select('*');
            if (profile?.role === 'admin' && profile?.company) q = q.eq('company', profile.company);
            const { data } = await q.order('created_at', { ascending: false });
            setTickets(data || []);
        } catch (e) {
            console.error('Direct tickets fetch:', e);
        }
    }, [profile]);

    // Initial load
    useEffect(() => {
        if (!profile) return;
        fetchOverview();
        fetchSla();
        fetchCat();
        fetchAgents();
        fetchResTime();
        fetchTicketsDirect();
    }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

    // Volume depends on period
    useEffect(() => {
        if (!profile) return;
        fetchVolume();
    }, [period, profile]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── AI metrics (derived from raw tickets) ──
    const aiStats = useMemo(() => {
        if (!tickets.length) return { accuracyRate: 0, resolutionSplit: [], misclassifiedCategories: [], avgCsatScore: null };
        const corrected = tickets.filter(t => t.metadata?.corrected_at).length;
        const accuracyRate = ((((tickets.length - corrected) / tickets.length) * 100).toFixed(1));
        const aiResolved = tickets.filter(t => t.status?.toLowerCase()?.includes('auto')).length;
        const humanResolved = tickets.filter(t => ['resolved', 'closed'].includes(t.status?.toLowerCase()) && !t.status?.toLowerCase()?.includes('auto')).length;
        const resolutionSplit = [
            { name: 'AI Auto-Resolved', value: aiResolved, fill: '#10b981' },
            { name: 'Human Resolved', value: humanResolved, fill: '#6366f1' },
            { name: 'Open/Pending', value: tickets.length - aiResolved - humanResolved, fill: '#f59e0b' },
        ].filter(d => d.value > 0);
        const correctedTickets = tickets.filter(t => t.metadata?.corrected_at);
        const misclassMap = {};
        correctedTickets.forEach(t => { const cat = t.category || 'Unknown'; misclassMap[cat] = (misclassMap[cat] || 0) + 1; });
        const misclassifiedCategories = Object.entries(misclassMap).map(([name, corrections]) => ({ name, corrections })).sort((a, b) => b.corrections - a.corrections).slice(0, 6);
        const ratedTickets = tickets.filter(t => t.csat_rating);
        const avgCsatScore = ratedTickets.length ? (ratedTickets.reduce((sum, t) => sum + t.csat_rating, 0) / ratedTickets.length).toFixed(1) : null;
        return { accuracyRate, resolutionSplit, misclassifiedCategories, avgCsatScore };
    }, [tickets]);

    // ── Live feed from tickets ──
    const liveFeed = useMemo(() => tickets.slice(0, 10).map(t => ({
        ticket_id: t.id,
        user: t.creator?.full_name || (t.user_id ? `User …${t.user_id.slice(-4)}` : 'Anonymous'),
        action: `Ticket ${t.status || 'Updated'}`,
        type: t.status === 'open' ? 'create' : t.status?.includes('resolv') ? 'resolve' : 'assign',
        timeFormatted: formatTimelineDate(t.created_at),
    })), [tickets]);

    // ── Agent chart data ──
    const agentChartData = useMemo(() => {
        if (!agentData?.teams) return [];
        return agentData.teams.slice(0, 10).map(t => ({ name: t.team, open: t.open_tickets, total: t.total_tickets }));
    }, [agentData]);

    // ── Category chart data ──
    const catChartData = useMemo(() => {
        if (!catData?.categories) return [];
        return catData.categories.slice(0, 8).map((c, i) => ({ name: c.name, count: c.count, fill: PALETTE[i % PALETTE.length] }));
    }, [catData]);

    // AI vs Manual resolution split
    const aiResolved = tickets.filter((t) => t.status?.toLowerCase()?.includes('auto')).length;
    const humanResolved = tickets.filter(
      (t) =>
        ['resolved', 'closed'].includes(t.status?.toLowerCase()) &&
        !t.status?.toLowerCase()?.includes('auto')
    ).length;
    const resolutionSplit = [
      { name: 'AI Auto-Resolved', value: aiResolved, fill: '#10b981' },
      { name: 'Human Resolved', value: humanResolved, fill: '#6366f1' },
      { name: 'Open/Pending', value: tickets.length - aiResolved - humanResolved, fill: '#f59e0b' },
    ].filter((d) => d.value > 0);

    // Top categories that were corrected by admins
    const correctedTickets = tickets.filter((t) => t.metadata?.corrected_at);
    const misclassMap = {};
    correctedTickets.forEach((t) => {
      const cat = t.category || 'Unknown';
      misclassMap[cat] = (misclassMap[cat] || 0) + 1;
    });
    const misclassifiedCategories = Object.keys(misclassMap)
      .map((key) => ({ name: key, corrections: misclassMap[key] }))
      .sort((a, b) => b.corrections - a.corrections)
      .slice(0, 6);

    // Average CSAT
    const ratedTickets = tickets.filter((t) => t.csat_rating);
    const avgCsatScore = ratedTickets.length
      ? (ratedTickets.reduce((sum, t) => sum + t.csat_rating, 0) / ratedTickets.length).toFixed(1)
      : null;

    return { accuracyRate, resolutionSplit, misclassifiedCategories, avgCsatScore };
  }, [tickets]);

    // Show initial skeleton loader if data is not loaded yet
    if (overviewLoading && volumeLoading && slaLoading && tickets.length === 0) {
        return <AdminAnalyticsSkeleton />;
    }

    return (
        <div style={{ background: '#f8faf9', minHeight: '100vh', paddingBottom: '80px' }} className="space-y-10 -m-6 p-6 md:-m-10 md:p-10 animate-in fade-in duration-700">

            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 id="analytics-page-title" style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, color: '#0f1f12', margin: 0 }}>
                        Analytics
                    </h1>
                    <p style={{ fontSize: '11px', letterSpacing: '0.14em', color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', textTransform: 'uppercase' }}>
                        <Activity size={14} color="#16a34a" /> Helpdesk Performance &amp; SLA Insights
                    </p>
                </div>
                <button
                    id="btn-refresh-all"
                    onClick={() => { fetchOverview(); fetchVolume(); fetchSla(); fetchCat(); fetchAgents(); fetchResTime(); fetchTicketsDirect(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#16a34a' }}
                >
                    <RefreshCw size={14} /> Refresh All
                </button>
            </div>
          </div>

            {/* ── KPI Overview Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total tickets */}
                <div style={CARD_STYLE}>
                    <div className="flex items-center justify-between mb-3">
                        <Layers size={20} color="#6b7280" />
                        {overviewLoading && <Loader2 size={14} className="animate-spin text-emerald-400" />}
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f1f12', fontFamily: 'Syne, sans-serif' }}>{overviewError ? '—' : (overview?.total ?? '…')}</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginTop: '4px' }}>Total Tickets</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        <span style={{ color: '#10b981' }}>{overview?.open ?? '—'} open</span> · {overview?.resolved ?? '—'} resolved
                    </div>
                </div>

                {/* SLA breach rate */}
                <div style={CARD_STYLE}>
                    <div className="flex items-center justify-between mb-3">
                        <ShieldCheck size={20} color="#6b7280" />
                        {overviewLoading && <Loader2 size={14} className="animate-spin text-emerald-400" />}
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: overview?.sla_breach_rate > 20 ? '#ef4444' : '#10b981' }}>
                        {overviewError ? '—' : (overview ? `${overview.sla_breach_rate}%` : '…')}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginTop: '4px' }}>SLA Breach Rate</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>of all tickets</div>
                </div>

                {/* Avg resolution */}
                <div style={CARD_STYLE}>
                    <div className="flex items-center justify-between mb-3">
                        <Clock size={20} color="#6b7280" />
                        {overviewLoading && <Loader2 size={14} className="animate-spin text-emerald-400" />}
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#0f1f12' }}>
                        {overviewError ? '—' : (overview ? fmtHours(overview.avg_resolution_hours) : '…')}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginTop: '4px' }}>Avg Resolution Time</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>across resolved tickets</div>
                </div>

                {/* AI accuracy */}
                <div style={CARD_STYLE}>
                    <div className="flex items-center justify-between mb-3">
                        <Target size={20} color="#6b7280" />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'Syne, sans-serif', color: '#10b981' }}>{aiStats.accuracyRate}%</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginTop: '4px' }}>AI Accuracy</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>correct auto-classifications</div>
                </div>
            </div>

            {/* ── Row 1: Volume + SLA ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Ticket Volume Line Chart (8 cols) */}
                <div className="lg:col-span-8" style={CARD_STYLE}>
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700, color: '#0f1f12', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <TrendingUp size={18} color="#22c55e" /> Daily Ticket Volume
                        </h3>
                        <div className="flex items-center gap-3">
                            <PeriodPicker value={period} onChange={setPeriod} />
                            <button
                                id="btn-refresh-volume"
                                onClick={fetchVolume}
                                disabled={volumeLoading}
                                style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}
                            >
                                <RefreshCw size={12} className={volumeLoading ? 'animate-spin' : ''} />
                            </button>
                            <button
                                id="btn-export-volume"
                                onClick={() => exportCsv(volumeData?.series ?? [], 'ticket_volume.csv')}
                                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16a34a', fontWeight: 600 }}
                            >
                                <Download size={12} /> CSV
                            </button>
                        </div>
                    </div>
                    <ChartShell loading={volumeLoading} error={volumeError} empty={!volumeData?.series?.length} height={300}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={volumeData?.series ?? []}>
                                <defs>
                                    <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                                    </linearGradient>
                                    <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.14} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 600 }} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Legend verticalAlign="top" height={32} formatter={v => <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{v}</span>} />
                                <Area type="monotone" dataKey="created" name="Created" stroke="#10b981" strokeWidth={2.5} fill="url(#gradCreated)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradResolved)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartShell>
                </div>

                {/* SLA Compliance by Priority (4 cols) */}
                <div className="lg:col-span-4" style={CARD_STYLE}>
                    <SectionHeader
                        icon={ShieldCheck}
                        title="SLA Compliance"
                        onExport={() => exportCsv(slaData?.sla_by_priority ?? [], 'sla_compliance.csv')}
                        onRefresh={fetchSla}
                        loading={slaLoading}
                    />
                    <ChartShell loading={slaLoading} error={slaError} empty={!slaData?.sla_by_priority?.length} height={300}>
                        <div style={{ height: 300, overflowY: 'auto' }}>
                            {slaData?.sla_by_priority?.map(entry => (
                                <SlaBarRow key={entry.priority} entry={entry} />
                            ))}
                        </div>
                    </ChartShell>
                </div>
            </div>

            {/* ── Row 2: Categories + Agent Workload ───────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Category Donut */}
                <div style={CARD_STYLE}>
                    <SectionHeader
                        icon={BarChart3}
                        title="Tickets by Category"
                        onExport={() => exportCsv(catData?.categories ?? [], 'categories.csv')}
                        onRefresh={fetchCat}
                        loading={catLoading}
                    />
                    <ChartShell loading={catLoading} error={catError} empty={!catChartData.length} height={280}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={catChartData}
                                    cx="40%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={95}
                                    paddingAngle={3}
                                    dataKey="count"
                                    stroke="none"
                                >
                                    {catChartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} cornerRadius={4} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, n]} />
                                <Legend
                                    layout="vertical"
                                    align="right"
                                    verticalAlign="middle"
                                    formatter={v => <span style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>{v}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartShell>
                </div>

                {/* Agent / Team Workload Horizontal Bar */}
                <div style={CARD_STYLE}>
                    <SectionHeader
                        icon={Users}
                        title="Team Workload (Open Tickets)"
                        onExport={() => exportCsv(agentData?.teams ?? [], 'agent_workload.csv')}
                        onRefresh={fetchAgents}
                        loading={agentLoading}
                    />
                    <ChartShell loading={agentLoading} error={agentError} empty={!agentChartData.length} height={280}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agentChartData} layout="vertical" margin={{ top: 0, right: 20, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 600 }} />
                                <YAxis type="category" dataKey="name" width={90} fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#374151', fontWeight: 600 }} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Legend formatter={v => <span style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>{v}</span>} />
                                <Bar dataKey="open" name="Open" fill="#10b981" radius={[0, 6, 6, 0]} barSize={14} />
                                <Bar dataKey="total" name="Total" fill="#e5e7eb" radius={[0, 6, 6, 0]} barSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartShell>
                </div>
            </div>

            {/* ── Row 3: Resolution Time Histogram + AI Resolution Split ────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Resolution Time Histogram */}
                <div style={CARD_STYLE}>
                    <SectionHeader
                        icon={Clock}
                        title="Resolution Time Distribution"
                        onExport={() => exportCsv(resTimeData?.buckets ?? [], 'resolution_time.csv')}
                        onRefresh={fetchResTime}
                        loading={resTimeLoading}
                    />
                    {resTimeData && (
                        <div className="flex gap-4 mb-4">
                            <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '6px 14px' }}>
                                <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>AVG</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{fmtHours(resTimeData.avg_hours)}</div>
                            </div>
                            <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '6px 14px' }}>
                                <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>MEDIAN</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#6366f1' }}>{fmtHours(resTimeData.median_hours)}</div>
                            </div>
                            <div style={{ background: '#fefce8', borderRadius: '8px', padding: '6px 14px' }}>
                                <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>SAMPLE</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>{resTimeData.sample_size}</div>
                            </div>
                        </div>
                    )}
                    <ChartShell loading={resTimeLoading} error={resTimeError} empty={!resTimeData?.buckets?.length} height={220}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={resTimeData?.buckets ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 600 }} />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 600 }} allowDecimals={false} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Bar dataKey="count" name="Tickets" fill="url(#histGrad)" radius={[6, 6, 0, 0]} barSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartShell>
                </div>

                {/* AI Resolution Split (from legacy Supabase data) */}
                <div style={CARD_STYLE}>
                    <SectionHeader icon={Bot} title="Resolution Status" />
                    <ChartShell loading={false} error={false} empty={!aiStats.resolutionSplit.length} height={280}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={aiStats.resolutionSplit} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none">
                                    {aiStats.resolutionSplit.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} cornerRadius={4} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Legend verticalAlign="bottom" height={36} formatter={v => <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartShell>
                </div>
            </div>

            {/* ── Row 4: AI Correction Log + Live Feed (legacy sections) ────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* AI Correction Log */}
                <div className="lg:col-span-8" style={CARD_STYLE}>
                    <SectionHeader icon={AlertCircle} title="AI Correction Log" />
                    <p style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '-16px', marginBottom: '16px' }}>Categories with the most manual corrections</p>
                    <ChartShell loading={false} error={false} empty={!aiStats.misclassifiedCategories.length} height={240}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={aiStats.misclassifiedCategories} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} allowDecimals={false} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Bar dataKey="corrections" name="Corrections" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartShell>
                    {!aiStats.misclassifiedCategories.length && (
                        <div className="flex flex-col items-center gap-2 py-6">
                            <ShieldCheck size={32} className="text-emerald-200" />
                            <p style={{ fontSize: '11px', color: '#d1d5db', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI classifications are performing optimally.</p>
                        </div>
                    )}
                </div>

                {/* Live Activity Feed */}
                <div className="lg:col-span-4" style={{ ...CARD_STYLE, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ background: '#0f1f12', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, textTransform: 'uppercase' }}>
                            <Activity size={16} color="#22c55e" /> Recent Tickets
                        </h3>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 10px rgba(34,197,94,0.5)' }} />
                    </div>
                    <div className="overflow-y-auto flex-1" style={{ maxHeight: '340px', padding: '8px 0' }}>
                        {liveFeed.length > 0 ? liveFeed.map((event, idx) => {
                            const isResolve = event.action.toLowerCase().includes('resolv');
                            const badgeStyle = isResolve
                                ? { background: '#dcfce7', color: '#15803d' }
                                : event.type === 'create'
                                    ? { background: '#fef9c3', color: '#ca8a04' }
                                    : { background: '#fef3c7', color: '#d97706' };
                            const badgeText = isResolve ? 'Resolved' : event.type === 'create' ? 'Open' : 'Escalated';
                            return (
                                <div key={idx} style={{ padding: '10px 20px', borderBottom: '1px solid #f9fafb', display: 'flex', gap: '12px' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0 }}>
                                        {event.type === 'create' ? <Inbox size={13} color="#10b981" /> : event.type === 'resolve' ? <ShieldCheck size={13} color="#6366f1" /> : <TrendingUp size={13} color="#f59e0b" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>#{event.ticket_id?.slice(0, 8)}</span>
                                            <span style={{ ...badgeStyle, padding: '2px 8px', borderRadius: 99, fontSize: '10px', fontWeight: 700 }}>{badgeText}</span>
                                        </div>
                                        <p style={{ fontSize: '12px', fontWeight: 500, color: '#111827', margin: '2px 0 0 0' }}>{event.action}</p>
                                        <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>{event.user}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-12">
                                <p style={{ fontSize: '11px', color: '#d1d5db', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Waiting for signal…</p>
                            </div>
                        )}
                    </div>
                  );
                })
              ) : (
                <div className='text-center py-20'>
                  <p
                    style={{
                      fontSize: '11px',
                      color: '#9ca3af',
                      letterSpacing: '0.14em',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Waiting for signal...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
