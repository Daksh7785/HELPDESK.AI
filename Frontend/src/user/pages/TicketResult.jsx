import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Home, Inbox } from 'lucide-react';
import { Card } from "../../components/ui/card";

const TicketResult = ({ 
    title = "Telemetry Ingested", 
    description = "Your ticket has been successfully indexed. Our AI is currently prioritizing your request.",
    ticketId = null 
}) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Ambient Background Matrix */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden p-10 flex flex-col items-center text-center">
                    
                    {/* Status Indicator Node */}
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                        <CheckCircle2 size={48} className="text-emerald-400" />
                    </div>

                    {/* Content Payload */}
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight font-syne mb-3">
                        {title}
                    </h1>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 max-w-xs">
                        {description}
                    </p>

                    {/* Action Hub */}
                    <div className="flex flex-col w-full gap-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-emerald-600/10 active:scale-[0.99] flex items-center justify-center gap-2 border-none cursor-pointer"
                        >
                            <Home size={16} /> Return to Core
                        </button>
                        
                        <button
                            onClick={() => navigate('/my-tickets')}
                            className="w-full h-14 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-slate-300 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 border-none cursor-pointer"
                        >
                            <Inbox size={16} /> View Ticket Repository
                        </button>
                    </div>

                    {ticketId && (
                        <p className="mt-8 text-[10px] font-mono text-slate-600 font-bold uppercase">
                            INDEX_HASH: #{ticketId}
                        </p>
                    )}
                </Card>
            </motion.div>
        </div>
    );
};

export default TicketResult;
