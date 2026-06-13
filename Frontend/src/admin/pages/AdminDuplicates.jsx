import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from "../../store/authStore";
import useToastStore from "../../store/toastStore";
import { supabase } from "../../lib/supabaseClient";
import {
    Layers,
    AlertCircle,
    Loader2,
    ArrowRight,
    CheckCircle2,
    Inbox
} from 'lucide-react';
import { formatTicketId } from "../../utils/format";
import { formatTimelineDate } from "../../utils/dateUtils";
import { API_CONFIG } from '../../config';

const AdminDuplicates = () => {
    const navigate = useNavigate();
    const { user, profile } = useAuthStore();
    const { showToast } = useToastStore();

    const [duplicates, setDuplicates] = useState([]);
    const [primaryTickets, setPrimaryTickets] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mergingId, setMergingId] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

    const fetchDuplicates = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch tickets flagged as duplicates but not yet merged or resolved
            let query = supabase
                .from('tickets')
                .select('*')
                .eq('is_duplicate', True)
                .neq('status', 'merged')
                .neq('status', 'resolved')
                .neq('status', 'closed');

            if (profile?.role === 'admin' && profile?.company) {
                query = query.eq('company', profile.company);
            }

            const { data: secTickets, error: secError } = await query;
            if (secError) throw secError;

            // Group by primary ticket id
            const grouped = {};
            const primaryIds = new Set();
            for (const t of (secTickets || [])) {
                const pId = t.metadata?.duplicate_ticket;
                if (pId) {
                    if (!grouped[pId]) grouped[pId] = [];
                    grouped[pId].push(t);
                    primaryIds.add(pId);
                }
            }

            // Fetch primary tickets
            const primaryMap = {};
            if (primaryIds.size > 0) {
                const { data: primData, error: primError } = await supabase
                    .from('tickets')
                    .select('*')
                    .in('id', Array.from(primaryIds));
                if (primError) throw primError;
                
                for (const pt of (primData || [])) {
                    primaryMap[pt.id] = pt;
                }
            }

            setDuplicates(Object.entries(grouped).map(([pId, secs]) => ({
                primaryId: pId,
                secondaries: secs
            })).filter(g => primaryMap[g.primaryId])); // Only keep groups where primary exists

            setPrimaryTickets(primaryMap);
        } catch (err) {
            console.error("Failed to load duplicates:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDuplicates();
    }, [profile]);

    const handleMergeClick = (group) => {
        setSelectedGroup(group);
        setShowConfirmModal(true);
    };

    const confirmMerge = async () => {
        if (!selectedGroup) return;
        setMergingId(selectedGroup.primaryId);
        setShowConfirmModal(false);

        try {
            const secIds = selectedGroup.secondaries.map(t => t.id);
            const response = await fetch(`${API_CONFIG.BACKEND_URL}/tickets/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    primary_ticket: selectedGroup.primaryId,
                    secondary_tickets: secIds,
                    admin_id: user.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Merge failed");
            }

            showToast(`Successfully merged ${secIds.length} ticket(s) into #${formatTicketId(selectedGroup.primaryId)}`, "success");
            fetchDuplicates();
        } catch (err) {
            console.error("Merge error:", err);
            showToast(err.message, "error");
        } finally {
            setMergingId(null);
            setSelectedGroup(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase flex items-center gap-3">
                    <Layers className="text-indigo-600 w-8 h-8" />
                    Duplicate Resolution
                </h1>
                <p className="text-sm font-bold text-slate-400 mt-1">
                    Consolidate related incidents to maintain a single source of truth.
                </p>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden relative min-h-[400px] p-6">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="p-12 text-center text-red-500 space-y-4">
                        <AlertCircle className="mx-auto w-12 h-12" />
                        <p className="font-bold uppercase tracking-widest text-xs">{error}</p>
                        <button onClick={fetchDuplicates} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Retry</button>
                    </div>
                )}

                {!loading && duplicates.length === 0 && !error && (
                    <div className="py-32 text-center bg-slate-50/30 w-full flex flex-col items-center rounded-2xl">
                        <div className="w-20 h-20 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-center text-emerald-500 mb-6 shadow-sm">
                            <CheckCircle2 size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Queue Clear</h3>
                        <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto mt-2 italic">No unresolved duplicate tickets found.</p>
                    </div>
                )}

                <div className="space-y-6">
                    {duplicates.map((group) => {
                        const pt = primaryTickets[group.primaryId];
                        const isMerging = mergingId === group.primaryId;
                        return (
                            <div key={group.primaryId} className={`p-6 rounded-2xl border border-slate-200 bg-slate-50/50 transition-all ${isMerging ? 'opacity-50 pointer-events-none' : 'hover:border-indigo-200 hover:shadow-lg'}`}>
                                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest">Primary</span>
                                            <span className="font-mono text-sm font-black text-slate-900">#{formatTicketId(pt.id)}</span>
                                            <span className="text-sm font-bold text-slate-700 truncate max-w-sm">{pt.summary || pt.subject}</span>
                                        </div>
                                        
                                        <div className="pl-4 border-l-2 border-indigo-200 space-y-3">
                                            {group.secondaries.map(sec => (
                                                <div key={sec.id} className="flex items-center gap-3 text-sm">
                                                    <ArrowRight size={14} className="text-slate-400" />
                                                    <span className="font-mono text-xs font-bold text-slate-500">#{formatTicketId(sec.id)}</span>
                                                    <span className="text-slate-600 truncate max-w-xs">{sec.summary || sec.subject}</span>
                                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">Similarity: {sec.metadata?.duplicate_probability ? Math.round(sec.metadata.duplicate_probability * 100) : 0}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center">
                                        <button
                                            onClick={() => handleMergeClick(group)}
                                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
                                        >
                                            {isMerging ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
                                            Merge Into #{formatTicketId(pt.id)}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && selectedGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-slate-100 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight italic">Confirm Merge Action</h2>
                        <p className="text-sm text-slate-600 font-medium mb-6">
                            This action will permanently consolidate <strong>{selectedGroup.secondaries.length}</strong> ticket(s) into primary ticket <strong>#{formatTicketId(selectedGroup.primaryId)}</strong>.
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                            <ul className="text-xs font-bold text-amber-800 space-y-2">
                                <li>• Comments will be chronologically combined.</li>
                                <li>• Attachments will be transferred.</li>
                                <li>• Secondary tickets will be closed as 'Merged'.</li>
                                <li>• An immutable audit log will be generated.</li>
                            </ul>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmMerge}
                                className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                            >
                                Execute Merge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDuplicates;
