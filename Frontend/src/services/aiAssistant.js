import { API_CONFIG } from "../config";
import { supabase } from "../lib/supabaseClient";

const AI_PROVIDER_PRIORITY = ["gemini", "openrouter", "groq"];
const AI_MODEL_DEFAULTS = {
  gemini: "gemma-3-27b-it",
  openrouter: "google/gemma-3-27b-it:free",
  groq: "llama3-8b-8192",
};


// Routes AI requests through the Supabase Edge Function (ai-proxy)
// which keeps all API keys server-side and handles failover across providers.
const callAIProxy = async (provider, promptText, history, image) => {
  const model = AI_MODEL_DEFAULTS[provider] || AI_MODEL_DEFAULTS.gemini;
  const messages = history.map(msg => ({
    role: msg.role === 'bot' ? 'assistant' : 'user',
    content: msg.text || ""
  }));
  const userContent = image
    ? [{ type: "text", text: promptText }, { type: "image_url", image_url: { url: image } }]
    : promptText;
  messages.push({ role: "user", content: userContent });

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    body: { provider, model, messages, prompt: promptText },
  });

  if (error) {
    const err = new Error(error.message || "AI proxy error");
    err.status = 503;
    throw err;
  }
  if (data?.error) {
    const err = new Error(data.error);
    err.status = 502;
    throw err;
  }
  const reply =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.choices?.[0]?.message?.content ||
    data?.response ||
    "No response received.";
  return reply;
};

const runWithFailover = async (promptText, history, image) => {
  let lastError = null;
  for (const provider of AI_PROVIDER_PRIORITY) {
    console.log(`[AI Failover] Trying provider: ${provider}`);
    try {
      return await callAIProxy(provider, promptText, history, image);
    } catch (error) {
      lastError = error;
      console.warn(`[AI Failover] ${provider} failed: ${error.message}`);
    }
  }
  throw new Error(lastError || new Error("All AI providers exhausted"));
};

// ─── Smart offline fallback (used when ALL providers fail) ───────────────────
// Generates a reasonable ticket summary locally so the flow never fully breaks.
const localFallbackSummary = (issueText) => {
    const text = issueText.trim();
    // Capitalise first letter, truncate at 100 chars
    const summary = (text.charAt(0).toUpperCase() + text.slice(1)).substring(0, 100) + (text.length > 100 ? '…' : '');
    return { summary, image_description: '' };
};


// ============================================================
// EXPORT 1: askAI — Used by the chat troubleshooting assistant
// ============================================================
export const askAI = async (prompt, ticketContext, history = [], image = null) => {
    const systemPrompt = `You are an expert enterprise IT troubleshooting assistant.
Your goal is to guide the user to a resolution with extreme clarity and professionalism.

STRICT FORMATTING RULES:
1. Use **markdown** for all responses.
2. Use **bold headers** for main steps.
3. Use - bulleted lists for options or details within a step.
4. Use \`code blocks\` or \`inline code\` for all terminal commands, paths, or specific UI elements.
5. Keep the tone helpful, concise, and structured. Avoid long blocks of text.
6. If you need to ask multiple questions, use a bulleted list.

Context:
- Summary: ${ticketContext?.summary || 'N/A'}
- Category: ${ticketContext?.category || 'N/A'}
- Subcategory: ${ticketContext?.subcategory || 'N/A'}
- Entities: ${JSON.stringify(ticketContext?.entities || [])}
- OCR Text: ${ticketContext?.ocr_text || 'None'}`;

    const effectivePrompt = history.length === 0
        ? `${systemPrompt}\n\nUSER REQUEST: ${prompt}`
        : `${prompt}\n\n(Reminder: Follow all system formatting and context rules)`;

    return runWithFailover(effectivePrompt, history, image);
};

// ============================================================
// EXPORT 2: analyzeTicketWithAI — Used in AIProcessing.jsx
// Generates a smart AI summary and optional image description.
// ============================================================
export const analyzeTicketWithAI = async (issueText, ocrText = '', image = null) => {
    const imageNote = ocrText ? `\nExtracted text from uploaded screenshot: "${ocrText}"` : '';
    const imageInstruction = image
        ? '\nAn image has also been provided. Analyze it and describe the visible error or issue.'
        : '';

    const prompt = `You are an enterprise IT analyst. Given the following user-reported issue, do three things:
1. Write a concise one-line summary (max 100 chars) of the core technical problem.
2. If an image is provided, describe the visible error/UI state in one sentence.
3. Classify the ticket accurately, regardless of the language it is written in (translate internally if needed).

Respond in this EXACT JSON format (no markdown, just raw JSON):
{
  "summary": "...",
  "image_description": "...",
  "category": "...",
  "subcategory": "...",
  "priority": "...",
  "assigned_team": "...",
  "confidence": 0.95
}

User Issue: "${issueText}"${imageNote}${imageInstruction}`;

    try {
        const raw = await runWithFailover(prompt, [], image);

        // Strip any markdown code fences the model might add
        const cleaned = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
            summary: parsed.summary || issueText.substring(0, 100),
            image_description: parsed.image_description || '',
            category: parsed.category,
            subcategory: parsed.subcategory,
            priority: parsed.priority,
            assigned_team: parsed.assigned_team,
            confidence: parsed.confidence || 0.9
        };
    } catch (err) {
        // All providers failed — use smart local fallback so ticket flow never breaks
        console.warn('[analyzeTicketWithAI] All providers exhausted, using local fallback:', err.message);
        return localFallbackSummary(issueText);
    }
};
