import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useTicketStore = create(
    persist(
        (set) => ({
            aiTicket: null,
            activeTicket: null,
            autoResolvedTickets: [], // For analytics
            tickets: [], // Global queue for admins
            notifications: [], // User notifications
            setAITicket: (data) => set({ aiTicket: data }),
            setActiveTicket: (ticket) => set({ activeTicket: ticket }),
            addAutoResolvedTicket: (record) => set((state) => ({
                autoResolvedTickets: [...state.autoResolvedTickets, record]
            })),
            addTicket: (ticket) => set((state) => {
                const newNotification = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    title: 'New Ticket Submitted',
                    message: `Ticket #${ticket.ticket_id} (${ticket.category}) requires review.`,
                    ticketId: ticket.ticket_id,
                    read: false,
                    timestamp: new Date().toISOString(),
                    type: 'new_ticket',
                    recipientRole: 'admin'  // only admins see new ticket notifications
                };

                return {
                    tickets: [...state.tickets, ticket],
                    notifications: [newNotification, ...(state.notifications || [])]
                };
            }),
            updateTicket: (ticketId, updates) => set((state) => {
                const existingTicket = state.tickets.find(t => t.ticket_id === ticketId);
                const isResolving = updates.status &&
                    updates.status.toLowerCase().includes('resolv') &&
                    existingTicket?.status !== updates.status;

                const newNotification = isResolving ? {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    title: 'Ticket Resolved',
                    message: `Good news! Ticket #${ticketId} has been marked as resolved.`,
                    ticketId: ticketId,
                    read: false,
                    timestamp: new Date().toISOString(),
                    type: 'resolution',
                    recipientRole: 'user'  // only the user cares their ticket was resolved
                } : null;

                const updatedTickets = state.tickets.map(t => t.ticket_id === ticketId ? { ...t, ...updates } : t);
                const shouldUpdateActive = state.activeTicket?.ticket_id === ticketId;

                return {
                    tickets: updatedTickets,
                    activeTicket: shouldUpdateActive ? { ...state.activeTicket, ...updates } : state.activeTicket,
                    notifications: newNotification
                        ? [newNotification, ...(state.notifications || [])]
                        : (state.notifications || [])
                };
            }),
            appendMessage: (ticketId, message) => set((state) => {
                const isFromAdmin = message.sender === 'admin';
                // Notify the OTHER party — admin messages go to user, user messages go to admin
                const newNotification = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    title: isFromAdmin ? 'New Response from Support' : 'New Message from User',
                    message: isFromAdmin
                        ? `Support replied on Ticket #${ticketId}`
                        : `User sent a message on Ticket #${ticketId}`,
                    ticketId: ticketId,
                    read: false,
                    timestamp: new Date().toISOString(),
                    type: 'message',
                    recipientRole: isFromAdmin ? 'user' : 'admin'  // opposite of sender
                };

                const updatedTickets = state.tickets.map(t =>
                    t.ticket_id === ticketId
                        ? { ...t, messages: [...(t.messages || []), message] }
                        : t
                );
                const shouldUpdateActive = state.activeTicket?.ticket_id === ticketId;

                return {
                    tickets: updatedTickets,
                    activeTicket: shouldUpdateActive
                        ? { ...state.activeTicket, messages: [...(state.activeTicket?.messages || []), message] }
                        : state.activeTicket,
                    notifications: newNotification
                        ? [newNotification, ...(state.notifications || [])]
                        : (state.notifications || [])
                };
            }),
            appendNote: (ticketId, note) => set((state) => {
                const updatedTickets = state.tickets.map(t =>
                    t.ticket_id === ticketId
                        ? { ...t, internal_notes: [...(t.internal_notes || []), note] }
                        : t
                );
                const shouldUpdateActive = state.activeTicket?.ticket_id === ticketId;

                return {
                    tickets: updatedTickets,
                    activeTicket: shouldUpdateActive
                        ? { ...state.activeTicket, internal_notes: [...(state.activeTicket?.internal_notes || []), note] }
                        : state.activeTicket
                };
            }),
            markNotificationsRead: () => set((state) => ({
                notifications: (state.notifications || []).map(n => ({ ...n, read: true }))
            })),
            clearTicket: () => set({ aiTicket: null, activeTicket: null, autoResolvedTickets: [] }),
        }),
        {
            name: 'ticket-storage', // unique name for localStorage key
        }
    )
);

// Listen for storage changes from other tabs to keep the queue in sync
// Listen for storage changes from other tabs to keep the queue in sync
window.addEventListener('storage', () => {
    // Force rehydration on any storage change to catch updates reliably
    useTicketStore.persist.rehydrate();
});

export default useTicketStore;
