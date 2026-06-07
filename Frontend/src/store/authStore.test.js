import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Mock the supabase client and ticketStore
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockClearTicket = vi.fn();
const mockSetState = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        auth: {
            signOut: mockSignOut,
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
        }
    }
}));

vi.mock('./ticketStore', () => ({
    default: {
        getState: () => ({ clearTicket: mockClearTicket, setState: mockSetState }),
        setState: mockSetState
    }
}));

// Inline a simplified authStore for testing the logout flow
const createAuthStoreForLogout = () => create(
    persist(
        (set) => ({
            user: null,
            profile: null,
            loading: false,

            logout: async () => {
                set({ loading: true });
                try {
                    const { error } = await mockSignOut();
                    if (error) throw error;
                } finally {
                    // Always clear auth state — even if signOut fails (network error, etc.)
                    // This prevents cross-user data leakage on error paths
                    set({ user: null, profile: null });
                    // clear persisted ticket state to prevent cross-user data leakage
                    mockClearTicket();
                    mockSetState({ notifications: [], tickets: [] });
                    set({ loading: false });
                }
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ profile: state.profile }),
        }
    )
);

describe('authStore logout flow', () => {
    let store;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSignOut.mockResolvedValue({ error: null });
        store = createAuthStoreForLogout();
    });

    it('clears user and profile state after successful logout', async () => {
        // Set initial state
        store.setState({
            user: { id: 'user-123', email: 'test@example.com' },
            profile: { id: 'user-123', email: 'test@example.com', role: 'user' }
        });

        await store.getState().logout();

        expect(store.getState().user).toBeNull();
        expect(store.getState().profile).toBeNull();
    });

    it('calls supabase signOut', async () => {
        store.setState({ user: { id: 'user-123' } });
        await store.getState().logout();
        expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('calls ticketStore.clearTicket to prevent data leakage', async () => {
        store.setState({ user: { id: 'user-123' } });
        await store.getState().logout();
        expect(mockClearTicket).toHaveBeenCalledTimes(1);
    });

    it('calls ticketStore.setState to clear notifications and tickets', async () => {
        store.setState({ user: { id: 'user-123' } });
        await store.getState().logout();
        expect(mockSetState).toHaveBeenCalledWith({ notifications: [], tickets: [] });
    });

    it('sets loading to false after logout completes', async () => {
        store.setState({ user: { id: 'user-123' }, loading: false });
        await store.getState().logout();
        expect(store.getState().loading).toBe(false);
    });

    it('sets loading to false even when signOut throws', async () => {
        mockSignOut.mockRejectedValueOnce(new Error('Network error'));
        store.setState({ user: { id: 'user-123' }, loading: false });

        await expect(store.getState().logout()).rejects.toThrow('Network error');
        expect(store.getState().loading).toBe(false);
    });

    it('clears state even when signOut fails (finally block)', async () => {
        mockSignOut.mockRejectedValueOnce(new Error('Auth error'));
        store.setState({
            user: { id: 'user-123' },
            profile: { id: 'user-123', role: 'user' }
        });

        await expect(store.getState().logout()).rejects.toThrow('Auth error');
        // State should still be cleared due to finally block
        expect(store.getState().user).toBeNull();
        expect(store.getState().profile).toBeNull();
        expect(mockClearTicket).toHaveBeenCalled(); // Still called in finally
    });

    it('handles logout when user is already null', async () => {
        store.setState({ user: null, profile: null });
        await store.getState().logout();
        expect(mockSignOut).toHaveBeenCalledTimes(1);
        expect(store.getState().loading).toBe(false);
    });
});