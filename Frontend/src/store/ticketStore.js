import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const buildLookup = (tickets) => {
  const map = {};
  if (Array.isArray(tickets)) {
    tickets.forEach(t => { if (t?.ticket_id) map[t.ticket_id] = t; });
  }
  return map;
};

const lookupToArray = (lookup) => Object.values(lookup);

const useTicketStore = create(
    persist(
        (set) => ({
            aiTicket: null,
            activeTicket: null,
            autoResolvedTickets: [],
            tickets: [],
            _ticketLookup: {},
            notifications: [],

            setAITicket: (data) => set({ aiTicket: data }),
            setActiveTicket: (ticket) => set({ activeTicket: ticket }),
            addAutoResolvedTicket: (record) => set((state) => ({
                autoResolvedTickets: [...state.autoResolvedTickets, record]
            })),
            addNotification: (notification) => set((state) => ({
                notifications: [
                    {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        timestamp: new Date().toISOString(),
                        read: false,
                        ...notification
                    },
                    ...(state.notifications || [])
                ]
            })),
            addTicket: (ticket) => set((state) => {
                const next = { ...state._ticketLookup };
                next[ticket.ticket_id] = ticket;
                return { _ticketLookup: next, tickets: lookupToArray(next) };
            }),
            updateTicket: (ticketId, updates) => set((state) => {
                const next = { ...state._ticketLookup };
                if (next[ticketId]) next[ticketId] = { ...next[ticketId], ...updates };
                const shouldUpdateActive = state.activeTicket?.ticket_id === ticketId;
                return {
                    _ticketLookup: next,
                    tickets: lookupToArray(next),
                    activeTicket: shouldUpdateActive ? { ...state.activeTicket, ...updates } : state.activeTicket
                };
            }),
            removeTicket: (ticketId) => set((state) => {
                const next = { ...state._ticketLookup };
                delete next[ticketId];
                return {
                    _ticketLookup: next,
                    tickets: lookupToArray(next),
                    activeTicket: state.activeTicket?.ticket_id === ticketId ? null : state.activeTicket
                };
            }),
            appendMessage: (ticketId, message) => set((state) => {
                const next = { ...state._ticketLookup };
                if (next[ticketId]) {
                    next[ticketId] = { ...next[ticketId], messages: [...(next[ticketId].messages || []), message] };
                }
                const shouldUpdateActive = state.activeTicket?.ticket_id === ticketId;
                return {
                    _ticketLookup: next,
                    tickets: lookupToArray(next),
                    activeTicket: shouldUpdateActive
                        ? { ...state.activeTicket, messages: [...(state.activeTicket?.messages || []), message] }
                        : state.activeTicket
                };
            }),
            appendNote: (ticketId, note) => set((state) => {
                const next = { ...state._ticketLookup };
                if (next[ticketId]) {
                    next[ticketId] = { ...next[ticketId], internal_notes: [...(next[ticketId].internal_notes || []), note] };
                }
                const shouldUpdateActive = state.activeTicket?.ticket_id === ticketId;
                return {
                    _ticketLookup: next,
                    tickets: lookupToArray(next),
                    activeTicket: shouldUpdateActive
                        ? { ...state.activeTicket, internal_notes: [...(state.activeTicket?.internal_notes || []), note] }
                        : state.activeTicket
                };
            }),
            markNotificationsRead: () => set((state) => ({
                notifications: (state.notifications || []).map(n => ({ ...n, read: true }))
            })),
            clearTicket: () => set({ aiTicket: null, activeTicket: null, autoResolvedTickets: [], _ticketLookup: {}, tickets: [] }),
        }),
        {
            name: 'ticket-storage',
            partialize: (state) => ({
                aiTicket: state.aiTicket,
                activeTicket: state.activeTicket,
                autoResolvedTickets: state.autoResolvedTickets,
                tickets: lookupToArray(state._ticketLookup),
                notifications: state.notifications,
            }),
            merge: (persisted, current) => ({
                ...current,
                ...persisted,
                _ticketLookup: buildLookup(persisted.tickets || []),
            }),
        }
    )
);

window.addEventListener('storage', () => {
    useTicketStore.persist.rehydrate();
});

export default useTicketStore;
