import { API_CONFIG } from "../config";

// ============================================================
// EXPORT 1: askAI — Used by the chat troubleshooting assistant
// ============================================================
export const askAI = async (prompt, ticketContext, history = [], image = null) => {
    try {
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                ticketContext: ticketContext,
                history: history,
                image: image
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.response || "No response received from AI engine.";
    } catch (err) {
        console.error('[askAI] Backend error:', err.message);
        throw new Error("AI Chat is currently unavailable. Please try again later.");
    }
};

// ============================================================
// EXPORT 2: analyzeTicketWithAI — Used in AIProcessing.jsx
// Generates a smart AI summary and optional image description.
// ============================================================
export const analyzeTicketWithAI = async (issueText, ocrText = '', image = null) => {
    try {
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/ai/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: issueText,
                image_text: ocrText,
                image_base64: image
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Map the backend TicketResponse to the expected frontend format
        return {
            summary: data.summary || issueText.substring(0, 100),
            image_description: data.image_description || '',
            category: data.category,
            subcategory: data.subcategory,
            priority: data.priority,
            assigned_team: data.assigned_team,
            confidence: data.confidence || 0.9
        };
    } catch (err) {
        console.warn('[analyzeTicketWithAI] Backend failed, using local fallback:', err.message);
        const text = issueText.trim();
        const summary = (text.charAt(0).toUpperCase() + text.slice(1)).substring(0, 100) + (text.length > 100 ? '…' : '');
        return { summary, image_description: '' };
    }
};
