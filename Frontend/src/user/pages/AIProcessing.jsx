import React, { useEffect, useRef, useState, useCallback } from 'react';

import { useNavigate, useLocation } from 'react-router-dom';

import { Bot, Clock, RefreshCw } from 'lucide-react';
import useToastStore from '../../store/toastStore';
import { Card } from "../../components/ui/card";
import AIProcessingSteps from "../components/AIProcessingSteps";
import useTicketStore from "../../store/ticketStore";
import useAdminStore from '../../admin/store/adminStore';
import useAuthStore from '../../store/authStore';
import { supabase } from '../../lib/supabaseClient';
import { API_CONFIG } from '../../config';
import { analyzeTicketWithAI, logTimeoutEvent, ANALYSIS_TIMEOUT_MS } from '../../services/aiAssistant';

const steps = [
    "Reading your message",
    "Extracting technical entities",
    "Detecting category and priority",
    "Checking duplicate issues",
    "Finding possible solutions"
];

// Estimated total duration shown in the hint (matches ANALYSIS_TIMEOUT_MS / 2)
const ESTIMATED_SECONDS = Math.round(ANALYSIS_TIMEOUT_MS / 2 / 1000);

const AIProcessing = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { text, image_text, image_base64, template_id, template_used, user_modified, ticket_title, original_text, original_language } = location.state || {};
    const setAITicket = useTicketStore((state) => state.setAITicket);
    const { settings } = useAdminStore();
    const { user, profile } = useAuthStore();
    const { showToast } = useToastStore();
    const hasCalledAPI = useRef(false);
    const componentAbortRef = useRef(null);   // AbortController for the current attempt
    const [activeStep, setActiveStep] = useState(0);
    const [timedOut, setTimedOut] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const elapsedTimerRef = useRef(null);

    // ── Elapsed-time counter ─────────────────────────────────────────────────
    const startElapsedTimer = useCallback(() => {
        setElapsedSeconds(0);
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = setInterval(() => {
            setElapsedSeconds((s) => s + 1);
        }, 1000);
    }, []);

    const stopElapsedTimer = useCallback(() => {
        if (elapsedTimerRef.current) {
            clearInterval(elapsedTimerRef.current);
            elapsedTimerRef.current = null;
        }
    }, []);

    // ── Core analysis logic ──────────────────────────────────────────────────
    const analyzeTicket = useCallback(async () => {
        setTimedOut(false);
        setActiveStep(0);
        startElapsedTimer();

        // Create a fresh AbortController for each attempt
        const controller = new AbortController();
        componentAbortRef.current = controller;

        try {

            // ── Upload Image if present ──
            let uploadedImageUrl = null;

            if (image_base64) {

                try {

                    const base64Data = image_base64.split(',')[1] || image_base64;
                    const contentType =
                        image_base64.match(/data:(.*?);/)?.[1] || 'image/jpeg';

                    const fileExt = contentType.split('/')[1] || 'jpeg';

                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);

                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }

                    const byteArray = new Uint8Array(byteNumbers);

                    const blob = new Blob([byteArray], {
                        type: contentType
                    });

                    const fileName =
                        `${user?.id || 'anon'}/${Date.now()}-${Math.random()
                            .toString(36)
                            .substring(7)}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('ticket-attachments')
                        .upload(fileName, blob, {
                            contentType,
                            upsert: true
                        });

                    if (!uploadError) {

                        const { data: publicUrlData } = supabase.storage
                            .from('ticket-attachments')
                            .getPublicUrl(fileName);

                        uploadedImageUrl = publicUrlData?.publicUrl;
                    }

                } catch (err) {
                    console.error("[AIProcessing] Image upload failed:", err);
                }
            }

            const payload = {
                text: text,
                image_text: image_text || "",
                image_base64: image_base64 || "",
                user_id: user?.id,
                company:
                    profile?.company ||
                    user?.user_metadata?.company ||
                    "System",
                company_id: profile?.company_id || null,
                image_url: uploadedImageUrl,
                confidence_threshold: settings.aiConfidenceThreshold,
                duplicate_sensitivity: settings.duplicateSensitivity,
                // Smart Template metadata (backend can use for improved routing)
                template_id: template_id || null,
                template_used: template_used || false,
                user_modified: user_modified || false,
                ticket_title: ticket_title || null,
            };

            // 6-second hard abort for the SSE stream connection phase
            const streamAbort = new AbortController();
            const streamTimeoutId = setTimeout(() => streamAbort.abort(), 6000);

            // Combine component-level abort with stream timeout abort
            const onComponentAbort = () => streamAbort.abort();
            controller.signal.addEventListener('abort', onComponentAbort, { once: true });

            const response = await fetch(
                `${API_CONFIG.BACKEND_URL}/ai/analyze_stream`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    signal: streamAbort.signal
                }
            );
            clearTimeout(streamTimeoutId);
            controller.signal.removeEventListener('abort', onComponentAbort);

            if (!response.ok) {
                throw new Error("Backend streaming failed");
            }

            // ==============================
            // FIXED SSE BUFFERED PARSING
            // ==============================

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let done = false;
            let finalTicket = null;
            

            // Buffer stores incomplete SSE chunks
            let buffer = "";

            while (!done) {
                // Honour component-level abort during stream reading
                if (controller.signal.aborted) {
                    reader.cancel();
                    throw Object.assign(new Error("Request aborted"), { name: "AbortError" });
                }

                const { value, done: readerDone } = await reader.read();

                done = readerDone;

                if (value) {


                    // Append chunk to buffer
                    buffer += decoder.decode(value, { stream: true });

                    // SSE events separated by blank line
                    const events = buffer.split('\n\n');

                    // Keep incomplete trailing event
                    buffer = events.pop() || "";

                    for (const event of events) {

                        const lines = event.split('\n');

                        for (const line of lines) {

                            if (!line.startsWith('data: ')) continue;


                            try {

                                const data = JSON.parse(
                                    line.substring(6)
                                );

                                if (data.step === 'done') {

                                    setActiveStep(steps.length);

                                    finalTicket = data.result;

                                } else {

                                    const stepIndex =
                                        steps.indexOf(data.step);

                                    if (stepIndex !== -1) {
                                        setActiveStep(stepIndex);
                                    }
                                }

                            } catch (e) {




                                console.error(
                                    "Error parsing stream data",
                                    e,
                                    line
                                );
 
                            }
                        }
                    }
                }
            }

            // Optional leftover buffer parsing
            if (buffer.trim()) {

                const lines = buffer.split('\n');

                for (const line of lines) {

                    if (!line.startsWith('data: ')) continue;

                    try {

                        const data = JSON.parse(
                            line.substring(6)
                        );

                        if (data.step === 'done') {
                            finalTicket = data.result;
                        }

                    } catch (e) {

                        console.error(
                            "Final buffer parse error",
                            e,
                            line
                        );
                    }
                }
            }

            if (!finalTicket) {
                throw new Error("BACKEND_STARTUP");
            }

            // Override the backend summary using the robust frontend multi-provider failover
            try {
                const aiResult = await analyzeTicketWithAI(text, image_text, image_base64, controller.signal);
                finalTicket.summary = aiResult.summary || finalTicket.summary;
                if (aiResult.image_description) {
                    finalTicket.image_description = aiResult.image_description;
                }
                
                // The local ML model is weak with regional languages (e.g., Telugu).
                // If the LLM returned classification fields, we trust it more than a low-confidence ML prediction.
                if (aiResult.category && (finalTicket.confidence < 0.6 || finalTicket.category === 'Unknown' || finalTicket.category === 'Access')) {
                    finalTicket.category = aiResult.category;
                    finalTicket.subcategory = aiResult.subcategory || finalTicket.subcategory;
                    finalTicket.priority = aiResult.priority || finalTicket.priority;
                    finalTicket.assigned_team = aiResult.assigned_team || finalTicket.assigned_team;
                    finalTicket.confidence = aiResult.confidence || 0.95;
                }
            } catch (aiErr) {
                if (aiErr.name === 'AnalysisTimeoutError') {
                    // Frontend AI summary timed out — log and continue with backend result
                    logTimeoutEvent('frontend_timeout', {
                        endpoint: 'analyzeTicketWithAI (summary override)',
                        duration_ms: aiErr.duration_ms,
                    });
                    console.warn("[AIProcessing] Frontend AI summary timed out; using backend result.");
                } else {
                    console.warn("[AIProcessing] Frontend summary generation failed:", aiErr);
                }
            }

            stopElapsedTimer();

            const aiTicketObject = {
                ...finalTicket,
                status: 'analyzing',
                originalIssue: original_text || text,
                originalLanguage: original_language || 'en',
                capturedFileBase64: image_base64,
                ocrText: image_text,
                image_url: uploadedImageUrl || finalTicket?.image_url || null
            };

            setAITicket(aiTicketObject);

            setTimeout(() => navigate('/ai-understanding'), 1000);

        } catch (error) {

            stopElapsedTimer();
            console.error("[AIProcessing] Analysis Failed:", error);

            // Handle explicit timeout / user cancellation
            if (error.name === 'AnalysisTimeoutError' || error.name === 'AbortError') {
                logTimeoutEvent('frontend_timeout', {
                    endpoint: '/ai/analyze_stream + analyzeTicketWithAI',
                    duration_ms: error.duration_ms ?? elapsedSeconds * 1000,
                    retry_count: retryCount,
                });
                setTimedOut(true);
                showToast(
                    'Analysis timed out. The request is taking longer than expected. Please retry.',
                    'warning',
                    8000
                );
                return; // Stay on this page — show retry UI
            }

            // Graceful fallback for any other error (e.g. backend 503 offline, streaming failed, or network protocol errors)
            if (
                true // Always fallback gracefully to keep the ticket creation flow 100% operational!
            ) {


                console.warn(
                    "[AIProcessing] Backend unreachable or preparing. Using local fallback."
                );

                let summary =
    (text.charAt(0).toUpperCase() + text.slice(1))
        .substring(0, 100)
    + (text.length > 100 ? '…' : '');
                let image_description = "";
                let fallbackCategory = "General";
                let fallbackSub = "General Support";
                let fallbackPriority = "Medium";
                let fallbackTeam = "General Support";

                try {
                    const aiResult = await analyzeTicketWithAI(text, image_text, image_base64);
                    summary = aiResult.summary || summary;
                    image_description = aiResult.image_description || "";
                    
                    if (aiResult.category) {
                        fallbackCategory = aiResult.category;
                        fallbackSub = aiResult.subcategory || fallbackSub;
                        fallbackPriority = aiResult.priority || fallbackPriority;
                        fallbackTeam = aiResult.assigned_team || fallbackTeam;
                    }
                } catch (aiErr) {
                    console.warn("[AIProcessing] Fallback AI summary failed:", aiErr);
                }

                const fallbackTicket = {
                    summary,
                    status: 'analyzing',
                    category: fallbackCategory,
                    subcategory: fallbackSub,
                    priority: fallbackPriority,
                    auto_resolve: false,
                    assigned_team: fallbackTeam,
                    entities: [],

                    duplicate_ticket: {
                        is_duplicate: false,
                        similarity: 0
                    },
                    confidence: 0.9,
                    needs_review: true,
                    reasoning:
                            "Analyzed via AI Fallback — backend ML model was unreachable.",
                    image_description,

                    ocr_text: image_text || "",
                    highlights: [],
                    originalIssue: original_text || text,
                    originalLanguage: original_language || 'en',
                    capturedFileBase64: image_base64,
                    ocrText: image_text,
                    image_url: null
                };

                setAITicket(fallbackTicket);

                setTimeout(
                    () => navigate('/ai-understanding'),
                    500
                );

            } else {

                showToast(
                    "AI Analysis sequence failed. Check network protocols.",
                    "error"
                );

                navigate('/create-ticket');
            }
        }
    }, [
        text, image_text, image_base64, navigate, setAITicket,
        settings, user, profile, showToast, retryCount,
        template_id, template_used, user_modified, ticket_title,
        original_text, original_language,
        startElapsedTimer, stopElapsedTimer, elapsedSeconds,
    ]);

    // ── Cancel in-flight request when the component unmounts ────────────────
    useEffect(() => {
        return () => {
            if (componentAbortRef.current) {
                componentAbortRef.current.abort();
            }
            stopElapsedTimer();
        };
    }, [stopElapsedTimer]);

    // ── Kick off analysis (or re-analysis on retry) ──────────────────────────
    useEffect(() => {
        if (!text) {
            console.warn("[AIProcessing] No ticket text found. Redirecting to /create-ticket");
            navigate('/create-ticket');
            return;
        }

        if (hasCalledAPI.current && retryCount === 0) return;
        hasCalledAPI.current = true;

        analyzeTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, retryCount]);

    // ── Retry handler ────────────────────────────────────────────────────────
    const handleRetry = () => {
        logTimeoutEvent('retry_attempt', {
            endpoint: '/ai/analyze_stream',
            retry_count: retryCount + 1,
        });
        setRetryCount((c) => c + 1);
    };

    // ── Timeout UI ───────────────────────────────────────────────────────────
    if (timedOut) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-[#f6f8f7] min-h-screen relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                <Card className="w-full max-w-md bg-white border border-gray-100 shadow-xl shadow-gray-200/40 rounded-3xl overflow-hidden relative z-10">
                    <div className="p-10 flex flex-col items-center text-center">

                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100 shadow-sm">
                            <Clock className="w-8 h-8 text-amber-500" />
                        </div>

                        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                            Request Timed Out
                        </h1>

                        <p className="text-sm font-medium text-gray-500 px-4 mb-2">
                            The analysis is taking longer than expected&nbsp;
                            <span className="text-amber-600 font-semibold">
                                ({Math.round(ANALYSIS_TIMEOUT_MS / 1000)}s limit reached)
                            </span>.
                        </p>

                        <p className="text-xs text-gray-400 mb-8 px-6">
                            This can happen with large image attachments or slow AI providers.
                            Your ticket data is preserved — no duplicate will be created on retry.
                        </p>

                        <button
                            id="retry-analysis-btn"
                            onClick={handleRetry}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-xl transition-all duration-200 shadow-md"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry Analysis
                        </button>

                        <button
                            id="cancel-analysis-btn"
                            onClick={() => navigate('/create-ticket')}
                            className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Cancel and go back
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    // ── Normal processing UI ─────────────────────────────────────────────────
    return (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#f6f8f7] min-h-screen relative overflow-hidden">

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <Card className="w-full max-w-md bg-white border border-gray-100 shadow-xl shadow-gray-200/40 rounded-3xl overflow-hidden relative z-10">

                <div className="p-10 flex flex-col items-center">

                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 shadow-sm relative">

                        <Bot className="w-8 h-8 text-emerald-600 relative z-10" />

                        <div
                            className="absolute inset-0 border-2 border-emerald-500/20 rounded-2xl animate-ping"
                            style={{ animationDuration: '2s' }}
                        ></div>

                    </div>

                    <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center mb-2">
                        Analyzing your issue
                    </h1>

                    <p className="text-sm font-medium text-gray-500 text-center px-4 mb-1">
                        Our AI is understanding your request and checking for solutions.
                    </p>

                    {/* Estimated time hint */}
                    <p className="text-xs text-gray-400 text-center px-4 mb-8">
                        Estimated time:&nbsp;
                        <span className="font-medium text-gray-500">
                            30–{ESTIMATED_SECONDS}s
                        </span>
                        {elapsedSeconds > 0 && (
                            <span className="ml-2 text-emerald-600 font-medium">
                                ({elapsedSeconds}s elapsed)
                            </span>
                        )}
                    </p>

                    <AIProcessingSteps
                        steps={steps}
                        activeStep={activeStep}
                    />

                </div>
            </Card>
        </div>
    );
};

export default AIProcessing;