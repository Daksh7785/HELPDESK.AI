import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Inbox, Loader2, AlertCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { supabase } from '../../lib/supabaseClient';
import { Badge } from "../../components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";

const RecentTickets = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRecentTickets = async () => {
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
                .order('created_at', { ascending: false })
                .limit(5);

            if (sbError) throw sbError;
            setTickets(data || []);
        } catch (err) {
            console.error("Error fetching recent tickets:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecentTickets();
    }, [user]);

    const getStatusBadge = (status) => {
        const s = String(status || '').toLowerCase();
        switch (s) {
            case 'resolved':
            case 'resolved by human support':
                return <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-none font-medium">Resolved</Badge>;
            case 'pending':
            case 'pending human support':
                return <Badge className="bg-amber-50 text-amber-600 border-none font-medium">Pending</Badge>;
            case 'in progress':
                return <Badge className="bg-emerald-50 text-emerald-600 border-none font-medium">In Progress</Badge>;
            case 'open':
                return <Badge className="bg-blue-50 text-blue-600 border-none font-medium">Open</Badge>;
            default:
                return <Badge className="bg-blue-50 text-blue-600 border-none font-medium">{status || 'Open'}</Badge>;
        }
    };

    return (
        <Card className="border-none bg-white rounded-3xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-8 pt-8 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <Clock size={20} />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">Recent Tickets</CardTitle>
                </div>
                <button
                    onClick={() => navigate('/my-tickets')}
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
                >
                    View All
                    <ChevronRight size={16} />
                </button>
            </CardHeader>

            <CardContent className="px-8 pb-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Fetching Recent Records...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-red-500 bg-red-50/50 rounded-2xl border border-dashed border-red-200">
                        <AlertCircle size={32} className="mb-3 opacity-50" />
                        <p className="text-sm font-bold">Sync Failed</p>
                        <p className="text-[10px] mt-1 text-red-400">{error}</p>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                        <Inbox size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-medium">No tickets yet.</p>
                        <p className="text-xs mt-1">Report an issue and our AI will start helping immediately.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID</th>
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</th>
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {tickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        onClick={() => navigate(`/ticket/${ticket.id}`)}
                                        className="group cursor-pointer hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="py-4">
                                            <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded-md">
                                                #{ticket.id}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <p className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                                {ticket.subject || ticket.description || "No description provided"}
                                            </p>
                                        </td>
                                        <td className="py-4">
                                            {getStatusBadge(ticket.status)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <p className="text-xs font-medium text-gray-500">
                                                {new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] text-gray-400">
                                                {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentTickets;
