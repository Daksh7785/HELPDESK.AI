import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, Clock, User, ArrowRight, ExternalLink } from 'lucide-react';
import { formatTimelineDate } from '../../utils/dateUtils';

const TicketTable = ({ tickets = [], isLoading = false, limit = null }) => {
    const navigate = useNavigate();

    // Map categories to teams for fallback display
    const teamMap = {
        'Network': 'Network Services',
        'Hardware': 'IT Inventory',
        'Software': 'Cloud Apps Team',
        'Access': 'Security Ops',
        'Human Resources': 'HR Systems',
        'Other': 'IT Service Desk'
    };

    const getPriorityStyle = (priority) => {
        const p = priority?.toLowerCase();
        if (p === 'high' || p === 'critical') return 'bg-red-50 text-red-600 border-red-100 ring-red-500/10';
        if (p === 'medium') return 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10';
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10';
    };

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('resolv')) return 'bg-slate-100 text-slate-500 border-slate-200';
        if (s.includes('progress')) return 'bg-blue-50 text-blue-600 border-blue-200';
        return 'bg-amber-50 text-amber-600 border-amber-200';
    };

    const displayTickets = limit ? tickets.slice(0, limit) : tickets;

    if (isLoading) return (
        <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing System Data...</p>
        </div>
    );

    if (displayTickets.length === 0) return (
        <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl group transition-all hover:border-indigo-300">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-slate-100 text-slate-300">
                <ShieldCheck size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-2 italic">Silent Operations</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto">All systems green. No active tickets require immediate human review.</p>
        </div>
    );

    return (
        <div className="overflow-x-auto custom-scrollbar rounded-3xl border border-slate-200/60 bg-white/50 backdrop-blur-sm shadow-xl shadow-slate-200/50">
            <table className="w-full border-collapse">
                <thead className="bg-[#f8fafc] border-b border-slate-200">
                    <tr>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">Request Identity</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">Incident Context</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">Category</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">Risk Factor</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">Assigned Ops</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">Operating Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {displayTickets.map((ticket) => {
                        const effectiveCategory = ticket.correction?.corrected_category || ticket.category;
                        const effectiveSubcategory = ticket.correction?.corrected_subcategory || ticket.subcategory;
                        const effectivePriority = ticket.correction?.corrected_priority || ticket.priority;
                        const effectiveTeam = ticket.reassigned_at
                            ? ticket.assigned_team
                            : (teamMap[effectiveCategory] || ticket.assigned_team || 'L1 Helpdesk');

                        return (
                            <tr
                                key={ticket.ticket_id}
                                onClick={() => navigate(`/admin/ticket/${ticket.ticket_id}`)}
                                className={`cursor-pointer group transition-all duration-300 ${ticket.status?.includes('Resolv')
                                    ? 'bg-slate-50/50 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 hover:bg-slate-100/80'
                                    : 'hover:bg-indigo-50/40 relative'
                                    }`}
                            >
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[13px] font-black text-indigo-700 tracking-tighter">#{ticket.ticket_id}</span>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-300 text-indigo-400">
                                                <ExternalLink size={14} />
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5 italic tracking-wide">
                                            <Clock size={10} className="text-slate-300" />
                                            {formatTimelineDate(ticket.created_at || ticket.createdAt || ticket.timestamp)}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-500 group-hover:bg-white group-hover:shadow-md transition-all">
                                            <User size={18} />
                                        </div>
                                        <div className="flex flex-col max-w-[280px]">
                                            <span className="text-sm font-black text-slate-900 tracking-tight leading-tight line-clamp-1 group-hover:text-indigo-700 transition-colors uppercase italic">{ticket.user_name || 'System User'}</span>
                                            <span className="text-xs text-slate-400 font-medium line-clamp-1 lowercase">{ticket.user_email || 'No email associated'}</span>
                                            <p className="text-[11px] font-bold text-slate-500 mt-1 line-clamp-1">{ticket.summary}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 text-slate-700 rounded-lg text-[10px] font-black group-hover:bg-white transition-colors border border-slate-200/50 w-fit uppercase tracking-wider">
                                            <Activity size={12} className="text-indigo-500" />
                                            {effectiveCategory}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase ml-1 opacity-80">{effectiveSubcategory}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border ring-4 ring-opacity-10 border-opacity-30 uppercase tracking-[0.1em] shadow-sm ${getPriorityStyle(effectivePriority)}`}>
                                        {effectivePriority || 'NORMAL'}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 text-[11px] font-black text-slate-500 group-hover:bg-white transition-colors">
                                            {effectiveTeam?.charAt(0)}
                                        </div>
                                        <span className="text-xs font-black text-slate-700 tracking-tight uppercase whitespace-nowrap">{effectiveTeam}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black border uppercase tracking-wider shadow-sm flex items-center gap-2 w-fit ${getStatusStyle(ticket.status)}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${ticket.status?.includes('Resolv') ? 'bg-slate-400' : 'bg-current'}`}></div>
                                        {ticket.status?.replace('by Human Support', '')}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TicketTable;
