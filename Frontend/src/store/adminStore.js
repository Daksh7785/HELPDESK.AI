import { create } from 'zustand';
import { createPersistedStore } from './persistenceMiddleware';

const useAdminStore = create(
    createPersistedStore('admin',
        (set) => ({
            adminProfile: {
                name: "Admin",
                email: "admin@helpdesk.ai",
                profile_picture: null,
                role: "Root Administrator",
                id: "ADM-0001",
                lastLogin: "",
                region: ""
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
        })
    )
);

export default useAdminStore;