import React, {
    useState, useMemo, useEffect, useCallback, useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ticket, Inbox, Search, Filter,
    ShieldCheck, Loader2, AlertCircle, Star, Clock,
    ChevronDown, ChevronUp, X, Download, BookmarkPlus,
    History, SlidersHorizontal, ArrowUpDown, Calendar,
    Bookmark,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { supabase } from '../../lib/supabaseClient';
import { API_CONFIG } from '../../config';
import { Card } from '../../components/ui/card';
import { Select } from '../../components/ui/select';
import { formatTicketId } from '../../utils/format';
import TicketStatusBadge from '../components/TicketStatusBadge';
import { formatTimelineDate, getTimeZoneAbbr } from '../../utils/dateUtils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../../components/ui/tooltip';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in progress', label: 'In Progress' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
    { value: 'escalated', label: 'Escalated' },
];

const PRIORITY_OPTIONS = [
    { value: '', label: 'All Priorities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
];

const DATE_PRESET_OPTIONS = [
    { value: '', label: 'Any Date' },
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
];

const SORT_OPTIONS = [
    { value: 'relevance', label: 'Best Match' },
    { value: 'date_desc', label: 'Newest First' },
    { value: 'date_asc', label: 'Oldest First' },
    { value: 'priority', label: 'By Priority' },
];

const HISTORY_KEY = 'helpdesk_search_history';
const MAX_HISTORY = 8;
const DEBOUNCE_MS = 300;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPriorityColor(priority) {
    const p = (priority || '').toLowerCase();
    if (p === 'critical') return 'text-red-700 font-bold';
    if (p === 'high') return 'text-red-500 font-bold';
    if (p === 'medium') return 'text-amber-600 font-bold';
    if (p === 'low') return 'text-blue-500 font-bold';
    return 'text-gray-500';
}

function RelevanceBadge({ score }) {
    if (score === null || score === undefined) return null;
    const color =
        score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
        score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                     'bg-gray-100 text-gray-500 border-gray-200';
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
            {score}%
        </span>
    );
}

function ActiveFilterChip({ label, onRemove }) {
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
            {label}
            <button onClick={onRemove} className="hover:text-emerald-900 transition-colors" aria-label={`Remove ${label} filter`}>
                <X size={11} />
            </button>
        </span>
    );
}

// ─── Search History helpers ───────────────────────────────────────────────────

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}

function pushHistory(term) {
    if (!term || term.trim().length < 2) return;
    const prev = loadHistory().filter(t => t !== term.trim());
    const next = [term.trim(), ...prev].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
}

// ─── Component ────────────────────────────────────────────────────────────────

function MyTickets() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Core tickets state (realtime from Supabase direct, used for local filters)
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Search & filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [datePreset, setDatePreset] = useState('');
    const [sortBy, setSortBy] = useState('relevance');

    // Search results from backend (when query is active)
    const [searchResults, setSearchResults] = useState(null); // null = not in search mode
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchTotal, setSearchTotal] = useState(0);

    // Suggestions
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);

    // Saved searches
    const [savedSearches, setSavedSearches] = useState([]);
    const [showSavedPanel, setShowSavedPanel] = useState(false);
    const [saveSearchName, setSaveSearchName] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [savedLoading, setSavedLoading] = useState(false);

    // Search history
    const [history, setHistory] = useState(loadHistory());
    const [showHistory, setShowHistory] = useState(false);

    // Sidebar
    const [showFilterSidebar, setShowFilterSidebar] = useState(false);

    // Export
    const [exporting, setExporting] = useState(false);

    const searchInputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // ── Fetch tickets (Supabase realtime) ────────────────────────────────────

    const fetchTickets = useCallback(async () => {
        if (!user?.id) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        const { data, error: sbError } = await supabase
            .from('tickets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (sbError) {
            setError(sbError.message);
            setTickets([]);
        } else {
            setTickets(data || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchTickets();
        if (!user?.id) return;
        const channel = supabase
            .channel(`user_tickets_${user.id}`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'tickets',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTickets(prev => [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
                } else if (payload.eventType === 'DELETE') {
                    setTickets(prev => prev.filter(t => t.id !== payload.old.id));
                }
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchTickets]);

    // ── Load saved searches ───────────────────────────────────────────────────

    const fetchSavedSearches = useCallback(async () => {
        if (!user?.id) return;
        setSavedLoading(true);
        try {
            const res = await fetch(
                `${API_CONFIG.BACKEND_URL}/tickets/saved-searches?user_id=${user.id}`
            );
            if (res.ok) {
                const data = await res.json();
                setSavedSearches(data.saved_searches || []);
            }
        } catch {
            // Graceful fallback — saved searches are non-critical
        } finally {
            setSavedLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchSavedSearches(); }, [fetchSavedSearches]);

    // ── Debounce search query ─────────────────────────────────────────────────

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ── Suggestions fetch ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }
        setSuggestionsLoading(true);
        const ctrl = new AbortController();
        const params = new URLSearchParams({ q: searchQuery, user_id: user?.id || '' });
        fetch(`${API_CONFIG.BACKEND_URL}/tickets/suggestions?${params}`, { signal: ctrl.signal })
            .then(r => r.json())
            .then(d => setSuggestions(d.suggestions || []))
            .catch(() => {})
            .finally(() => setSuggestionsLoading(false));
        return () => ctrl.abort();
    }, [searchQuery, user?.id]);

    // ── Backend search (debounced query + filters) ────────────────────────────

    const isSearchMode = !!(debouncedQuery || statusFilter || priorityFilter || categoryFilter || datePreset);

    useEffect(() => {
        if (!isSearchMode) {
            setSearchResults(null);
            return;
        }
        if (!user?.id) return;

        setSearchLoading(true);
        const ctrl = new AbortController();
        const params = new URLSearchParams();
        if (debouncedQuery) params.set('q', debouncedQuery);
        params.set('user_id', user.id);
        if (statusFilter) params.set('status', statusFilter);
        if (priorityFilter) params.set('priority', priorityFilter);
        if (categoryFilter) params.set('category', categoryFilter);
        if (datePreset) params.set('date_preset', datePreset);
        params.set('sort_by', sortBy);
        params.set('limit', '100');

        fetch(`${API_CONFIG.BACKEND_URL}/tickets/search?${params}`, { signal: ctrl.signal })
            .then(r => r.json())
            .then(d => {
                setSearchResults(d.results || []);
                setSearchTotal(d.total || 0);
                if (debouncedQuery) pushHistory(debouncedQuery);
                setHistory(loadHistory());
            })
            .catch(() => {})
            .finally(() => setSearchLoading(false));

        return () => ctrl.abort();
    }, [debouncedQuery, statusFilter, priorityFilter, categoryFilter, datePreset, sortBy, user?.id, isSearchMode]);

    // ── Local-only filter (when no search mode) ───────────────────────────────

    const filteredTickets = useMemo(() => {
        if (isSearchMode) return searchResults || [];
        return tickets;
    }, [isSearchMode, searchResults, tickets]);

    // ── CSV Export ────────────────────────────────────────────────────────────

    const handleExport = async () => {
        if (!user?.id) return;
        setExporting(true);
        const params = new URLSearchParams();
        if (debouncedQuery) params.set('q', debouncedQuery);
        params.set('user_id', user.id);
        if (statusFilter) params.set('status', statusFilter);
        if (priorityFilter) params.set('priority', priorityFilter);
        if (categoryFilter) params.set('category', categoryFilter);
        if (datePreset) params.set('date_preset', datePreset);
        params.set('export', 'csv');
        params.set('limit', '200');

        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/tickets/search?${params}`);
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tickets_export.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // Silent failure — export is non-critical
        } finally {
            setExporting(false);
        }
    };

    // ── Save / Apply search ───────────────────────────────────────────────────

    const handleSaveSearch = async () => {
        if (!saveSearchName.trim() || !user?.id) return;
        const filters = {
            q: debouncedQuery || undefined,
            status: statusFilter || undefined,
            priority: priorityFilter || undefined,
            category: categoryFilter || undefined,
            date_preset: datePreset || undefined,
            sort_by: sortBy,
        };
        try {
            const res = await fetch(`${API_CONFIG.BACKEND_URL}/tickets/saved-searches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, name: saveSearchName.trim(), filters }),
            });
            if (res.ok) {
                setSaveSearchName('');
                setShowSaveForm(false);
                fetchSavedSearches();
            }
        } catch { /* non-critical */ }
    };

    const applySearch = (filters) => {
        if (filters.q !== undefined) setSearchQuery(filters.q || '');
        if (filters.status !== undefined) setStatusFilter(filters.status || '');
        if (filters.priority !== undefined) setPriorityFilter(filters.priority || '');
        if (filters.category !== undefined) setCategoryFilter(filters.category || '');
        if (filters.date_preset !== undefined) setDatePreset(filters.date_preset || '');
        if (filters.sort_by) setSortBy(filters.sort_by);
        setShowSavedPanel(false);
    };

    const deleteSavedSearch = async (id) => {
        if (!user?.id) return;
        try {
            await fetch(
                `${API_CONFIG.BACKEND_URL}/tickets/saved-searches/${id}?user_id=${user.id}`,
                { method: 'DELETE' }
            );
            fetchSavedSearches();
        } catch { /* non-critical */ }
    };

    // ── Active filter chips ───────────────────────────────────────────────────

    const activeFilters = [
        statusFilter && { key: 'status', label: `Status: ${statusFilter}`, clear: () => setStatusFilter('') },
        priorityFilter && { key: 'priority', label: `Priority: ${priorityFilter}`, clear: () => setPriorityFilter('') },
        categoryFilter && { key: 'category', label: `Category: ${categoryFilter}`, clear: () => setCategoryFilter('') },
        datePreset && {
            key: 'date',
            label: `Date: ${DATE_PRESET_OPTIONS.find(d => d.value === datePreset)?.label || datePreset}`,
            clear: () => setDatePreset(''),
        },
    ].filter(Boolean);

    const clearAllFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setPriorityFilter('');
        setCategoryFilter('');
        setDatePreset('');
        setSortBy('relevance');
        setSearchResults(null);
    };

    const hasAnyFilter = !!(searchQuery || statusFilter || priorityFilter || categoryFilter || datePreset);

    // ── Unique categories from loaded tickets ─────────────────────────────────

    const availableCategories = useMemo(() => {
        const cats = [...new Set(tickets.map(t => t.category).filter(Boolean))].sort();
        return cats;
    }, [tickets]);

    // ── Click-outside for suggestions ─────────────────────────────────────────

    useEffect(() => {
        const handler = (e) => {
            if (
                suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
                searchInputRef.current && !searchInputRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
                setShowHistory(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ─── Render ───────────────────────────────────────────────────────────────

    const displayTickets = filteredTickets;
    const isLoading = loading || (isSearchMode && searchLoading);

    return (
        <main className="flex-1 max-w-[1300px] w-full mx-auto px-4 md:px-6 py-8 flex flex-col gap-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Ticket className="text-emerald-600 w-8 h-8" />
                        My Tickets
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Search, filter, and track your support requests</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Export CSV */}
                    <button
                        id="export-csv-btn"
                        onClick={handleExport}
                        disabled={exporting || displayTickets.length === 0}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Export CSV
                    </button>
                    {/* Save search */}
                    {hasAnyFilter && (
                        <button
                            id="save-search-btn"
                            onClick={() => setShowSaveForm(v => !v)}
                            className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-2"
                        >
                            <BookmarkPlus size={14} />
                            Save Search
                        </button>
                    )}
                    {/* Saved searches panel toggle */}
                    <button
                        id="saved-searches-btn"
                        onClick={() => setShowSavedPanel(v => !v)}
                        className={`px-4 py-2 text-sm font-semibold border rounded-xl transition-all flex items-center gap-2 ${showSavedPanel ? 'bg-emerald-600 text-white border-emerald-600' : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                    >
                        <Bookmark size={14} />
                        Saved
                        {savedSearches.length > 0 && (
                            <span className="bg-emerald-200 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {savedSearches.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => navigate('/create-ticket')}
                        className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                        + New Ticket
                    </button>
                </div>
            </div>

            {/* ── Save Search Form ── */}
            <AnimatePresence>
                {showSaveForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                    >
                        <Star size={16} className="text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                        <input
                            id="save-search-name-input"
                            type="text"
                            placeholder='Name this search, e.g. "Open Critical VPN Issues"'
                            value={saveSearchName}
                            onChange={e => setSaveSearchName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveSearch()}
                            className="flex-1 px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveSearch}
                                disabled={!saveSearchName.trim()}
                                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => { setShowSaveForm(false); setSaveSearchName(''); }}
                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Saved Searches Panel ── */}
            <AnimatePresence>
                {showSavedPanel && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-white border border-gray-200 rounded-xl shadow-sm p-4"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Star size={14} className="text-amber-500" />
                                Saved Searches
                            </h3>
                            <button onClick={() => setShowSavedPanel(false)}>
                                <X size={16} className="text-gray-400 hover:text-gray-700" />
                            </button>
                        </div>
                        {savedLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                                <Loader2 size={14} className="animate-spin" /> Loading…
                            </div>
                        ) : savedSearches.length === 0 ? (
                            <p className="text-sm text-gray-400 py-2">No saved searches yet. Apply filters and click "Save Search".</p>
                        ) : (
                            <div className="space-y-2">
                                {savedSearches.map(s => (
                                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 group">
                                        <button
                                            onClick={() => applySearch(s.filters)}
                                            className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-emerald-700 transition-colors text-left"
                                        >
                                            <Star size={13} className="text-amber-400 shrink-0" />
                                            {s.name}
                                        </button>
                                        <button
                                            onClick={() => deleteSavedSearch(s.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                                            aria-label="Delete saved search"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Search + Filters Bar ── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
                {/* Search input row */}
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search input with suggestions */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            id="ticket-search-input"
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search tickets by ID, subject, description…"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); setShowHistory(!e.target.value); }}
                            onFocus={() => { setShowSuggestions(true); if (!searchQuery) setShowHistory(true); }}
                            className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); setShowHistory(false); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                aria-label="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}

                        {/* Suggestions / History Dropdown */}
                        <AnimatePresence>
                            {(showSuggestions && suggestions.length > 0) || (showHistory && history.length > 0 && !searchQuery) ? (
                                <motion.div
                                    ref={suggestionsRef}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                                >
                                    {/* Suggestions */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="p-1">
                                            <p className="px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Suggestions</p>
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setSearchQuery(s.text); setShowSuggestions(false); setShowHistory(false); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg transition-colors text-left"
                                                >
                                                    <Search size={12} className="text-gray-400 shrink-0" />
                                                    <span className="truncate">{s.text}</span>
                                                    <span className="ml-auto text-[10px] text-gray-400 capitalize shrink-0">{s.type}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Search History */}
                                    {showHistory && history.length > 0 && !searchQuery && (
                                        <div className="p-1 border-t border-gray-100">
                                            <div className="flex items-center justify-between px-3 py-1.5">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Searches</p>
                                                <button onClick={() => { clearHistory(); setHistory([]); setShowHistory(false); }} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear</button>
                                            </div>
                                            {history.map((h, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setSearchQuery(h); setShowHistory(false); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                                >
                                                    <History size={12} className="text-gray-400 shrink-0" />
                                                    {h}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>

                    {/* Filter sidebar toggle */}
                    <button
                        id="toggle-filter-sidebar-btn"
                        onClick={() => setShowFilterSidebar(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border rounded-lg transition-all ${showFilterSidebar ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <SlidersHorizontal size={15} />
                        Filters
                        {activeFilters.length > 0 && (
                            <span className="bg-emerald-200 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {activeFilters.length}
                            </span>
                        )}
                    </button>

                    {/* Sort */}
                    <div className="flex items-center gap-1.5">
                        <ArrowUpDown size={14} className="text-gray-400" />
                        <Select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            options={SORT_OPTIONS}
                        />
                    </div>
                </div>

                {/* Filter Sidebar (collapsible) */}
                <AnimatePresence>
                    {showFilterSidebar && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="border-t border-gray-100 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Status */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Status</label>
                                    <Select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value)}
                                        options={STATUS_OPTIONS}
                                    />
                                </div>
                                {/* Priority */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Priority</label>
                                    <Select
                                        value={priorityFilter}
                                        onChange={e => setPriorityFilter(e.target.value)}
                                        options={PRIORITY_OPTIONS}
                                    />
                                </div>
                                {/* Category */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Category</label>
                                    <Select
                                        value={categoryFilter}
                                        onChange={e => setCategoryFilter(e.target.value)}
                                        options={[
                                            { value: '', label: 'All Categories' },
                                            ...availableCategories.map(c => ({ value: c, label: c })),
                                        ]}
                                    />
                                </div>
                                {/* Date Range */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Date Range</label>
                                    <Select
                                        value={datePreset}
                                        onChange={e => setDatePreset(e.target.value)}
                                        options={DATE_PRESET_OPTIONS}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Active filter chips */}
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        {activeFilters.map(f => (
                            <ActiveFilterChip key={f.key} label={f.label} onRemove={f.clear} />
                        ))}
                        <button
                            onClick={clearAllFilters}
                            className="text-xs text-gray-500 hover:text-red-500 font-semibold transition-colors"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* ── Results count bar ── */}
            {isSearchMode && !isLoading && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                        <span className="font-bold text-gray-800">{searchTotal}</span> ticket{searchTotal !== 1 ? 's' : ''} found
                        {debouncedQuery && <> for "<span className="font-semibold text-emerald-700">{debouncedQuery}</span>"</>}
                    </span>
                    {searchTotal > 0 && (
                        <span className="text-xs text-gray-400">Sorted by {SORT_OPTIONS.find(s => s.value === sortBy)?.label}</span>
                    )}
                </div>
            )}

            {/* ── Main content ── */}
            {isLoading ? (
                <Card className="border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden p-6 w-full">
                    <div className="space-y-6">
                        <style>{`@keyframes shimmer{100%{transform:translateX(100%)}}`}</style>
                        <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                            {[12, 32, 20].map((w, i) => (
                                <div key={i} className={`h-4 w-${w} bg-slate-100 rounded relative overflow-hidden`}>
                                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.5s_infinite]" />
                                </div>
                            ))}
                        </div>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-6 py-2">
                                {[16, 'flex-1', 24, 20, 16, 24].map((w, j) => (
                                    <div key={j} className={`h-5 ${typeof w === 'number' ? `w-${w}` : w} bg-slate-100 rounded-md relative overflow-hidden`}>
                                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.5s_infinite]" />
                                    </div>
                                ))}
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
                        onClick={fetchTickets}
                        className="px-6 py-2 bg-white border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm"
                    >
                        Retry Connection
                    </button>
                </Card>
            ) : tickets.length === 0 ? (
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
            ) : displayTickets.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-16 text-center border border-gray-100 shadow-sm rounded-2xl bg-white">
                    <Filter className="text-gray-300 w-12 h-12 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No matching tickets found</h3>
                    <p className="text-gray-500 text-sm mb-4">Try adjusting your search query or filters.</p>
                    <button
                        onClick={clearAllFilters}
                        className="text-emerald-600 font-semibold hover:text-emerald-700 text-sm"
                    >
                        Clear all filters
                    </button>
                </Card>
            ) : (
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
                                    {isSearchMode && debouncedQuery && (
                                        <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Match</th>
                                    )}
                                    <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Submitted</th>
                                </tr>
                            </thead>
                            <TooltipProvider delayDuration={300}>
                                <tbody className="divide-y divide-gray-100">
                                    {displayTickets.map(ticket => (
                                        <motion.tr
                                            key={ticket.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
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
                                            {isSearchMode && debouncedQuery && (
                                                <td className="px-6 py-4">
                                                    <RelevanceBadge score={ticket.relevance_score} />
                                                </td>
                                            )}
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
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </TooltipProvider>
                        </table>
                    </div>
                </Card>
            )}
        </main>
    );
}

export default MyTickets;
