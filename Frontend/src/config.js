/**
 * Global Configuration for the AI Helpdesk
 */

const getBackendUrl = () => {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (!envUrl) {
        console.error("CRITICAL: VITE_BACKEND_URL environment variable is missing. The frontend may not be able to communicate with the backend.");
        return '';
    }
    return envUrl.trim().replace(/\/$/, '');
};

export const API_CONFIG = {
    BACKEND_URL: getBackendUrl(),
    FRONTEND_URL: window.location.origin,
    IS_PROD: import.meta.env.PROD
};
