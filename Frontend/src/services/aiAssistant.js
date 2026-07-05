import { API_CONFIG } from "../config";

export const askAI = async (prompt, ticketContext, history = [], image = null) => {
    try {
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/ai/proxy/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, ticket_context: ticketContext, history, image })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response;
    } catch (err) {
        console.error("[askAI] Error calling backend proxy:", err);
        throw err;
    }
};

export const analyzeTicketWithAI = async (issueText, ocrText = '', image = null) => {
    try {
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/ai/proxy/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issue_text: issueText, ocr_text: ocrText, image })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (err) {
        console.error("[analyzeTicketWithAI] Error calling backend proxy:", err);
        // Fallback
        const text = issueText.trim();
        const summary = (text.charAt(0).toUpperCase() + text.slice(1)).substring(0, 100) + (text.length > 100 ? '…' : '');
        return {
            summary,
            image_description: '',
            sla_breach_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
    }
};
