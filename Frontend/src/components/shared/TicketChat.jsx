import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, ShieldCheck, Bot, MessageSquare, Circle, Loader2 } from 'lucide-react';
import { supabase } from "../../lib/supabaseClient";
import useAuthStore from "../../store/authStore";

const TicketChat = ({ ticketId, currentUserRole = 'user' }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const [isInternal, setIsInternal] = useState(false);
    const [isStaff, setIsStaff] = useState(false);

    const { user, profile } = useAuthStore();
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const inputRef = useRef(null);
    const channelRef = useRef(null);

    // ─── Fetch Messages ──────────────────────────────────────────────────
    const fetchMessages = async () => {
        if (!ticketId) return;
        setLoading(true);
        try {
            // 1. Fetch Public Messages
            const { data: publicMsgs, error: pubErr } = await supabase
                .from('ticket_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (pubErr) throw pubErr;

            // 2. Fetch Internal Notes if staff
            let internalMsgs = [];
            const userRole = profile?.role || 'user';
            const isStaffUser = ['admin', 'super_admin', 'agent', 'master_admin'].includes(userRole);
            setIsStaff(isStaffUser);

            if (isStaffUser) {
                const { data: privateMsgs, error: privErr } = await supabase
                    .from('internal_notes')
                    .select('*, profiles:agent_id(full_name)')
                    .eq('ticket_id', ticketId)
                    .order('created_at', { ascending: true });

                if (!privErr && privateMsgs) {
                    internalMsgs = privateMsgs.map(m => ({
                        ...m,
                        message: m.content,
                        sender_name: m.profiles?.full_name || 'Agent',
                        sender_role: 'admin',
                        is_internal: true
                    }));
                }
            }

            // 3. Combine and Sort
            const combined = [...(publicMsgs || []), ...internalMsgs].sort(
                (a, b) => new Date(a.created_at) - new Date(b.created_at)
            );

            setMessages(combined);
        } catch (err) {
            console.error("Error fetching messages:", err);
        } finally {
            setLoading(false);
            setTimeout(() => scrollToBottom(false), 50);
        }
    };

    // ─── Realtime Subscription ───────────────────────────────────────────
    useEffect(() => {
        fetchMessages();

        const channel = supabase.channel(`ticket_chat_${ticketId}`);
        channelRef.current = channel;

        // Subscribe to changes
        channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ticket_messages',
                    filter: `ticket_id=eq.${ticketId}`
                },
                (payload) => {
                    const newMessage = payload.new;
                    setMessages((prev) => {
                        // Avoid duplicates if we already added it locally
                        if (prev.find(m => m.id === newMessage.id)) return prev;
                        // Remove optimistic duplicates based on content and time
                        const filtered = prev.filter(m => !(String(m.id).startsWith('temp-') && m.message === newMessage.message && m.sender_id === newMessage.sender_id));
                        return [...filtered, newMessage];
                    });

                    // Handle notification logic
                    if (newMessage.sender_id !== user?.id) {
                        if (!isAtBottom) {
                            setUnreadCount(prev => prev + 1);
                        } else {
                            setTimeout(() => scrollToBottom(), 50);
                        }
                    }
                }
            )
            .on(
                'broadcast',
                { event: 'typing' },
                (payload) => {
                    if (payload.payload.user_id !== user?.id) {
                        setIsTyping(true);
                        clearTimeout(window.typingTimeout);
                        window.typingTimeout = setTimeout(() => {
                            setIsTyping(false);
                        }, 3000);
                        setTimeout(() => scrollToBottom(), 50);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ticketId]);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        if (channelRef.current && e.target.value.trim().length > 0) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: user?.id }
            }).catch(() => { });
        }
    };

    // ─── Auto-scroll ─────────────────────────────────────────────────────
    const scrollToBottom = useCallback((smooth = true) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'instant'
            });
        }
    }, []);

    const handleScroll = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        setIsAtBottom(atBottom);
        if (atBottom) setUnreadCount(0);
    };

    // ─── Send message ────────────────────────────────────────────────────
    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || !user) return;

        const content = inputValue.trim();
        const currentIsInternal = isInternal;

        // Optimistic UI update
        const tempMessage = {
            id: `temp-${Date.now()}`,
            ticket_id: ticketId,
            sender_id: user.id,
            sender_name: profile?.full_name || user.email,
            sender_role: profile?.role || 'user',
            message: content,
            is_internal: currentIsInternal,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMessage]);
        setInputValue('');
        setTimeout(() => scrollToBottom(), 50);

        try {
            if (currentIsInternal) {
                const { error } = await supabase
                    .from('internal_notes')
                    .insert([{
                        ticket_id: ticketId,
                        agent_id: user.id,
                        content: content
                    }]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('ticket_messages')
                    .insert([{
                        ticket_id: ticketId,
                        sender_id: user.id,
                        sender_name: profile?.full_name || user.email,
                        sender_role: profile?.role || 'user',
                        message: content
                    }]);
                if (error) throw error;
            }
        } catch (err) {
            console.error("Error sending message:", err);
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        }
    };

    // ─── Helpers ─────────────────────────────────────────────────────────
    const formatTime = (iso) => {
        try {
            return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const formatDate = (iso) => {
        try {
            const d = new Date(iso);
            const today = new Date();
            if (d.toDateString() === today.toDateString()) return 'Today';
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch { return ''; }
    };

    const grouped = [];
    let lastDate = null;
    messages.forEach((msg) => {
        const date = formatDate(msg.created_at);
        if (date !== lastDate) {
            grouped.push({ type: 'divider', label: date });
            lastDate = date;
        }
        grouped.push({ type: 'message', data: msg });
    });

    return (
        <div className="flex flex-col h-full w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100 bg-slate-50/60 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                        Communication Hub
                    </h2>
                </div>

                <div className="flex items-center gap-4">
                    {isStaff && (
                        <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5 shadow-sm">
                            <button
                                onClick={() => setIsInternal(false)}
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${!isInternal ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Public
                            </button>
                            <button
                                onClick={() => setIsInternal(true)}
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isInternal ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                🔒 Internal
                            </button>
                        </div>
                    )}
                    <span className="flex items-center gap-1.5 grayscale opacity-50">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50/20"
            >
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                    </div>
                ) : grouped.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16">
                        <Bot className="w-10 h-10 text-slate-200 mb-3" />
                        <p className="text-sm font-medium text-slate-400 italic">No messages yet.</p>
                    </div>
                ) : (
                    grouped.map((item, i) => {
                        if (item.type === 'divider') {
                            return (
                                <div key={`div-${i}`} className="flex items-center gap-3 py-2">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>
                            );
                        }

                        const msg = item.data;
                        const isMe = msg.sender_id === user?.id;
                        const isAdmin = msg.sender_role === 'admin' || msg.sender_role === 'super_admin';

                        return (
                            <div key={msg.id || i} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} group py-1`}>
                                {!isMe && (
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-auto mb-1 shadow-sm
                                        ${isAdmin ? 'bg-indigo-600' : 'bg-slate-200 border border-slate-300'}`}>
                                        {isAdmin ? <ShieldCheck size={13} className="text-white" /> : <User size={13} className="text-slate-500" />}
                                    </div>
                                )}

                                <div className={`max-w-[80%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center gap-2 px-1`}>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${msg.is_internal ? 'text-amber-600' : 'text-slate-400'}`}>
                                            {msg.is_internal ? '🔒 Internal Note' : (isMe ? 'You' : msg.sender_name || (isAdmin ? 'Support ' : 'User'))}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-300">
                                            {formatTime(msg.created_at)}
                                        </span>
                                    </div>

                                    <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300
                                        ${msg.is_internal 
                                            ? 'bg-amber-50 border-2 border-amber-100 text-amber-900 italic rounded-b-sm' 
                                            : isMe ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'}`}>
                                        {msg.message}
                                    </div>
                                </div>

                                {isMe && (
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-auto mb-1 shadow-sm
                                        ${isAdmin ? 'bg-indigo-600' : 'bg-emerald-100 border border-emerald-200'}`}>
                                        {isAdmin ? <ShieldCheck size={13} className="text-white" /> : <User size={13} className="text-emerald-700" />}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                {isTyping && (
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest italic py-1 px-2 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Someone is typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0">
                <form onSubmit={handleSend} className="flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        placeholder="Type your message..."
                        className={`flex-1 ${isInternal ? 'bg-amber-50 border-amber-200 focus:ring-amber-500/10' : 'bg-slate-50 border-slate-200 focus:ring-emerald-500/10'} border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-all placeholder:text-slate-400`}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || !user}
                        className={`px-5 py-3 ${isInternal ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/15' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15'} text-white font-black text-[10px] uppercase tracking-widest rounded-xl active:scale-95 transition-all disabled:opacity-40 shadow-md flex items-center gap-2`}
                    >
                        {isInternal ? <ShieldCheck size={14} /> : <Send size={14} />}
                        <span className="hidden sm:inline">{isInternal ? 'Post Note' : 'Send'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TicketChat;
