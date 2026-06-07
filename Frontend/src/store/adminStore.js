import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAdminStore = create(
    persist(
        (set) => ({
            adminProfile: null,

            /**
             * Initialize admin profile from auth context.
             * Call this after successful admin login to populate profile data.
             * @param {object} profile - The profile object from authStore
             */
            initialize: (profile) => {
                if (!profile) return;
                set({
                    adminProfile: {
                        id: profile.id || null,
                        email: profile.email || '',
                        full_name: profile.full_name || profile.name || '',
                        role: profile.role || 'admin',
                        company: profile.company || '',
                        profile_picture: profile.profile_picture || null,
                        lastLogin: new Date().toISOString(),
                    }
                });
            },

            /**
             * Update admin profile fields.
             * @param {object} updates - Fields to update
             */
            updateProfile: (updates) => set((state) => ({
                adminProfile: state.adminProfile
                    ? { ...state.adminProfile, ...updates }
                    : null
            })),
        }),
        {
            name: 'admin-storage',
        }
    )
);

export default useAdminStore;