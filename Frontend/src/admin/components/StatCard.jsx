import React from 'react';
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Reusable StatCard for Admin Metrics
 * @param {string} label - Title of the card
 * @param {string|number} value - Main stat to display
 * @param {string} subtitle - Secondary text
 * @param {React.ReactNode} icon - Lucide icon
 * @param {string} trend - Optional trend indicator (+ or -)
 * @param {string} color - Semantic color mapper
 */
const StatCard = ({ label, value, subtitle, icon: Icon, trend, color = 'indigo' }) => {
    // Map existing colors to requested semantic colors: network=green, warning=amber, success=teal, human=blue
    const semanticColors = {
        indigo: { bg: '#EDFAF3', text: '#16a34a' },  // network=green (Total Tickets)
        amber: { bg: '#FFFBEB', text: '#d97706' },   // warning=amber (Active Incidents)
        emerald: { bg: '#F0FDFA', text: '#0d9488' }, // success=teal (AI Auto-Resolved)
        red: { bg: '#EFF6FF', text: '#2563eb' },     // human=blue (Human Escalations)
        slate: { bg: '#F8FAFC', text: '#64748B' }
    };

    const currentStyle = semanticColors[color] || semanticColors.slate;

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #f0fdf4',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            padding: '24px',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
        }} className="hover:shadow-lg hover:-translate-y-1 group">
            <div className="flex items-start justify-between">
                <div>
                    <p style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 800, color: '#0f1f12', lineHeight: 1 }}>
                            {value}
                        </p>
                        {trend && (
                            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trend.startsWith('+') ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {trend}
                            </span>
                        )}
                    </div>
                    {subtitle && <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Minus size={10} color="#d1d5db" /> {subtitle}</p>}
                </div>
                <div style={{
                    background: currentStyle.bg,
                    color: currentStyle.text,
                    padding: '12px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.5s ease'
                }} className="group-hover:scale-110">
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
};

export default StatCard;

