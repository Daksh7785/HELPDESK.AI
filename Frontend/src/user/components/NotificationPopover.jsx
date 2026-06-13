import React, { useState, useCallback } from 'react';
import { Bell, CheckCircle2, MessageSquare, Ticket, RefreshCw, Mail, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Button } from "../../components/ui/button";
import useTicketStore from "../../store/ticketStore";
import useAuthStore from "../../store/authStore";
import { API_CONFIG } from "../../config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return a relative time string (e.g. "2m ago", "3h ago", "Yesterday").
 * Respects the browser locale and timezone automatically via Date APIs.
 */
function formatRelativeTime(isoTimestamp) {
    if (!isoTimestamp) return '';
    const now = Date.now();
    const then = new Date(isoTimestamp).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;

    const diffDays = Math.floor(diffSeconds / 86400);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
}

/**
 * Render a coloured status badge for email delivery state.
 * Statuses: pending | sent | delivered | failed
 */
function EmailStatusBadge({ status }) {
    if (!status) return null;

    const config = {
        pending: {
            label: '⏳ Pending',
            className: 'text-amber-600 bg-amber-50 border-amber-200',
        },
        sent: {
            label: '✓ Sent',
            className: 'text-blue-600 bg-blue-50 border-blue-200',
        },
        delivered: {
            label: '✓✓ Delivered',
            className: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        },
        failed: {
            label: '✗ Failed',
            className: 'text-red-600 bg-red-50 border-red-200',
        },
    };

    const { label, className } = config[status] || {
        label: status,
        className: 'text-gray-500 bg-gray-50 border-gray-200',
    };

    return (
        <span
            className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${className}`}
        >
            {label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NotificationPopover = ({ isAdmin = false }) => {
    const navigate = useNavigate();
    const { notifications = [], markNotificationsRead, updateNotificationDeliveryStatus } = useTicketStore();
    const { profile } = useAuthStore();
    const currentRole = isAdmin ? 'admin' : 'user';

    // Track which notifications are currently being resent (loading state per id)
    const [resendingIds, setResendingIds] = useState(new Set());
    // Track tooltip visibility per notification id
    const [tooltipId, setTooltipId] = useState(null);

    // Filter to only show notifications meant for this role.
    // Legacy notifications without recipientRole are shown to everyone for backwards compat.
    const myNotifications = notifications.filter(
        n => !n.recipientRole || n.recipientRole === currentRole
    );

    const unreadCount = myNotifications.filter(n => !n.read).length;

    const getIcon = (type) => {
        switch (type) {
            case 'resolution': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'message': return <MessageSquare className="w-5 h-5 text-blue-500" />;
            case 'new_ticket': return <Ticket className="w-5 h-5 text-amber-500" />;
            default: return <Bell className="w-5 h-5 text-gray-400" />;
        }
    };

    /**
     * Call the backend resend endpoint, then update local state so the UI
     * reflects the new status without requiring a full page reload.
     */
    const handleResend = useCallback(async (e, notifId) => {
        e.stopPropagation(); // prevent the row's navigate click

        if (!profile?.id) return;

        setResendingIds(prev => new Set(prev).add(notifId));
        try {
            const res = await fetch(
                `${API_CONFIG.BACKEND_URL}/notifications/${notifId}/resend`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: profile.id }),
                }
            );
            const data = await res.json();
            if (res.ok && data.success) {
                // Optimistically update local state to "pending"
                updateNotificationDeliveryStatus(notifId, {
                    emailStatus: 'pending',
                    emailErrorMessage: null,
                });
            }
        } catch {
            // Silently ignore network errors; badge retains "failed" state
        } finally {
            setResendingIds(prev => {
                const next = new Set(prev);
                next.delete(notifId);
                return next;
            });
        }
    }, [profile, updateNotificationDeliveryStatus]);

    return (
        <Popover onOpenChange={(open) => { if (!open) markNotificationsRead(); }}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center border-2 border-white px-1">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-2xl border-gray-100 rounded-2xl overflow-hidden mt-1 z-50">
                <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 leading-none">Notifications</h3>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Recent Activity</p>
                    </div>
                    {unreadCount > 0 && (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{unreadCount} NEW</span>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto bg-white">
                    {myNotifications.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {myNotifications.map((notif) => {
                                const hasEmail = Boolean(notif.emailStatus);
                                const isFailed = notif.emailStatus === 'failed';
                                const isResending = resendingIds.has(notif.id);
                                const showTooltip = tooltipId === notif.id && isFailed && notif.emailErrorMessage;

                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => {
                                            // Correct route: /admin/ticket/:id for admins, /ticket/:id for users
                                            const route = isAdmin
                                                ? `/admin/ticket/${notif.ticketId}`
                                                : `/ticket/${notif.ticketId}`;
                                            navigate(route);
                                        }}
                                        className={`p-4 hover:bg-gray-50/80 transition cursor-pointer flex gap-3 relative ${!notif.read ? 'bg-emerald-50/20' : ''}`}
                                    >
                                        <div className="mt-1 shrink-0 p-2 bg-gray-50 rounded-lg">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>

                                            {/* Email delivery status row */}
                                            {hasEmail && (
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                                    <EmailStatusBadge status={notif.emailStatus} />

                                                    {/* Delivery timestamp */}
                                                    {notif.emailDeliveredAt && (
                                                        <span className="text-[9px] text-gray-400 font-medium">
                                                            {formatRelativeTime(notif.emailDeliveredAt)}
                                                        </span>
                                                    )}
                                                    {notif.emailSentAt && !notif.emailDeliveredAt && (
                                                        <span className="text-[9px] text-gray-400 font-medium">
                                                            {formatRelativeTime(notif.emailSentAt)}
                                                        </span>
                                                    )}

                                                    {/* Error tooltip trigger */}
                                                    {isFailed && notif.emailErrorMessage && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTooltipId(prev => prev === notif.id ? null : notif.id);
                                                            }}
                                                            aria-label="View error details"
                                                            className="ml-0.5 text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <AlertCircle className="w-3 h-3" />
                                                        </button>
                                                    )}

                                                    {/* Resend button */}
                                                    {isFailed && (
                                                        <button
                                                            id={`resend-btn-${notif.id}`}
                                                            onClick={(e) => handleResend(e, notif.id)}
                                                            disabled={isResending}
                                                            aria-label="Resend email notification"
                                                            className="ml-auto flex items-center gap-1 text-[9px] font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed px-2 py-0.5 rounded-full transition-colors"
                                                        >
                                                            <RefreshCw className={`w-2.5 h-2.5 ${isResending ? 'animate-spin' : ''}`} />
                                                            {isResending ? 'Sending…' : 'Resend'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Error tooltip */}
                                            {showTooltip && (
                                                <div
                                                    role="tooltip"
                                                    className="mt-1.5 text-[10px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 leading-relaxed"
                                                >
                                                    {notif.emailErrorMessage}
                                                </div>
                                            )}

                                            <p className="text-[9px] font-bold text-gray-400 mt-2 uppercase tracking-tighter">
                                                {new Date(notif.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-10 text-center flex flex-col items-center">
                            <div className="size-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                                <Bell className="w-6 h-6 text-gray-200" />
                            </div>
                            <p className="text-sm font-bold text-gray-900">All caught up</p>
                            <p className="text-xs font-medium text-gray-500 mt-1">No new activity to show</p>
                        </div>
                    )}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={() => markNotificationsRead()}
                        className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-emerald-600 transition-colors bg-white rounded-lg border border-gray-100"
                    >
                        Mark all as read
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationPopover;
