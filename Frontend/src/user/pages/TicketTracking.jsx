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

        const createTicket = async () => {
            if (hasCreated.current) return;
            hasCreated.current = true;

            try {
                const now = new Date().toISOString();

                // 0. Upload image if present
                let uploadedImageUrl = null;

                if (aiTicket.capturedFileBase64) {
                    try {
                        const base64Data = aiTicket.capturedFileBase64.split(',')[1] || aiTicket.capturedFileBase64;
                        const contentType = aiTicket.capturedFileBase64.match(/data:(.*?);/)?.[1] || 'image/jpeg';
                        const fileExt = contentType.split('/')[1] || 'jpeg';

                        // Convert base64 to Blob
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: contentType });

                        const fileName = `${user?.id || 'anon'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                        const { error: uploadError } = await supabase.storage
                            .from('ticket-attachments')
                            .upload(fileName, blob, {
                                contentType: contentType,
                                upsert: true
                            });

                        if (!uploadError) {
                            const { data: publicUrlData } = supabase.storage
                                .from('ticket-attachments')
                                .getPublicUrl(fileName);
                            uploadedImageUrl = publicUrlData?.publicUrl;
                        } else {
                            console.error("Failed to upload image:", uploadError);
                        }
                    } catch (uploadErr) {
                        console.error("Error processing image upload:", uploadErr);
                    }
                }

                // 1. Insert into Supabase — the DB generates the real ID
                const { data, error: sbError } = await supabase
                    .from('tickets')
                    .insert([
                        {
                            user_id: user?.id,
                            subject: aiTicket.summary,
                            description: aiTicket.originalIssue || aiTicket.summary,
                            category: aiTicket.category,
                            subcategory: aiTicket.subcategory,
                            priority: aiTicket.priority,
                            assigned_team: aiTicket.assigned_team || "General Support",
                            status: "pending_human",
                            image_url: uploadedImageUrl,
                            // Fallback chain: Real Profile Metadata -> Auth Metadata -> "System"
                            company: profile?.company || user?.user_metadata?.company || "System",
                            metadata: {
                                confidence: aiTicket.confidence,
                                entities: aiTicket.entities
                            }
                        }
                    ])
                    .select();

                if (sbError) throw sbError;

                const supabaseRecord = data[0];

                // 2. Insert Initial Messages into the chat table for persistence
                const initialMessages = [
                    {
                        ticket_id: supabaseRecord.id,
                        sender_id: user?.id,
                        sender_name: user?.user_metadata?.full_name || user?.email || "User",
                        sender_role: "user",
                        message: aiTicket.originalIssue || aiTicket.summary
                    },
                    {
                        ticket_id: supabaseRecord.id,
                        sender_id: null, // AI system ID
                        sender_name: "AI Support Assistant",
                        sender_role: "admin",
                        message: "Our AI has automatically categorized your issue and escalated it to our support team. An agent will be with you shortly."
                    }
                ];

                await supabase.from('ticket_messages').insert(initialMessages);

                // 3. Build the local ticket using the SUPABASE ID as the single source of truth
                const newTicket = {
                    ticket_id: String(supabaseRecord.id),
                    id: supabaseRecord.id,
                    text: aiTicket.originalIssue || aiTicket.summary,
                    summary: aiTicket.summary,
                    subject: aiTicket.summary,
                    description: aiTicket.originalIssue || aiTicket.summary,
                    category: aiTicket.category,
                    subcategory: aiTicket.subcategory,
                    priority: aiTicket.priority,
                    assigned_team: aiTicket.assigned_team || "General Support",
                    status: "pending_human",
                    company: profile?.company || user?.user_metadata?.company || "System",
                    image_url: uploadedImageUrl,
                    confidence: aiTicket.confidence,
                    entities: aiTicket.entities,
                    image: uploadedImageUrl || aiTicket.capturedFileBase64,
                    user_name: user?.user_metadata?.full_name || user?.email || "Anonymous",
                    user_email: user?.email || "No email provided",
                    owner_id: user?.id,
                    user_id: user?.id,
                    created_at: supabaseRecord.created_at || now,
                    timestamp: supabaseRecord.created_at || now,
                    messages: [
                        {
                            sender: "user",
                            user_name: user?.user_metadata?.full_name || "User",
                            message: aiTicket.originalIssue || aiTicket.summary,
                            timestamp: now
                        },
                        {
                            sender: "admin",
                            user_name: "AI Support Assistant",
                            message: "Our AI has automatically categorized your issue and escalated it to our support team. An agent will be with you shortly.",
                            timestamp: now
                        }
                    ]
                };

                addTicket(newTicket);
                setActiveTicket(newTicket);
                setCreatedTicket(newTicket);

                setIsCreating(false);
                setTimeout(() => {
                    navigate(`/ticket/${supabaseRecord.id}`);
                }, 2500);

            } catch (err) {
                console.error("Failed to create ticket in Supabase:", err);
                setError(err.message);
                setIsCreating(false);
            }
        };

        createTicket();
    }, [aiTicket, navigate, addTicket, setActiveTicket, user]);

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
