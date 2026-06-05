import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, ChevronRight, ChevronDown, PlayCircle, Book, Mail, ShieldCheck, Search, Zap, LifeBuoy } from 'lucide-react';
import { Card, CardContent } from "../../components/ui/card";
import { YOUTUBE_RESOURCES, VIDEO_CATEGORIES } from '../../data/youtubeResources';
import useAuthStore from "../../store/authStore";

const FAQItem = ({ faq }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div 
            className="p-5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-all cursor-pointer text-left"
            onClick={() => setIsOpen(!isOpen)}
        >
            <div className="flex justify-between items-start gap-4">
                <h4 className="font-extrabold text-slate-200 text-base font-syne group-hover:text-emerald-400 transition-colors m-0 leading-snug">{faq.q}</h4>
                <div className="text-slate-500 shrink-0 mt-0.5">
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
            </div>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="pt-3 text-slate-400 text-sm font-medium leading-relaxed m-0">{faq.a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Help = () => {
    const { profile } = useAuthStore();
    const [activeTab, setActiveTab] = useState('All');
    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const generateMailto = () => {
        const email = "bonthalamadhavi1@gmail.com";
        const subject = encodeURIComponent("Support Request: Core Telemetry Matrix Exception");
        const fullName = profile?.full_name || "Authorized Identity";
        
        const bodyTemplate = `Hi HelpDesk.AI Support Team,\n\nI am writing to report a boundary exception regarding:\n[ENTER LOG DIAGNOSTICS PAYLOAD HERE]\n\nRegards,\n${fullName}`;
        return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(bodyTemplate)}`;
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 800);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        const fetchVideos = async () => {
            setIsLoading(true);
            const cacheKey = `yt_videos_v3_${activeTab}_${debouncedSearch}`;
            const cacheTimeKey = `yt_videos_time_v3_${activeTab}_${debouncedSearch}`;
            
            try {
                const cachedData = localStorage.getItem(cacheKey);
                const cacheTimestamp = localStorage.getItem(cacheTimeKey);
                
                if (cachedData && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < 86400000) {
                    setVideos(JSON.parse(cachedData));
                    setIsLoading(false);
                    return;
                }

                const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
                if (!API_KEY) throw new Error("API keys non-initialized");

                const query = debouncedSearch
                    ? `IT helpdesk troubleshooting ${debouncedSearch}`
                    : activeTab === 'All' 
                        ? 'IT helpdesk troubleshooting' 
                        : `IT helpdesk ${activeTab.toLowerCase()} troubleshooting`;

                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`
                );
                
                if (!response.ok) throw new Error("API streaming failure");
                const data = await response.json();
                
                const decodeText = (str) => str.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

                const fetchedVideos = data.items.map(item => ({
                    id: item.id.videoId,
                    title: decodeText(item.snippet.title),
                    description: item.snippet.description,
                    category: activeTab === 'All' ? 'General' : activeTab,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
                }));

                localStorage.setItem(cacheKey, JSON.stringify(fetchedVideos));
                localStorage.setItem(cacheTimeKey, Date.now().toString());
                setVideos(fetchedVideos);
            } catch (error) {
                console.warn("Uplink failed. Activating local heuristic telemetry libraries:", error);
                const fallbackList = activeTab === 'All' ? YOUTUBE_RESOURCES : YOUTUBE_RESOURCES.filter(v => v.category === activeTab);
                
                const formattedFallback = fallbackList.map(item => ({
                    id: item.url.split('v=')[1] || item.id,
                    title: item.title,
                    description: item.description,
                    category: item.category,
                    url: item.url,
                    thumbnail_url: item.thumbnail_url
                }));
                setVideos(formattedFallback);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVideos();
    }, [activeTab, debouncedSearch]);

    const faqs = [
        { q: "How does the AI categorization work?", a: "When you submit a ticket, our DistilBERT network categorizes text vectors and routes data tokens straight to target departments, eliminating structural manual indexing." },
        { q: "Can I reopen a resolved ticket?", a: "Affirmative. If telemetry anomalies reset within 7 active execution phases, the dashboard action triggers immediate re-routing parameters to assigned technicians." },
        { q: "Where do I track my active requests?", a: "Access the 'My Tickets' index layout map to isolate records using priority flags, date vectors, or direct linguistic parameter lookups." }
    ];

    return (
        <div className="min-h-screen bg-slate-950 pb-20 relative overflow-hidden font-sans">
            {/* Ambient System Overlays */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -translate-y-1/3 translate-x-1/3" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* Premium Header Layout Module */}
            <div className="p-8 sm:p-12 md:p-16 border-b border-white/[0.05] relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
                <span className="inline-flex items-center gap-2 px-3.5 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                    <LifeBuoy className="w-3.5 h-3.5" /> Core Diagnostic Knowledge Hub
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4 font-syne uppercase">
                    How can we assist deployment?
                </h1>
                <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-medium leading-relaxed mb-8">
                    Query our unified system parameters database, stream curated error resolution sequences, or activate a support liaison.
                </p>

                {/* Tactical Search Infrastructure Node */}
                <div className="relative w-full max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                    <input
                        type="text"
                        placeholder="Search system documentation, index guides, error hashes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-14 pl-12 pr-6 bg-white/[0.02] border border-white/10 rounded-2xl focus:border-emerald-500/50 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium shadow-inner"
                    />
                </div>
            </div>

            {/* Grid Core Operations Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Left Frame: Data Arrays */}
                    <div className="lg:col-span-3 space-y-8">
                        <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 text-left">
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-black text-white flex items-center gap-2.5 font-syne uppercase tracking-wider m-0">
                                        <Video className="w-5 h-5 text-emerald-400" /> Tutorial Repository
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium m-0">Resolve infrastructure boundary failures via streamed visual analytics mapping.</p>
                                </div>

                                {/* Segment Selection Row */}
                                <div className="flex items-center p-1 bg-black/30 rounded-xl border border-white/5 overflow-x-auto customize-scrollbar shrink-0">
                                    {VIDEO_CATEGORIES.map((category) => (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => setActiveTab(category)}
                                            className={`px-4 h-8 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-none cursor-pointer ${
                                                activeTab === category 
                                                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold' 
                                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Stream Cards Grid layout block */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoading ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <div key={i} className="rounded-2xl border border-white/[0.05] bg-white/[0.01] overflow-hidden">
                                            <Shimmer className="aspect-video w-full rounded-none" />
                                            <div className="p-5 space-y-3">
                                                <Shimmer className="h-4 w-3xl" />
                                                <Shimmer className="h-3 w-full" />
                                                <Shimmer className="h-3 w-4/5" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    videos.map((video) => (
                                        <a 
                                            key={video.id} 
                                            href={video.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="group flex flex-col rounded-2xl overflow-hidden border border-white/[0.05] hover:border-emerald-500/30 bg-white/[0.01] hover:bg-white/[0.02] hover:-translate-y-1 transition-all duration-300 text-left relative"
                                        >
                                            <div className="relative aspect-video w-full bg-black overflow-hidden">
                                                <img 
                                                    src={video.thumbnail_url} 
                                                    alt="" 
                                                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                                                />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <PlayCircle className="w-12 h-12 text-emerald-400 drop-shadow-xl" />
                                                </div>
                                                <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 h-5 flex items-center rounded-full">
                                                    {video.category}
                                                </span>
                                            </div>
                                            <div className="p-5 flex flex-col flex-1 space-y-2">
                                                <h4 className="font-extrabold text-white text-sm tracking-tight leading-snug line-clamp-2 m-0 group-hover:text-emerald-400 transition-colors font-syne">
                                                    {video.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed m-0 mt-auto">
                                                    {video.description}
                                                </p>
                                            </div>
                                        </a>
                                    ))
                                )}
                            </div>
                        </Card>

                        {/* FAQ Collapse Layout Grid section */}
                        <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8">
                            <h2 className="text-xl font-black text-white flex items-center gap-2.5 font-syne uppercase tracking-wider mb-8 text-left">
                                <Book className="w-5 h-5 text-indigo-400" /> Structural FAQ Matrix
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {faqs.map((faq, index) => (
                                    <FAQItem key={index} faq={faq} />
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Right Side Column layout control nodes */}
                    <div className="space-y-6 w-full text-left">
                        <Card className="rounded-[2.5rem] border border-white/[0.08] bg-gradient-to-b from-[#111927] to-[#0c101b] p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                            <h3 className="text-base font-black text-white font-syne uppercase tracking-wider mb-1">Escalation Relay</h3>
                            <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">Uplink parameter scripts directly onto our internal diagnostic engineers.</p>
                            
                            <a href={generateMailto()} className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl p-4 transition-colors no-underline group cursor-pointer">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl shrink-0 group-hover:bg-blue-600 group-hover:text-slate-950 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <div className="min-w-0 space-y-0.5">
                                        <div className="font-extrabold text-xs text-white uppercase tracking-wider">Mailing Interface</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">SLA Triage &lt; 24h</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors shrink-0" />
                            </a>
                        </Card>

                        {/* Real-time Environment Core Flag Node */}
                        <div className="rounded-3xl border border-white/[0.06] bg-white/[0.01] p-5 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h4 className="text-xs font-black text-white uppercase tracking-wider m-0">Core Status Flag</h4>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest m-0 flex items-center gap-1.5 pt-0.5">
                                    <ShieldCheck size={12} /> Environment Normalized
                                </p>
                            </div>
                            <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Help;
