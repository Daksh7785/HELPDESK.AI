import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
    BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
    TrendingUp, Users, ShieldCheck, Zap, AlertCircle, Clock, Activity,
    Layers, Inbox, User, Loader2
} from 'lucide-react';
import { supabase } from "../../lib/supabaseClient";
import StatCard from '../components/StatCard';
import { Card, CardContent } from "../../components/ui/card";
import useAuthStore from "../../store/authStore";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#a855f7', '#ec4899'];

const AdminAnalytics = () => {
    const { profile } = useAuthStore();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase.from('tickets').select('*');
            if (profile?.role === 'admin' && profile?.company) {
                query = query.eq('company', profile.company);
            }
            const { data, error: sbError } = await query.order('created_at', { ascending: false });

            if (sbError) throw sbError;
            setTickets(data || []);
        } catch (err) {
            console.error("Analytics fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const stats = useMemo(() => {
        if (!tickets.length) return {
            total: 0, open: 0, resolved: 0, highPriority: 0,
            volumeTimeline: [], categoryData: [], teamData: [], resolutionData: [], liveFeed: []
        };

        const total = tickets.length;
        const open = tickets.filter(t => t.status?.toLowerCase() === 'open').length;
        const resolved = tickets.filter(t => ['resolved', 'closed'].includes(t.status?.toLowerCase())).length;
        const highPriority = tickets.filter(t => t.priority?.toLowerCase() === 'high').length;

        // 1. Tickets Per Day (Volume Timeline)
        const timeMap = {};
        tickets.forEach(t => {
            if (t.created_at) {
                const date = new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                timeMap[date] = (timeMap[date] || 0) + 1;
            }
        });
        const volumeTimeline = Object.keys(timeMap).map(key => ({ date: key, count: timeMap[key] }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // 2. Tickets Per Category
        const catMap = {};
        tickets.forEach(t => {
            const cat = t.category || 'Uncategorized';
            catMap[cat] = (catMap[cat] || 0) + 1;
        });
        const categoryData = Object.keys(catMap).map(key => ({ name: key, count: catMap[key] }))
            .sort((a, b) => b.count - a.count);

        // 3. Tickets Per Team
        const teamMap = {};
        tickets.forEach(t => {
            const team = t.assigned_team || 'Unassigned';
            teamMap[team] = (teamMap[team] || 0) + 1;
        });
        const teamData = Object.keys(teamMap).map(key => ({ name: key, value: teamMap[key] }))
            .sort((a, b) => b.value - a.value);

        // 4. Resolution Distribution (Open vs Resolved vs In Progress)
        const statusMap = {};
        tickets.forEach(t => {
            const s = t.status?.charAt(0).toUpperCase() + t.status?.slice(1) || 'Unknown';
            statusMap[s] = (statusMap[s] || 0) + 1;
        });
        const resolutionData = Object.keys(statusMap).map(key => ({ name: key, value: statusMap[key] }));

        // 5. Live Activity Feed (Latest 10)
        const liveFeed = tickets.slice(0, 10).map(t => ({
            ticket_id: t.id,
            user: t.user_id ? `User ${t.user_id.slice(0, 5)}` : 'System',
            action: `Ticket ${t.status || 'Updated'}`,
            type: t.status === 'open' ? 'create' : t.status === 'resolved' ? 'resolve' : 'assign',
            timeFormatted: new Date(t.created_at).toLocaleString(),
            time: new Date(t.created_at).getTime()
        }));

        return {
            total, open, resolved, highPriority,
            volumeTimeline, categoryData, teamData, resolutionData, liveFeed
        };
    }, [tickets]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest italic text-center">Crunching mission data analytics...</p>
        </div>
    );


    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase italic">Mission Analytics</h1>
                    <p className="text-sm text-slate-400 font-bold mt-2 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <Activity size={14} className="text-indigo-500" /> Live Data Stream
                    </p>
                </div>
            </div>

            {/* KPI Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Tickets"
                    value={stats.total}
                    subtitle="System lifetime"
                    icon={Layers}
                    color="slate"
                />
                <StatCard
                    label="Open Tickets"
                    value={stats.open}
                    subtitle="Awaiting action"
                    icon={Activity}
                    color="amber"
                />
                <StatCard
                    label="Resolved"
                    value={stats.resolved}
                    subtitle="Mission completed"
                    icon={ShieldCheck}
                    color="emerald"
                />
                <StatCard
                    label="High Priority"
                    value={stats.highPriority}
                    subtitle="Critical attention"
                    icon={AlertCircle}
                    color="red"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Main Charts Column (8 cols) */}
                <div className="lg:col-span-8 space-y-10">
                    {/* Volume Timeline Chart */}
                    <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden relative">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase italic">
                                    <LineChartIcon size={18} className="text-indigo-500" /> Ticket Volume (Daily)
                                </h3>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            {stats.volumeTimeline.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.volumeTimeline}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            fontSize={10}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            fontSize={10}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontWeight: 700 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: '#4f46e5', fontWeight: 900 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#6366f1"
                                            strokeWidth={4}
                                            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px] italic tracking-widest">No timeline data available</div>
                            )}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Team Distribution Chart */}
                        <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden relative">
                            <div className="mb-8">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase italic">
                                    <Users size={18} className="text-indigo-500" /> Team Allocation
                                </h3>
                            </div>
                            <div className="h-[250px]">
                                {stats.teamData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.teamData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {stats.teamData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">{value}</span>} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px] italic tracking-widest">No team data</div>
                                )}
                            </div>
                        </Card>

                        {/* Tickets by Category Chart */}
                        <Card className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden relative">
                            <div className="mb-8">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase italic">
                                    <BarChart3 size={18} className="text-indigo-500" /> Category Breakdown
                                </h3>
                            </div>
                            <div className="h-[250px]">
                                {stats.categoryData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px] italic tracking-widest">No category data</div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Live Activity Feed Column (4 cols) */}
                <div className="lg:col-span-4">
                    <Card className="p-0 border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] bg-white h-full relative overflow-hidden">
                        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
                            <h3 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-2">
                                <Activity size={18} className="text-emerald-400" /> Live Sequence
                            </h3>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[800px] custom-scrollbar">
                            {stats.liveFeed.length > 0 ? (
                                stats.liveFeed.map((event, idx) => (
                                    <div key={idx} className="flex gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10 ${event.type === 'create' ? 'bg-indigo-100 text-indigo-600' :
                                                event.type === 'resolve' ? 'bg-emerald-100 text-emerald-600' :
                                                    'bg-amber-100 text-amber-600'
                                                }`}>
                                                {event.type === 'create' ? <Inbox size={14} /> :
                                                    event.type === 'resolve' ? <ShieldCheck size={14} /> :
                                                        <TrendingUp size={14} />}
                                            </div>
                                            {idx !== stats.liveFeed.length - 1 && (
                                                <div className="w-0.5 h-full bg-slate-100 group-hover:bg-indigo-100 transition-colors my-1"></div>
                                            )}
                                        </div>
                                        <div className="pb-6">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                                                    {event.ticket_id.slice(0, 8)}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{event.timeFormatted.split(',')[1]}</span>
                                            </div>
                                            <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{event.action}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60 italic">{event.user}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20">
                                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] italic">No active frequency detected.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
