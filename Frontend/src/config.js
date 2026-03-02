/**
 * Global Configuration for the AI Helpdesk
 */

const getBackendUrl = () => {
    // Priority: .env → system default → localhost fallback
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (envUrl) return envUrl.replace(/\/$/, ''); // Remove trailing slash

    // In production, we might want to default to something else
    if (import.meta.env.PROD) {
        return 'https://ritesh-1918-ai-powered-ticket-backend.hf.space'; // Placeholder
    }

    return 'http://localhost:8000';
};

export const API_CONFIG = {
    BACKEND_URL: getBackendUrl(),
    FRONTEND_URL: window.location.origin,
    IS_PROD: import.meta.env.PROD
};
