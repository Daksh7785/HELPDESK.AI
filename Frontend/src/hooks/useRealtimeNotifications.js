import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import useAuthStore from '../store/authStore';
import useTicketStore from '../store/ticketStore';

// We keep track of processed payload timestamps to avoid duplicate real-time notifications
const processedPayloads = new Set();

const useRealtimeNotifications = () => {
    const { user, profile } = useAuthStore();
    const { addNotification } = useTicketStore();

    useEffect(() => {
        if (!user || !profile) return;

        const handleTicketChange = (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            // Deduplication logic using the internal commit timestamp
            const commitTs = payload.commit_timestamp;
            if (commitTs && processedPayloads.has(commitTs)) return;
            if (commitTs) processedPayloads.add(commitTs);

            const isAdmin = profile.role === 'admin' || profile.role === 'master_admin';
            const isOwner = newRecord.user_id === user.id;

            // 1. NEW TICKET CREATED -> Notify Admins
            if (eventType === 'INSERT') {
                if (isAdmin) {
                    addNotification({
                        title: 'New Ticket Received',
                        message: `A new ${newRecord.category || 'Support'} ticket requires triage.`,
                        ticketId: newRecord.id,
                        type: 'new_ticket',
                        recipientRole: 'admin'
                    });
                }
                return;
            }

            // 2. UPDATES
            if (eventType === 'UPDATE' && oldRecord) {
                // Determine what changed
                const statusChanged = oldRecord.status !== newRecord.status;
                const teamChanged = oldRecord.assigned_team !== newRecord.assigned_team;

                // For nested JSON/JSONB updates (messages)
                const oldMessagesLen = Array.isArray(oldRecord.messages) ? oldRecord.messages.length : 0;
                const newMessagesLen = Array.isArray(newRecord.messages) ? newRecord.messages.length : 0;
                const newlyAddedMessage = newMessagesLen > oldMessagesLen
                    ? newRecord.messages[newMessagesLen - 1]
                    : null;

                // STATUS CHANGE -> Notify User (e.g., Resolved, In Progress)
                if (statusChanged && isOwner) {
                    addNotification({
                        title: `Ticket ${newRecord.status}`,
                        message: `Your ticket status was updated to ${newRecord.status}.`,
                        ticketId: newRecord.id,
                        type: newRecord.status?.toLowerCase().includes('resolv') ? 'resolution' : 'update',
                        recipientRole: 'user'
                    });
                }

                // RE-ASSIGNMENT -> Notify User
                if (teamChanged && isOwner && newRecord.assigned_team) {
                    addNotification({
                        title: 'Ticket Re-Assigned',
                        message: `Your ticket is now being handled by ${newRecord.assigned_team}.`,
                        ticketId: newRecord.id,
                        type: 'update',
                        recipientRole: 'user'
                    });
                }

                // NEW CHAT MESSAGE -> Notify whoever didn't send it
                if (newlyAddedMessage) {
                    const isFromAdmin = newlyAddedMessage.sender === 'admin';

                    if (isFromAdmin && isOwner) {
                        // Admin sent message -> Notify User
                        addNotification({
                            title: 'New Reply from Support',
                            message: newlyAddedMessage.message || `Support replied to your ticket.`,
                            ticketId: newRecord.id,
                            type: 'message',
                            recipientRole: 'user'
                        });
                    } else if (!isFromAdmin && isAdmin) {
                        // User sent message -> Notify Admin
                        addNotification({
                            title: 'New Message from User',
                            message: newlyAddedMessage.message || `A user replied to their ticket.`,
                            ticketId: newRecord.id,
                            type: 'message',
                            recipientRole: 'admin'
                        });
                    }
                }
            }
        };

        const channel = supabase
            .channel('global-ticket-notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tickets'
                },
                handleTicketChange
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, profile, addNotification]);
};

export default useRealtimeNotifications;
