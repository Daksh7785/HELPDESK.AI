/**
 * Global Configuration for the AI Helpdesk
 */

const getBackendUrl = () => {
    // Priority: .env → system default → localhost fallback
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (envUrl) return envUrl.trim().replace(/\/$/, ''); // Remove whitespace and trailing slash

    // In production, we might want to default to something else
    if (import.meta.env.PROD) {
        return 'https://ritesh19180-ai-helpdesk-api.hf.space';
    }

    return 'http://localhost:8000';
};

export const API_CONFIG = {
    BACKEND_URL: getBackendUrl(),
    FRONTEND_URL: window.location.origin,
    IS_PROD: import.meta.env.PROD
};
