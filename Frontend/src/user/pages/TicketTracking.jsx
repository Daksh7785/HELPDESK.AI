import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity, CheckCircle2, ShieldCheck, User,
    Clock, ArrowRight, Loader2, FileText, Zap
} from 'lucide-react';
import useTicketStore from "../../store/ticketStore";
import useAuthStore from "../../store/authStore";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardContent } from "../../components/ui/card";
import TicketTimeline from "../components/TicketTimeline";
import { formatTicketId } from "../../utils/format";

const TicketTracking = () => {
    const navigate = useNavigate();
    const { aiTicket, setActiveTicket, addTicket } = useTicketStore();
    const { user, profile } = useAuthStore();
    const [isCreating, setIsCreating] = useState(true);
    const [error, setError] = useState(null);
    const [createdTicket, setCreatedTicket] = useState(null);
    const hasCreated = useRef(false);
    useEffect(() => {
        if (!aiTicket) {
            navigate('/create-ticket');
            return;
        }

        const finalizeTracking = async () => {
            if (hasCreated.current) return;
            hasCreated.current = true;

            try {
                // The ticket was ALREADY created in the backend during AI analysis.
                // We just need to ensure our local store is synced.
                if (aiTicket.id || aiTicket.ticket_id) {
                    setCreatedTicket(aiTicket);
                    setIsCreating(false);

                    // Redirect to the detail page after a short confirmation pause
                    setTimeout(() => {
                        navigate(`/ticket/${aiTicket.id || aiTicket.ticket_id}`);
                    }, 2500);
                } else {
                    throw new Error("Missing ID from backend analysis.");
                }
            } catch (err) {
                console.error("Tracking Error:", err);
                setError(err.message);
                setIsCreating(false);
            }
        };

        finalizeTracking();
    }, [aiTicket, navigate, user]);

    if (!aiTicket) return null;

    return (
        <div className="min-h-screen bg-[#f6f8f7] flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-[500px] text-center space-y-8">

                {/* Animation Section */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                    <div className="relative w-24 h-24 bg-white rounded-3xl shadow-xl shadow-emerald-900/5 border border-emerald-50 flex items-center justify-center mx-auto">
                        {isCreating ? (
                            <Activity className="w-10 h-10 text-emerald-600 animate-spin" />
                        ) : error ? (
                            <Clock className="w-10 h-10 text-red-500" />
                        ) : (
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                        {isCreating ? "Escalating to Specialists" : error ? "Something went wrong" : "Successfully Escalated"}
                    </h1>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        {isCreating
                            ? `We're assigning your ${aiTicket.category || 'support'} request to the right team.`
                            : error
                                ? error
                                : "Your ticket has been created and assigned. Redirecting to tracking..."
                        }
                    </p>
                </div>

                {/* Dynamic Status Steps — shows real AI data */}
                <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden text-left">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center gap-4 text-emerald-600 font-bold text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>AI Analysis Complete</span>
                            <span className="ml-auto text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                                {aiTicket.category || 'General'}
                            </span>
                        </div>
                        <div className={`flex items-center gap-4 text-sm font-bold ${isCreating ? 'text-gray-400' : error ? 'text-red-500' : 'text-emerald-600'}`}>
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : error ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>{error ? 'Failed to create ticket' : 'Creating Support Ticket'}</span>
                        </div>
                        <div className={`flex items-center gap-4 text-sm font-bold ${createdTicket ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {createdTicket ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            <span>
                                {createdTicket
                                    ? `Assigned → ${createdTicket.assigned_team}`
                                    : 'Agent Assignment Pending'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Dynamic Ticket Timeline — passes the REAL ticket with Supabase data */}
                {createdTicket && <TicketTimeline ticket={createdTicket} />}

            </div>
        </div>
    );
};

export default TicketTracking;
