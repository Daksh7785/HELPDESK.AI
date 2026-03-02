import React from 'react';
import { Card } from "../../components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Reusable StatCard for Admin Metrics
 * @param {string} label - Title of the card
 * @param {string|number} value - Main stat to display
 * @param {string} subtitle - Secondary text
 * @param {React.ReactNode} icon - Lucide icon
 * @param {string} trend - Optional trend indicator (+ or -)
 * @param {string} color - Indigo, Emerald, Amber, Slate
 */
const StatCard = ({ label, value, subtitle, icon: Icon, trend, color = 'indigo' }) => {
    const colorStyles = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        red: 'bg-red-50 text-red-600 border-red-100',
        slate: 'bg-slate-50 text-slate-500 border-slate-100'
    };

    const textStyles = {
        indigo: 'text-indigo-600',
        emerald: 'text-emerald-600',
        amber: 'text-amber-600',
        red: 'text-red-600',
        slate: 'text-slate-600'
    };

    return (
        <Card className="p-6 border-none shadow-sm hover:shadow-md transition-all group bg-white rounded-2xl">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black text-slate-900 tracking-tight">{value}</p>
                        {trend && (
                            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trend.startsWith('+') ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {trend}
                            </span>
                        )}
                    </div>
                    {subtitle && <p className="text-xs text-slate-500 font-medium mt-2 flex items-center gap-1.5"><Minus size={10} className="text-slate-300" /> {subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl border-2 shadow-sm transition-transform group-hover:scale-110 duration-500 ${colorStyles[color]}`}>
                    <Icon size={24} />
                </div>
            </div>
            {/* Visual background element */}
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-slate-50 rounded-br-2xl -z-10 group-hover:to-slate-100/50 transition-colors"></div>
        </Card>
    );
};

export default StatCard;
