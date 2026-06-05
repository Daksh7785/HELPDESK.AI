import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ticket, Inbox, Search, Filter, ShieldCheck, 
    Clock, AlertCircle, ArrowRight, KanbanSquare
} from 'lucide-react';
import useAuthStore from "../../store/authStore";
import { supabase } from "../../lib/supabaseClient";
import { Card } from "../../components/ui/card";
import { formatTicketId } from "../../utils/format";
import TicketStatusBadge from "../components/TicketStatusBadge";
import { formatTimelineDate, getTimeZoneAbbr } from "../../utils/dateUtils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../../components/ui/tooltip";

function MyTickets() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');

    const fetchTickets = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data, error: sbError } = await supabase
                .from('tickets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (sbError) throw sbError;
            setTickets(data || []);
        } catch (err) {
            console.error("Error fetching tickets:", err);
            setError(err.message);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchTickets();

        if (!user?.id) return;

        const channel = supabase
            .channel(`user_tickets_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tickets',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log("User tickets real-time event:", payload.eventType, payload.new);
                    if (payload.eventType === 'INSERT') {
                        setTickets(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
                    } else if (payload.eventType === 'DELETE') {
                        setTickets(prev => prev.filter(t => t.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchTickets]);

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                (ticket.subject || '').toLowerCase().includes(searchLower) ||
                (ticket.summary || '').toLowerCase().includes(searchLower) ||
                (ticket.description || '').toLowerCase().includes(searchLower) ||
                String(ticket.id).includes(searchLower);

            const ticketStatus = ticket.status || 'open';
            const matchesStatus = statusFilter === 'All' ? true : ticketStatus.toLowerCase() === statusFilter.toLowerCase();

            const ticketPriority = ticket.priority || 'medium';
            const matchesPriority = priorityFilter === 'All' ? true : ticketPriority.toLowerCase() === priorityFilter.toLowerCase();

            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [tickets, searchQuery, statusFilter, priorityFilter]);

    const getPriorityColor = (priority) => {
        const p = (priority || '').toLowerCase();
        if (p === 'high' || p === 'critical') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
        if (p === 'medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        if (p === 'low') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        return 'text-slate-400 bg-white/5 border-white/10';
    };

    return (
        <div className="min-h-screen bg-slate-950 pb-20 relative overflow-hidden font-sans">
            {/* Background Glow Context */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 flex flex-col gap-8 relative z-10 text-left">
                
                {/* Header view area */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 font-syne uppercase">
                            <Ticket className="text-emerald-400 w-8 h-8" /> My Tickets
                        </h1>
                        <p className="text-sm text-slate-400 font-medium">Manage and track your operational support requests</p>
                    </div>
                    <button
                        onClick={() => navigate('/create-ticket')}
                        className="px-6 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl shadow-emerald-600/10 active:scale-[0.99] flex items-center justify-center gap-2 border-none cursor-pointer whitespace-nowrap self-start sm:self-auto"
                    >
                        <span>Create New Ticket</span>
                        <ArrowRight size={14} />
                    </button>
                </div>

                {/* Toolbar Context Filter Controls */}
                <div className="flex flex-col md:flex-row gap-4 bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl p-4 rounded-3xl shadow-2xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search ticket array records by subject metrics or token hashes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-11 pr-4 bg-white/[0.01] border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-slate-600 font-medium transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-11 px-4 bg-slate-950 border border-white/10 rounded-xl text-xs font-black text-slate-300 uppercase tracking-wider focus:outline-none focus:border-emerald-500/50 cursor-pointer shadow-inner"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Escalated">Escalated</option>
                        </select>

                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="h-11 px-4 bg-slate-950 border border-white/10 rounded-xl text-xs font-black text-slate-300 uppercase tracking-wider focus:outline-none focus:border-emerald-500/50 cursor-pointer shadow-inner"
                        >
                            <option value="All">All Priorities</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                </div>

                {/* Content Switcher Partition Array */}
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-6 w-full">
                                <div className="space-y-6">
                                    <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer{100%{transform:translateX(100%)}}` }} />
                                    <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                                        <div className="h-4 w-12 bg-white/5 rounded relative overflow-hidden"><div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" /></div>
                                        <div className="h-4 w-32 bg-white/5 rounded relative overflow-hidden"><div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" /></div>
                                        <div className="h-4 w-20 bg-white/5 rounded relative overflow-hidden"><div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" /></div>
                                    </div>
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-6 py-2">
                                            <div className="h-5 w-16 bg-white/5 rounded-md relative overflow-hidden shrink-0"><div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" /></div>
                                            <div className="h-5 flex-1 bg-white/5 rounded-md relative overflow-hidden max-w-[300px]"><div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" /></div>
                                            <div className="h-6 w-24 bg-white/5 rounded-md relative overflow-hidden shrink-0"><div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" /></div>
                                            <div className="h-6 w-20 bg-white/5 rounded-full relative overflow-hidden shrink-0"><div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" /></div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Card className="p-8 border-rose-500/20 bg-rose-500/[0.02] rounded-[2.5rem] flex flex-col items-center text-center border">
                                <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
                                <h3 className="text-lg font-black text-white font-syne uppercase tracking-wider mb-1">Database Sync Error</h3>
                                <p className="text-rose-400/80 text-sm font-mono max-w-sm mb-6 truncate w-full" title={error}>{error}</p>
                                <button
                                    onClick={fetchTickets}
                                    className="px-6 h-11 bg-white/5 border border-white/10 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    Retry Connection
                                </button>
                            </Card>
                        </motion.div>
                    ) : tickets.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-white/10 bg-transparent shadow-none rounded-[2.5rem]">
                                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                                    <Inbox className="text-slate-500 w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight font-syne uppercase mb-1">No execution parameters logged</h3>
                                <p className="text-slate-400 text-sm max-w-sm mb-8 font-medium leading-relaxed">
                                    You haven't submitted any support requests into the pipeline. Create a ticket to activate immediate automated heuristic mapping layers.
                                </p>
                                <button
                                    onClick={() => navigate('/create-ticket')}
                                    className="px-6 h-12 bg-white/5 border border-white/10 text-slate-200 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors cursor-pointer shadow-xl"
                                >
                                    Create your first ticket
                                </button>
                            </Card>
                        </motion.div>
                    ) : filteredTickets.length === 0 ? (
                        <motion.div
                            key="filter-empty"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Card className="flex flex-col items-center justify-center py-16 text-center border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-[2.5rem]">
                                <KanbanSquare className="text-slate-700 w-12 h-12 mb-4" />
                                <h3 className="text-lg font-black text-white font-syne uppercase tracking-wider mb-1">Zero Matrix Matches Found</h3>
                                <p className="text-slate-500 text-sm mb-5 font-medium">Try adjusting your search queries or index scope parameters.</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStatusFilter('All');
                                        setPriorityFilter('All');
                                    }}
                                    className="text-emerald-400 font-black text-xs uppercase tracking-widest hover:text-emerald-300 bg-transparent border-none cursor-pointer"
                                >
                                    Clear Matrix Filter Filters
                                </button>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="table"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Card className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl">
                                <div className="overflow-x-auto customize-scrollbar">
                                    <table className="w-full text-left whitespace-nowrap border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="bg-white/[0.01] border-b border-white/[0.05]">
                                                <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-24">Cluster ID</th>
                                                <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Incident Subject Payload</th>
                                                <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">Classification</th>
                                                <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-36">Status Flag</th>
                                                <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">Urgency</th>
                                                <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-48">Pipeline Record</th>
                                            </tr>
                                        </thead>
                                        <TooltipProvider delayDuration={300}>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {filteredTickets.map(ticket => (
                                                    <tr
                                                        key={ticket.id}
                                                        onClick={() => navigate(`/ticket/${ticket.id}`)}
                                                        className="group bg-transparent hover:bg-white/[0.01] transition-colors cursor-pointer"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="font-mono font-black text-emerald-400 text-xs">#{formatTicketId(ticket.id)}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent
                                                                    side="top"
                                                                    className="bg-slate-950 text-slate-200 border border-white/10 p-5 w-[320px] shadow-2xl rounded-2xl text-left"
                                                                    sideOffset={10}
                                                                >
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-1.5">Issue Analytical Summary</p>
                                                                            <p className="text-xs font-semibold leading-relaxed m-0 text-slate-200 line-clamp-3 whitespace-normal">{ticket.summary || ticket.description || "No parameter summary details mapped."}</p>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                                                                            <div>
                                                                                <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-1">Domain</p>
                                                                                <p className="text-xs font-bold text-slate-300 m-0">{ticket.category || 'General'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-1">Priority</p>
                                                                                <p className="text-xs font-bold text-slate-300 m-0 capitalize">{ticket.priority || 'medium'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="border-t border-white/5 pt-3">
                                                                            <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-1">Routing Unit Group</p>
                                                                            <p className="text-xs font-bold text-slate-300 m-0 flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-400 shrink-0" />{ticket.assigned_team || 'General Support'}</p>
                                                                        </div>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="px-6 py-4 max-w-[280px] sm:max-w-xs md:max-w-sm truncate">
                                                            <p className="text-sm font-semibold text-slate-200 m-0 truncate group-hover:text-emerald-400 transition-colors font-medium">
                                                                {ticket.summary || ticket.subject || ticket.description || "No operational text defined."}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 bg-white/5 px-2.5 h-6 inline-flex items-center rounded-lg border border-white/5">
                                                                {ticket.category || 'General'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <TicketStatusBadge status={ticket.status} />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 h-6 inline-flex items-center rounded-lg border ${getPriorityColor(ticket.priority)}`}>
                                                                {ticket.priority || 'medium'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col text-left">
                                                                <span className="text-xs font-bold text-slate-400 font-mono">
                                                                    {formatTimelineDate(ticket.created_at)}
                                                                </span>
                                                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">
                                                                    {getTimeZoneAbbr()} Cluster Node
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
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Local Scrollbar Style Modifiers */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .customize-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
                    .customize-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .customize-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 99px; }
                    .customize-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.08); }
                `}} />
            </main>
        </div>
    );
}

export default MyTickets;

