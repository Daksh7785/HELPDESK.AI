import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    AlertTriangle,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Info,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Filter,
    TrendingUp,
    Clock,
    Users,
    Layers,
    Zap
} from 'lucide-react';
import { Card, CardContent } from "../../components/ui/card";
import useAuthStore from '../../store/authStore';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const SEVERITY_CONFIG = {
    critical: {
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-700 border-red-200',
        icon: ShieldAlert,
        ring: 'ring-red-500/20',
    },
    high: {
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: AlertTriangle,
        ring: 'ring-orange-500/20',
    },
    medium: {
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: Info,
        ring: 'ring-amber-500/20',
    },
    low: {
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: Shield,
        ring: 'ring-blue-500/20',
    },
};

const ANOMALY_TYPE_LABELS = {
    volume_spike: { label: 'Volume Spike', icon: TrendingUp },
    category_drift: { label: 'Category Drift', icon: Layers },
    priority_escalation: { label: 'Priority Escalation', icon: Zap },
    resolution_degradation: { label: 'Resolution Degradation', icon: Clock },
    repeat_offender: { label: 'Repeat Offender', icon: Users },
};

/**
 * AdminAnomalyDetection Page
 * Displays detected anomalies with filtering, severity badges, and acknowledge actions.
 */
const AdminAnomalyDetection = () => {
    const { profile } = useAuthStore();
    const companyId = profile?.company_id;

    const [anomalies, setAnomalies] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [filterSeverity, setFilterSeverity] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showAcknowledged, setShowAcknowledged] = useState(false);
    const [acknowledging, setAcknowledging] = useState(null);

    const fetchData = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const params = { company_id: companyId };
            if (filterSeverity) params.severity = filterSeverity;
            if (filterType) params.anomaly_type = filterType;
            if (!showAcknowledged) params.acknowledged = false;

            const [anomalyRes, summaryRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/admin/anomalies`, { params }),
                axios.get(`${BACKEND_URL}/admin/anomalies/summary`, { params: { company_id: companyId } }),
            ]);

            setAnomalies(anomalyRes.data || []);
            setSummary(summaryRes.data || null);
        } catch (err) {
            console.error('[AnomalyDetection] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [companyId, filterSeverity, filterType, showAcknowledged]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAcknowledge = async (anomalyId) => {
        setAcknowledging(anomalyId);
        try {
            await axios.post(`${BACKEND_URL}/admin/anomalies/${anomalyId}/acknowledge`, {
                user_id: profile?.id,
            });
            // Update local state
            setAnomalies((prev) =>
                prev.map((a) =>
                    a.id === anomalyId ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() } : a
                )
            );
            // Refresh summary
            const summaryRes = await axios.get(`${BACKEND_URL}/admin/anomalies/summary`, {
                params: { company_id: companyId },
            });
            setSummary(summaryRes.data || null);
        } catch (err) {
            console.error('[AnomalyDetection] Acknowledge error:', err);
        } finally {
            setAcknowledging(null);
        }
    };

    const formatTime = (isoStr) => {
        if (!isoStr) return '—';
        try {
            const d = new Date(isoStr);
            const now = new Date();
            const diffMs = now - d;
            const diffMin = Math.floor(diffMs / 60000);
            if (diffMin < 1) return 'Just now';
            if (diffMin < 60) return `${diffMin}m ago`;
            const diffHr = Math.floor(diffMin / 60);
            if (diffHr < 24) return `${diffHr}h ago`;
            const diffDay = Math.floor(diffHr / 24);
            return `${diffDay}d ago`;
        } catch {
            return '—';
        }
    };

    const severityCounts = summary?.unacknowledged_by_severity || {};

    return (
        <div className="max-w-5xl mx-auto py-6 space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase flex items-center gap-3">
                        <Activity size={28} className="text-cyan-600" /> Anomaly Detection
                    </h1>
                    <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <ShieldCheck size={14} className="text-emerald-500" /> Decentralized Pattern Analysis
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-slate-300/30"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['critical', 'high', 'medium', 'low'].map((sev) => {
                    const config = SEVERITY_CONFIG[sev];
                    const SevIcon = config.icon;
                    const count = severityCounts[sev] || 0;

                    return (
                        <Card
                            key={sev}
                            className={`border-none shadow-xl shadow-slate-100/60 rounded-2xl overflow-hidden bg-white cursor-pointer transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5 ${filterSeverity === sev ? `ring-2 ${config.ring}` : ''}`}
                            onClick={() => setFilterSeverity(filterSeverity === sev ? '' : sev)}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2 rounded-xl ${config.bg}`}>
                                        <SevIcon size={18} className={config.color} />
                                    </div>
                                    <span className={`text-3xl font-black ${config.color}`}>{count}</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {sev} severity
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <Filter size={14} /> Filters
                </div>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="text-xs font-bold text-slate-600 uppercase tracking-wider bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                >
                    <option value="">All Types</option>
                    {Object.entries(ANOMALY_TYPE_LABELS).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={showAcknowledged}
                        onChange={(e) => setShowAcknowledged(e.target.checked)}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    Show Acknowledged
                </label>
            </div>

            {/* Anomaly List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <RefreshCw size={32} className="text-cyan-500 animate-spin" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scanning for anomalies...</p>
                    </div>
                </div>
            ) : anomalies.length === 0 ? (
                <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white">
                    <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                            <ShieldCheck size={36} className="text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">
                            All Clear
                        </h3>
                        <p className="text-sm text-slate-400 font-medium max-w-sm">
                            No anomalies detected. The system is operating within normal parameters.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {anomalies.map((anomaly) => {
                        const config = SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.low;
                        const SevIcon = config.icon;
                        const typeInfo = ANOMALY_TYPE_LABELS[anomaly.anomaly_type] || { label: anomaly.anomaly_type, icon: Activity };
                        const TypeIcon = typeInfo.icon;
                        const isExpanded = expandedId === anomaly.id;

                        return (
                            <Card
                                key={anomaly.id}
                                className={`border-none shadow-lg shadow-slate-100/50 rounded-2xl overflow-hidden bg-white transition-all duration-200 hover:shadow-xl ${anomaly.acknowledged ? 'opacity-60' : ''}`}
                            >
                                <div
                                    className="px-6 py-4 flex items-center gap-4 cursor-pointer group"
                                    onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
                                >
                                    {/* Severity Icon */}
                                    <div className={`p-2.5 rounded-xl ${config.bg} shrink-0`}>
                                        <SevIcon size={20} className={config.color} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${config.badge}`}>
                                                {anomaly.severity}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                <TypeIcon size={10} /> {typeInfo.label}
                                            </span>
                                            {anomaly.acknowledged && (
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Acknowledged
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 truncate">{anomaly.title}</h4>
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{anomaly.description}</p>
                                    </div>

                                    {/* Time & Actions */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                            {formatTime(anomaly.detected_at)}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp size={16} className="text-slate-400" />
                                        ) : (
                                            <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-6 pb-5 pt-0 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-5">
                                            {anomaly.metric_value != null && (
                                                <div className="bg-slate-50 rounded-xl p-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Metric Value</p>
                                                    <p className="text-lg font-black text-slate-800">
                                                        {typeof anomaly.metric_value === 'number' ? anomaly.metric_value.toFixed(2) : anomaly.metric_value}
                                                    </p>
                                                </div>
                                            )}
                                            {anomaly.baseline_value != null && (
                                                <div className="bg-slate-50 rounded-xl p-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Baseline</p>
                                                    <p className="text-lg font-black text-slate-800">
                                                        {typeof anomaly.baseline_value === 'number' ? anomaly.baseline_value.toFixed(2) : anomaly.baseline_value}
                                                    </p>
                                                </div>
                                            )}
                                            {anomaly.deviation_pct != null && (
                                                <div className="bg-slate-50 rounded-xl p-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deviation</p>
                                                    <p className={`text-lg font-black ${anomaly.deviation_pct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {anomaly.deviation_pct > 0 ? '+' : ''}{anomaly.deviation_pct.toFixed(1)}%
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {anomaly.affected_entity && (
                                            <div className="mb-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Affected Entity</p>
                                                <p className="text-sm font-bold text-slate-700">{anomaly.affected_entity}</p>
                                            </div>
                                        )}

                                        {anomaly.recommended_action && (
                                            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 mb-4">
                                                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-1">Recommended Action</p>
                                                <p className="text-sm text-cyan-800 font-medium">{anomaly.recommended_action}</p>
                                            </div>
                                        )}

                                        {!anomaly.acknowledged && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAcknowledge(anomaly.id);
                                                }}
                                                disabled={acknowledging === anomaly.id}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-emerald-200/50"
                                            >
                                                <CheckCircle2 size={14} />
                                                {acknowledging === anomaly.id ? 'Acknowledging...' : 'Acknowledge'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminAnomalyDetection;
