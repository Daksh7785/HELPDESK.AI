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
import useTicketStore from "../../store/ticketStore";
import axios from 'axios';
import Tesseract from 'tesseract.js';
import { translateText, SUPPORTED_LANGUAGES } from '../../services/translationService';

const CreateTicket = () => {
    const [issue, setIssue] = useState('');
    const [file, setFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [extractedOCR, setExtractedOCR] = useState('');
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const addTicket = useTicketStore((state) => state.addTicket);
    const MAX_CHARS = 1000;
    const supportsSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langRef = useRef(null);

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
        if (!supportsSpeech) {
            setError('Speech Recognition is not supported in this browser. Please try Chrome or Edge.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError('');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                setIssue(prev => {
                    const newValue = prev ? prev + ' ' + finalTranscript : finalTranscript;
                    return newValue.substring(0, MAX_CHARS);
                });
            }
        };

        recognition.onerror = (event) => {
            console.error(event.error);
            setIsListening(false);
            if (event.error !== 'no-speech') {
                setError(`Microphone error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.error(e);
            }
        }
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
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                        <Sparkles size={18} className="fill-emerald-600" />
                                    </div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Workspace</span>
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
                                                onChange={(e) => setIssue(e.target.value.substring(0, MAX_CHARS))}
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
        </div>
    );
};

export default CreateTicket;
