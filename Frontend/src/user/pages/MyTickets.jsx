import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Ticket, Inbox, ShieldCheck, Loader2, AlertCircle, Download,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/card';
import { formatTicketId } from '../../utils/format';
import TicketStatusBadge from '../components/TicketStatusBadge';
import { formatTimelineDate, getTimeZoneAbbr } from '../../utils/dateUtils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../../components/ui/tooltip';
import AdvancedSearchBar from '../../components/shared/AdvancedSearchBar';
import SavedSearches from '../../components/shared/SavedSearches';

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
    { value: 'open',        label: 'Open' },
    { value: 'in progress', label: 'In Progress' },
    { value: 'resolved',    label: 'Resolved' },
    { value: 'closed',      label: 'Closed' },
];

const PRIORITY_OPTIONS = [
    { value: 'critical', label: 'Critical' },
    { value: 'high',     label: 'High' },
    { value: 'medium',   label: 'Medium' },
    { value: 'low',      label: 'Low' },
];

const CATEGORY_OPTIONS = [
    { value: 'Network',  label: 'Network' },
    { value: 'Hardware', label: 'Hardware' },
    { value: 'Software', label: 'Software' },
    { value: 'Access',   label: 'Access' },
];

const SORT_OPTIONS = [
    { value: 'created_at:desc', label: 'Newest first' },
    { value: 'created_at:asc',  label: 'Oldest first' },
    { value: 'updated_at:desc', label: 'Recently updated' },
    { value: 'priority:desc',   label: 'Priority ↓' },
];

const PAGE_SIZE = 25;

// ── Helpers ──────────────────────────────────────────────────────────────────
const filtersToParams = (f) => {
    const p = new URLSearchParams();
    if (f.q)        p.set('q',        f.q);
    if (f.status)   p.set('status',   f.status);
    if (f.priority) p.set('priority', f.priority);
    if (f.category) p.set('category', f.category);
    if (f.dateFrom) p.set('dateFrom', f.dateFrom);
    if (f.dateTo)   p.set('dateTo',   f.dateTo);
    if (f.sort && f.sort !== 'created_at:desc') p.set('sort', f.sort);
    return p;
};

const paramsToFilters = (params) => ({
    q:        params.get('q')        || undefined,
    status:   params.get('status')   || undefined,
    priority: params.get('priority') || undefined,
    category: params.get('category') || undefined,
    dateFrom: params.get('dateFrom') || undefined,
    dateTo:   params.get('dateTo')   || undefined,
    sort:     params.get('sort')     || 'created_at:desc',
});

const exportCSV = (tickets) => {
    const header = ['ID', 'Subject', 'Category', 'Priority', 'Status', 'Created At'];
    const rows = tickets.map(t => [
        formatTicketId(t.id),
        `"${(t.subject || t.summary || '').replace(/"/g, '""')}"`,
        t.category || '',
        t.priority || '',
        t.status   || '',
        t.created_at ? new Date(t.created_at).toISOString() : '',
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `my-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

const getPriorityColor = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high' || p === 'critical') return 'text-red-600 font-bold';
    if (p === 'medium') return 'text-amber-600 font-bold';
    if (p === 'low')    return 'text-blue-600 font-bold';
    return 'text-gray-600';
};

// ── Component ─────────────────────────────────────────────────────────────────
function MyTickets() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();

    const [tickets,     setTickets]     = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);
    const [page,        setPage]        = useState(1);
    const [totalPages,  setTotalPages]  = useState(1);
    const [total,       setTotal]       = useState(0);
    const [filters,     setFilters]     = useState(() => paramsToFilters(searchParams));

    // ── URL ↔ filter sync ────────────────────────────────────────────────────
    useEffect(() => {
        setSearchParams(filtersToParams(filters), { replace: true });
        setPage(1); // reset pagination on filter change
    }, [filters]);

    // ── Data Fetch ───────────────────────────────────────────────────────────
    const fetchTickets = useCallback(async (currentPage = 1) => {
        if (!user?.id) { setLoading(false); return; }
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('tickets')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id);

            // Apply text filter via ilike (client-accessible, no RPC needed for user portal)
            if (filters.q) {
                const safe = filters.q.replace(/[%_]/g, '\\$&');
                query = query.or(
                    `subject.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`
                );
            }
            if (filters.status)   query = query.eq('status',   filters.status);
            if (filters.priority) query = query.eq('priority', filters.priority);
            if (filters.category) query = query.eq('category', filters.category);
            if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
            if (filters.dateTo)   query = query.lte('created_at', filters.dateTo + 'T23:59:59Z');

            // Sort
            const [sortCol, sortDir] = (filters.sort || 'created_at:desc').split(':');
            query = query.order(sortCol || 'created_at', { ascending: sortDir === 'asc' });

            // Pagination
            const offset = (currentPage - 1) * PAGE_SIZE;
            query = query.range(offset, offset + PAGE_SIZE - 1);

            const { data, error: sbError, count } = await query;

            if (sbError) throw sbError;

            setTickets(data || []);
            setTotal(count || 0);
            setTotalPages(Math.ceil((count || 0) / PAGE_SIZE) || 1);
        } catch (err) {
            setError(err.message);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    }, [user, filters]);

    useEffect(() => {
        fetchTickets(page);
    }, [fetchTickets, page]);

    // ── Real-time subscription ───────────────────────────────────────────────
    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel(`user_tickets_${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tickets', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setTickets(prev => [payload.new, ...prev].slice(0, PAGE_SIZE));
                    } else if (payload.eventType === 'UPDATE') {
                        setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
                    } else if (payload.eventType === 'DELETE') {
                        setTickets(prev => prev.filter(t => t.id !== payload.old.id));
                    }
                }
            )
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [user]);

    const handleFiltersChange = (next) => setFilters(next);
    const handleClearFilters  = () => setFilters({ sort: 'created_at:desc' });

    const hasAnyFilter = Object.entries(filters).some(
        ([k, v]) => k !== 'sort' && v !== undefined && v !== ''
    );

    return (
        <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-10 flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Ticket className="text-emerald-600 w-8 h-8" /> My Tickets
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Manage and track your support requests
                        {total > 0 && !loading && (
                            <span className="ml-2 text-emerald-600 font-bold">({total} total)</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* CSV Export */}
                    {tickets.length > 0 && (
                        <button
                            id="export-csv-btn"
                            onClick={() => exportCSV(tickets)}
                            title="Export current page as CSV"
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/create-ticket')}
                        className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        Create New Ticket
                    </button>
                </div>
            </div>

            {/* Advanced Search Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                <AdvancedSearchBar
                    filters={filters}
                    onChange={handleFiltersChange}
                    onClear={handleClearFilters}
                    statusOptions={STATUS_OPTIONS}
                    priorityOptions={PRIORITY_OPTIONS}
                    categoryOptions={CATEGORY_OPTIONS}
                    sortOptions={SORT_OPTIONS}
                    placeholder="Search by ID, subject or description… (press / to focus)"
                >
                    <SavedSearches
                        currentFilters={filters}
                        onLoad={handleFiltersChange}
                    />
                </AdvancedSearchBar>
            </div>

            {/* Content */}
            {loading ? (
                <Card className="border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden p-6 w-full">
                    <div className="space-y-6">
                        <style>{`@keyframes shimmer{100%{transform:translateX(100%)}}`}</style>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-6 py-2">
                                <div className="h-5 w-16 bg-slate-100 rounded-md relative overflow-hidden shrink-0">
                                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.5s_infinite]" />
                                </div>
                                <div className="h-5 flex-1 bg-slate-100 rounded-md relative overflow-hidden max-w-[300px]">
                                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.5s_infinite]" />
                                </div>
                                <div className="h-6 w-24 bg-slate-100 rounded-md relative overflow-hidden shrink-0">
                                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.5s_infinite]" />
                                </div>
                                <div className="h-6 w-20 bg-slate-100 rounded-full relative overflow-hidden shrink-0">
                                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.5s_infinite]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            ) : error ? (
                <Card className="p-8 border-red-100 bg-red-50/50 rounded-2xl flex flex-col items-center text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-bold text-red-900 mb-1">Database Sync Error</h3>
                    <p className="text-red-700/70 text-sm max-w-sm mb-6">{error}</p>
                    <button
                        onClick={() => fetchTickets(page)}
                        className="px-6 py-2 bg-white border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm"
                    >
                        Retry Connection
                    </button>
                </Card>
            ) : tickets.length === 0 && !hasAnyFilter ? (
                // True empty state
                <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-gray-200 bg-transparent shadow-none rounded-2xl">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Inbox className="text-gray-400 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">No tickets yet</h3>
                    <p className="text-gray-500 max-w-sm mb-8">
                        You haven't submitted any support requests. Create a ticket to get help from our AI and support team.
                    </p>
                    <button
                        onClick={() => navigate('/create-ticket')}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Create your first ticket
                    </button>
                </Card>
            ) : tickets.length === 0 && hasAnyFilter ? (
                // Filter empty state
                <Card className="flex flex-col items-center justify-center py-16 text-center border border-gray-100 shadow-sm rounded-2xl bg-white">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No matching tickets found</h3>
                    <p className="text-gray-500 text-sm mb-4">Try adjusting your search or filters.</p>
                    <button
                        onClick={handleClearFilters}
                        className="text-emerald-600 font-semibold hover:text-emerald-700 text-sm"
                    >
                        Clear all filters
                    </button>
                </Card>
            ) : (
                <>
                    {/* Ticket Table */}
                    <Card className="border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">ID</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Subject</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Priority</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Submitted</th>
                                    </tr>
                                </thead>
                                <TooltipProvider delayDuration={300}>
                                    <tbody className="divide-y divide-gray-100">
                                        {tickets.map(ticket => (
                                            <tr
                                                key={ticket.id}
                                                onClick={() => navigate(`/ticket/${ticket.id}`)}
                                                className="group hover:bg-emerald-50/30 transition-colors cursor-pointer"
                                            >
                                                <td className="px-6 py-4">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="font-mono font-bold text-gray-900 text-sm">
                                                                #{formatTicketId(ticket.id)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                            side="top"
                                                            className="bg-gray-900 text-white border-none p-4 w-[300px] shadow-xl rounded-xl"
                                                            sideOffset={10}
                                                        >
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Issue Overview</p>
                                                                    <p className="text-sm font-medium leading-relaxed overflow-hidden text-ellipsis whitespace-nowrap">
                                                                        {ticket.summary || ticket.description || 'No description provided'}
                                                                    </p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Category</p>
                                                                        <p className="text-sm font-medium">{ticket.category || 'General'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Priority</p>
                                                                        <p className="text-sm font-medium capitalize">{ticket.priority || 'medium'}</p>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Assigned Unit</p>
                                                                    <p className="text-sm font-medium flex items-center gap-1.5">
                                                                        <ShieldCheck size={14} className="text-emerald-400" />
                                                                        {ticket.assigned_team || 'General Support'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-6 py-4 w-1/3 max-w-[300px]">
                                                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                                                        {ticket.summary || ticket.subject || ticket.description || 'No subject'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                                                        {ticket.category || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <TicketStatusBadge status={ticket.status} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-sm capitalize ${getPriorityColor(ticket.priority)}`}>
                                                        {ticket.priority || 'medium'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-700">
                                                            {formatTimelineDate(ticket.created_at)}
                                                        </span>
                                                        <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-0.5">
                                                            {getTimeZoneAbbr()} Node
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </TooltipProvider>
                            </table>
                        </div>
                    </Card>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 font-medium">
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} tickets
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    id="pagination-prev"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-sm font-bold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                                    .reduce((acc, n, i, arr) => {
                                        if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                                        acc.push(n);
                                        return acc;
                                    }, [])
                                    .map((item, i) =>
                                        item === '…' ? (
                                            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
                                        ) : (
                                            <button
                                                key={item}
                                                onClick={() => setPage(item)}
                                                className={`w-9 h-9 text-sm font-bold rounded-xl transition-all ${
                                                    page === item
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}
                                <button
                                    id="pagination-next"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 text-sm font-bold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}

export default MyTickets;
