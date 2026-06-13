import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Upload,
    X,
    ImageIcon,
    ArrowRight,
    Sparkles,
    BrainCircuit,
    AlertCircle,
    CheckCircle2,
    Clock,
    Mic,
    MicOff,
    Loader2,
    Volume2,
    Globe,
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import Tesseract from 'tesseract.js';
import { translateText, SUPPORTED_LANGUAGES } from '../../services/translationService';
import useAuthStore from '../../store/authStore';
import { api } from '../../services/api';

const CreateTicket = () => {
    const [issue, setIssue] = useState('');
    const [file, setFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [extractedOCR, setExtractedOCR] = useState('');
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const MAX_CHARS = 1000;
    const supportsSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langRef = useRef(null);

    // ── Smart Auto-Save & Draft Recovery state ──
    const { user } = useAuthStore();
    const userId = user?.id || 'anonymous';
    const [draftId, setDraftId] = useState(null);
    const [saveStatus, setSaveStatus] = useState(''); // 'saving' | 'saved' | ''
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [recoveryDraft, setRecoveryDraft] = useState(null);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [allDrafts, setAllDrafts] = useState([]);
    const [showDraftSwitcher, setShowDraftSwitcher] = useState(false);
    const draftSwitcherRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const autoSaveIntervalRef = useRef(null);

    // Voice UI states
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [interimVoice, setInterimVoice] = useState('');

    // Voice Refs & Visualizer
    const recognitionRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [visualizerData, setVisualizerData] = useState(new Array(16).fill(15));
    const streamRef = useRef(null);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (audioContextRef.current) audioContextRef.current.close();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
        };
    }, []);

    // ── On mount: run cleanup, check for existing drafts, show recovery modal ──
    useEffect(() => {
        api.cleanupDrafts(userId);
        const drafts = api.getDrafts(userId);
        setAllDrafts(drafts);
        if (drafts.length > 0) {
            setRecoveryDraft(drafts[0]);
            setShowRecoveryModal(true);
        }
    }, [userId]);

    // ── Close draft switcher on outside click ──
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (draftSwitcherRef.current && !draftSwitcherRef.current.contains(event.target)) {
                setShowDraftSwitcher(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Auto-save: 1s debounce on content change ──
    useEffect(() => {
        if (!isDirty) return;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        setSaveStatus('saving');
        autoSaveTimerRef.current = setTimeout(() => {
            performSave();
        }, 1000);
        return () => clearTimeout(autoSaveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [issue, selectedLanguage, isDirty]);

    // ── Auto-save: 10s interval fallback ──
    useEffect(() => {
        autoSaveIntervalRef.current = setInterval(() => {
            if (isDirty) performSave();
        }, 10000);
        return () => clearInterval(autoSaveIntervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDirty, issue, selectedLanguage, draftId]);

    const performSave = () => {
        const hasContent = issue.trim();
        if (!hasContent) return;
        const draftData = {
            draft_id: draftId,
            title: issue.substring(0, 80),
            issue,
            selectedLanguage,
        };
        const saved = api.saveDraft(userId, draftData);
        setDraftId(saved.draft_id);
        setLastSavedTime(new Date());
        setSaveStatus('saved');
        setIsDirty(false);
        setAllDrafts(api.getDrafts(userId));
    };

    const formatSaveTime = (date) => {
        if (!date) return '';
        const diffMs = Date.now() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        if (diffSec < 5) return 'just now';
        if (diffSec < 60) return `${diffSec}s ago`;
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        return `${diffHr}h ago`;
    };

    const handleRestoreDraft = (draft) => {
        setIssue(draft.issue || '');
        setSelectedLanguage(draft.selectedLanguage || 'en');
        setDraftId(draft.draft_id);
        setLastSavedTime(new Date(draft.updated_at));
        setSaveStatus('saved');
        setIsDirty(false);
        setShowRecoveryModal(false);
        setRecoveryDraft(null);
    };

    const handleDiscardDraft = (draftIdToDiscard) => {
        api.deleteDraft(userId, draftIdToDiscard || draftId);
        setAllDrafts(api.getDrafts(userId));
        if (draftIdToDiscard === draftId || !draftIdToDiscard) {
            setDraftId(null);
            setLastSavedTime(null);
            setSaveStatus('');
        }
        setShowRecoveryModal(false);
        setShowDiscardModal(false);
        setRecoveryDraft(null);
    };

    const handleLoadDraft = (draft) => {
        handleRestoreDraft(draft);
        setShowDraftSwitcher(false);
    };

    // Close language dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langRef.current && !langRef.current.contains(event.target)) {
                setIsLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Clean up preview URL on unmount
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const processOCR = async (imageFile) => {
        setIsOcrLoading(true);
        try {
            const { data: { text } } = await Tesseract.recognize(imageFile, 'eng');
            setExtractedOCR(text.trim());
        } catch (err) {
            console.error("OCR Failed:", err);
            // Non-fatal, just log it. Backend will still try if this fails.
        } finally {
            setIsOcrLoading(false);
        }
    };

    const toggleMic = () => {
        if (isListening) {
            stopListening();
            return;
        }
        startListening();
    };

    const startListening = async () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            setError("Speech recognition is not supported in this browser.");
            return;
        }

        try {
            // Start Visualizer for UI feedback
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 64;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserRef.current = analyser;
            dataArrayRef.current = dataArray;
            source.connect(analyser);

            const updateVisualizer = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                const bars = [];
                for (let i = 0; i < 16; i++) {
                    const val = dataArrayRef.current[i] || 0;
                    const height = Math.max(5, (val / 255) * 50);
                    bars.push(height);
                }
                setVisualizerData(bars);
                animationFrameRef.current = requestAnimationFrame(updateVisualizer);
            };
            updateVisualizer();

            // Initialize Speech Recognition
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let finalStr = '';
                let interimStr = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalStr += event.results[i][0].transcript;
                    } else {
                        interimStr += event.results[i][0].transcript;
                    }
                }
                if (finalStr) setVoiceTranscript(prev => prev + ' ' + finalStr);
                setInterimVoice(interimStr);
            };

            recognition.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                if (event.error !== 'no-speech') {
                    setError(`Microphone error: ${event.error}`);
                }
            };

            recognition.onend = () => {
                // Only stop visualizer if we actually intended to stop
                if (!isListening) {
                    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                }
            };

            recognitionRef.current = recognition;
            recognition.start();

            setIsListening(true);
            setShowVoiceModal(true);
            setVoiceTranscript('');
            setInterimVoice('');
            setError('');

        } catch (err) {
            console.error("Microphone access denied:", err);
            setError("Could not access microphone. Please ensure permissions are granted.");
        }
    };

    const stopListening = () => {
        setIsListening(false);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const handleSaveVoice = () => {
        stopListening();
        setIssue(prev => {
            const combined = prev + ' ' + voiceTranscript + ' ' + interimVoice;
            return combined.trim().substring(0, MAX_CHARS);
        });
        setShowVoiceModal(false);
    };

    const handleCancelVoice = () => {
        stopListening();
        setShowVoiceModal(false);
    };

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (selected && (selected.type === 'image/png' || selected.type === 'image/jpeg')) {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            setFile(selected);
            setImagePreview(URL.createObjectURL(selected));
            setError('');
            processOCR(selected);
        } else if (selected) {
            setError('Please upload only PNG or JPG images.');
        }
    };

    const removeFile = () => {
        setFile(null);
        setExtractedOCR('');
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && (droppedFile.type === 'image/png' || droppedFile.type === 'image/jpeg')) {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            setFile(droppedFile);
            setImagePreview(URL.createObjectURL(droppedFile));
            setError('');
            processOCR(droppedFile);
        }
    };

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!issue.trim()) {
            setError('Please describe your issue first.');
            return;
        }

        if (file && !isOcrLoading && !extractedOCR.trim()) {
            setError('No text could be extracted from the image. Please upload a clear screenshot containing text, or remove the image to continue.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            let textToSubmit = issue;

            // Translate to English if a different language is selected
            if (selectedLanguage !== 'en') {
                setIsTranslating(true);
                textToSubmit = await translateText(issue, selectedLanguage, 'en');
                setIsTranslating(false);
            }

            let imageBase64 = "";
            let extractedOCRText = extractedOCR;
            if (file) {
                imageBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result);
                    };
                    reader.readAsDataURL(file);
                });
            }

            // Navigate to AI Processing workflow where the API will be called
            // Clear the active draft on successful submission
            if (draftId) {
                api.deleteDraft(userId, draftId);
                setDraftId(null);
                setSaveStatus('');
            }

            navigate('/ai-processing', {
                state: {
                    text: textToSubmit,
                    original_text: issue,
                    original_language: selectedLanguage,
                    image_base64: imageBase64,
                    image_text: extractedOCRText
                }
            });

        } catch (err) {
            console.error(err);
            setError('Failed to submit ticket. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
        <div className="min-h-screen bg-[#f6f8f7] pb-20">
            <main className="pt-32 px-6">
                <div className="w-full max-w-2xl mx-auto">

                    {/* Left Column: User Input */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full"
                    >
                        <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 rounded-3xl bg-white overflow-hidden h-full flex flex-col">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                            <Sparkles size={18} className="fill-emerald-600" />
                                        </div>
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Workspace</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Save Status Indicator */}
                                        <AnimatePresence>
                                            {saveStatus === 'saving' && (
                                                <motion.span
                                                    key="saving"
                                                    initial={{ opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="text-xs font-semibold text-gray-400 flex items-center gap-1.5"
                                                >
                                                    <span className="w-3 h-3 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin inline-block" />
                                                    Saving...
                                                </motion.span>
                                            )}
                                            {saveStatus === 'saved' && (
                                                <motion.span
                                                    key="saved"
                                                    initial={{ opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 size={12} />
                                                    Saved {formatSaveTime(lastSavedTime)}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>

                                        {/* Draft Switcher */}
                                        {allDrafts.length > 0 && (
                                            <div className="relative" ref={draftSwitcherRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDraftSwitcher(!showDraftSwitcher)}
                                                    className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-all"
                                                >
                                                    <Clock size={12} />
                                                    Drafts ({allDrafts.length})
                                                    <ChevronDown size={12} className={`transition-transform ${showDraftSwitcher ? 'rotate-180' : ''}`} />
                                                </button>
                                                <AnimatePresence>
                                                    {showDraftSwitcher && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                                            animate={{ opacity: 1, y: 4, scale: 1 }}
                                                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                                            className="absolute right-0 top-full z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 overflow-hidden"
                                                        >
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2">Saved Drafts</p>
                                                            <div className="space-y-1">
                                                                {allDrafts.map((draft) => (
                                                                    <div key={draft.draft_id} className="flex items-center gap-2 px-2 group">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleLoadDraft(draft)}
                                                                            className="flex-1 text-left py-2 px-2 rounded-xl text-sm hover:bg-emerald-50 transition-all"
                                                                        >
                                                                            <p className="font-semibold text-gray-900 truncate">{draft.title || 'Untitled Draft'}</p>
                                                                            <p className="text-xs text-gray-400">{formatSaveTime(new Date(draft.updated_at))}</p>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDiscardDraft(draft.draft_id)}
                                                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="border-t border-gray-50 mt-2 pt-2 px-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setIssue('');
                                                                        setSelectedLanguage('en');
                                                                        setDraftId(null);
                                                                        setLastSavedTime(null);
                                                                        setSaveStatus('');
                                                                        setIsDirty(false);
                                                                        setShowDraftSwitcher(false);
                                                                    }}
                                                                    className="w-full text-xs text-center font-bold text-gray-400 hover:text-emerald-600 py-2 rounded-xl hover:bg-emerald-50 transition-all"
                                                                >
                                                                    + Start a New Draft
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <CardTitle className="text-3xl font-bold text-gray-900 tracking-tight">Report a New Issue</CardTitle>
                                <CardDescription className="text-base text-gray-500">
                                    Describe the problem and our AI will analyze it instantly.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-8 pt-2 flex-grow flex flex-col">
                                <form onSubmit={handleAnalyze} className="space-y-6 flex-grow flex flex-col">
                                    {/* Description Textarea */}
                                    <div className="space-y-2 flex-grow flex flex-col relative">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-gray-700">Describe your issue</label>
                                            <span className={`text-xs font-semibold ${issue.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
                                                {issue.length} / {MAX_CHARS}
                                            </span>
                                        </div>

                                        {/* Premium Language Selector */}
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Language:</label>
                                            <div className="relative flex-1" ref={langRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLangOpen(!isLangOpen)}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 flex items-center justify-between hover:bg-white hover:border-emerald-200 transition-all shadow-sm group"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Globe size={14} className="text-emerald-500" />
                                                        {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.label}
                                                    </span>
                                                    <motion.div
                                                        animate={{ rotate: isLangOpen ? 180 : 0 }}
                                                        className="text-gray-400 group-hover:text-emerald-500 transition-colors"
                                                    >
                                                        <ChevronDown size={16} />
                                                    </motion.div>
                                                </button>

                                                <AnimatePresence>
                                                    {isLangOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 5, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-emerald-900/10 p-2 overflow-hidden"
                                                        >
                                                            <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-1">
                                                                {SUPPORTED_LANGUAGES.map(lang => (
                                                                    <button
                                                                        key={lang.code}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedLanguage(lang.code);
                                                                            setIsLangOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between
                                                                            ${selectedLanguage === lang.code
                                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                                            }`}
                                                                    >
                                                                        {lang.label}
                                                                        {selectedLanguage === lang.code && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            {selectedLanguage !== 'en' && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-widest shadow-lg shadow-emerald-200"
                                                >
                                                    Translating
                                                </motion.span>
                                            )}
                                        </div>
                                        <div className="relative flex-grow flex flex-col">
                                            <Textarea
                                                value={issue}
                                                onChange={(e) => {
                                    setIssue(e.target.value.substring(0, MAX_CHARS));
                                    setIsDirty(true);
                                }}
                                                placeholder="Describe your problem. Example: VPN not connecting error 789"
                                                className="min-h-[160px] flex-grow rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-base p-4 resize-none"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    {/* Premium Voice Visualizer */}
                                    {supportsSpeech && (
                                        <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-6 shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl transition-colors duration-500 ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        <Mic size={20} className={isListening ? "animate-pulse" : ""} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900">Voice Assistant</h4>
                                                        <p className="text-xs text-gray-500 font-medium">{isListening ? "Listening to your voice..." : "Tap to describe via voice"}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={toggleMic}
                                                    className={`h-12 w-12 rounded-full flex items-center justify-center transition-all duration-500 border-none
                                                        ${isListening
                                                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 scale-110'
                                                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200'}`}
                                                >
                                                    {isListening ? <Volume2 className="animate-bounce" size={24} /> : <Mic size={24} />}
                                                </Button>
                                            </div>

                                            {/* Siri-style Wave Animation */}
                                            <AnimatePresence>
                                                {isListening && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 40 }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="flex items-center justify-center gap-1.5 mb-2 overflow-hidden"
                                                    >
                                                        {[...Array(12)].map((_, i) => (
                                                            <motion.div
                                                                key={i}
                                                                animate={{
                                                                    height: [10, 30, 10],
                                                                    backgroundColor: ['#10b981', '#3b82f6', '#10b981']
                                                                }}
                                                                transition={{
                                                                    duration: 0.8,
                                                                    repeat: Infinity,
                                                                    delay: i * 0.05,
                                                                    ease: "easeInOut"
                                                                }}
                                                                className="w-1 rounded-full bg-emerald-500"
                                                            />
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {isListening && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-emerald-50/50"
                                                >
                                                    <p className="text-sm text-emerald-800 font-medium italic">
                                                        "Speak clearly, our AI is transcribing..."
                                                    </p>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}

                                    {/* Screenshot Upload */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Screenshot (Optional)</label>

                                        <AnimatePresence mode="wait">
                                            {!imagePreview ? (
                                                <motion.div
                                                    key="dropzone"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onDragOver={handleDragOver}
                                                    onDrop={handleDrop}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="group relative h-40 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer flex flex-col items-center justify-center p-6"
                                                >
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileChange}
                                                        accept="image/png, image/jpeg"
                                                        className="hidden"
                                                    />
                                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                        <Upload className="text-emerald-500" size={20} />
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-600">Drag and drop or click to upload</p>
                                                    <p className="text-xs text-gray-400 mt-1">PNG or JPG up to 10MB</p>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="preview"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="relative rounded-2xl border border-gray-100 overflow-hidden bg-white p-4 items-center flex"
                                                >
                                                    <div className="flex items-center gap-4 w-full">
                                                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-50 shadow-inner shrink-0">
                                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{file?.name}</p>
                                                            <p className="text-sm font-medium text-gray-600 mt-1">
                                                                {(file?.size / 1024 / 1024).toFixed(2)} MB
                                                                {isOcrLoading && " • Extracting text..."}
                                                                {!isOcrLoading && extractedOCR && " • Text extracted"}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={removeFile}
                                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full shrink-0"
                                                        >
                                                            <X size={18} />
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                                            <AlertCircle size={16} />
                                            {error}
                                        </div>
                                    )}

                                    {/* Primary Submit Button */}
                                    <Button
                                        type="submit"
                                        disabled={isLoading || isOcrLoading || isTranslating || !issue.trim()}
                                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2 transition-all border-none shadow-emerald-200/50 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {(isLoading || isTranslating) ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                {isTranslating ? 'Translating...' : 'Submitting issue...'}
                                            </>
                                        ) : (
                                            <>
                                                Submit Ticket
                                                <ArrowRight size={20} />
                                            </>
                                        )}
                                    </Button>
                                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                                        <BrainCircuit size={14} />
                                        Powered by HelpDesk.ai Routing
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>

                </div>
            </main>

            {/* Premium Voice Modal Overlay */}
            <AnimatePresence>
                {showVoiceModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
                        >
                            <div className="p-6 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600">
                                        {isListening && (
                                            <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping"></span>
                                        )}
                                        <Mic size={20} className={isListening ? "animate-pulse" : ""} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 leading-tight">Live Dictation</h3>
                                        <p className="text-xs text-emerald-600 font-medium">{isListening ? "Listening..." : "Paused"}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCancelVoice}
                                    className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 min-h-[200px] max-h-[300px] overflow-y-auto relative">
                                <p className="text-gray-800 text-lg leading-relaxed font-medium">
                                    {voiceTranscript}
                                    <span className="text-gray-400"> {interimVoice}</span>
                                    {isListening && <span className="inline-block w-2 h-5 ml-1 align-middle bg-emerald-400 animate-pulse"></span>}
                                </p>
                                {!voiceTranscript && !interimVoice && (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium italic">
                                        Start speaking... we're listening.
                                    </div>
                                )}
                            </div>

                            {/* Siri-style Wave Animation */}
                            <AnimatePresence>
                                {isListening && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 60 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center justify-center gap-1.5 overflow-hidden bg-gray-50 border-t border-gray-100"
                                    >
                                        {[...Array(16)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    height: visualizerData[i] || 15,
                                                    backgroundColor: (visualizerData[i] || 15) > 30 ? '#10b981' : '#34d399'
                                                }}
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 300,
                                                    damping: 20
                                                }}
                                                className="w-1.5 rounded-full bg-emerald-400"
                                            />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="p-6 bg-gray-50 flex gap-4 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelVoice}
                                    className="flex-1 font-bold text-gray-600 border-gray-200 hover:bg-white h-12 rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSaveVoice}
                                    disabled={!voiceTranscript && !interimVoice}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-200"
                                >
                                    Insert Text
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

            {/* ── Draft Recovery Modal ── */}
            <AnimatePresence>
                {showRecoveryModal && recoveryDraft && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden"
                        >
                            <div className="p-6 bg-emerald-50/60 border-b border-emerald-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900 text-base">Draft Found</h3>
                                        <p className="text-xs text-emerald-600 font-semibold">Saved {formatSaveTime(new Date(recoveryDraft.updated_at))}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-600 font-medium mb-1">A saved draft was found:</p>
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <p className="text-sm font-bold text-gray-900 truncate">{recoveryDraft.title || 'Untitled Draft'}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{new Date(recoveryDraft.updated_at).toLocaleString()}</p>
                                </div>
                                <p className="text-xs text-gray-400 mt-3">Would you like to continue where you left off?</p>
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleDiscardDraft(recoveryDraft.draft_id)}
                                    className="flex-1 font-bold text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200 h-11 rounded-xl"
                                >
                                    Discard Draft
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleRestoreDraft(recoveryDraft)}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 rounded-xl border-none shadow-lg shadow-emerald-200"
                                >
                                    Restore Draft
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Discard Draft Confirmation Modal ── */}
            <AnimatePresence>
                {showDiscardModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden"
                        >
                            <div className="p-6">
                                <h3 className="font-black text-gray-900 text-base mb-2">Discard Draft?</h3>
                                <p className="text-sm text-gray-500 font-medium">This action cannot be undone. Your draft will be permanently deleted.</p>
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowDiscardModal(false)}
                                    className="flex-1 font-bold text-gray-600 border-gray-200 hover:bg-gray-50 h-11 rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleDiscardDraft(draftId)}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold h-11 rounded-xl border-none"
                                >
                                    Discard
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
    </>
    );
};

export default CreateTicket;
