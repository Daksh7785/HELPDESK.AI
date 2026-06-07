/**
 * Global Configuration for the AI Helpdesk
 */

const getBackendUrl = () => {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (!envUrl) {
        throw new Error("CRITICAL: VITE_BACKEND_URL environment variable is missing. The frontend cannot communicate with the backend.");
    }
    return envUrl.trim().replace(/\/$/, '');
};

export const API_CONFIG = {
    BACKEND_URL: getBackendUrl(),
    FRONTEND_URL: window.location.origin,
    IS_PROD: import.meta.env.PROD
};
