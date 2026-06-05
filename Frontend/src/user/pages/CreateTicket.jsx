import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Upload, X, ArrowRight, Sparkles, BrainCircuit,
    AlertCircle, CheckCircle2, Mic, Volume2, Globe, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
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
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const MAX_CHARS = 1000;
    const supportsSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langRef = useRef(null);

    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [interimVoice, setInterimVoice] = useState('');

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
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langRef.current && !langRef.current.contains(event.target)) {
                setIsLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        <div className="min-h-screen bg-slate-950 pb-20 relative overflow-hidden font-sans">
            {/* Ambient Background Matrix */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]" 
                 style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

            <main className="pt-32 px-4 sm:px-6 relative z-10">
                <div className="w-full max-w-2xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full text-left"
                    >
                        <Card className="rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl flex flex-col">
                            <CardHeader className="p-6 sm:p-8 pb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                                        <Sparkles size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-0.5">Workspace Node</span>
                                </div>
                                <CardTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight font-syne uppercase">Report a New Issue</CardTitle>
                                <CardDescription className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed">
                                    Describe the boundary exceptions and the automated heuristic pipeline will execute real-time triage.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="p-6 sm:p-8 pt-2 flex-grow flex flex-col">
                                <form onSubmit={handleAnalyze} className="space-y-6 flex-grow flex flex-col">
                                    
                                    {/* Language Context Block */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-0.5">Describe your issue</label>
                                            <span className={`font-mono text-xs font-bold ${issue.length >= MAX_CHARS ? 'text-rose-500' : 'text-slate-600'}`}>
                                                {issue.length} / {MAX_CHARS}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0 ml-1">Payload Language:</label>
                                            <div className="relative flex-1" ref={langRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLangOpen(!isLangOpen)}
                                                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 h-11 text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between hover:border-emerald-500/30 transition-all shadow-inner group cursor-pointer"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Globe size={14} className="text-emerald-400" />
                                                        {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.label}
                                                    </span>
                                                    <motion.div
                                                        animate={{ rotate: isLangOpen ? 180 : 0 }}
                                                        className="text-slate-500 group-hover:text-emerald-400 transition-colors"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </motion.div>
                                                </button>

                                                <AnimatePresence>
                                                    {isLangOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 5, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            className="absolute z-50 top-full left-0 right-0 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl p-2 overflow-hidden text-left"
                                                        >
                                                            <div className="max-h-[200px] overflow-y-auto customize-scrollbar space-y-1">
                                                                {SUPPORTED_LANGUAGES.map(lang => (
                                                                    <button
                                                                        key={lang.code}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedLanguage(lang.code);
                                                                            setIsLangOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-between border-none bg-transparent cursor-pointer
                                                                            ${selectedLanguage === lang.code
                                                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                                                            }`}
                                                                    >
                                                                        <span>{lang.label}</span>
                                                                        {selectedLanguage === lang.code && <CheckCircle2 size={14} className="text-emerald-400" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            {selectedLanguage !== 'en' && (
                                                <motion.span
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="text-[9px] bg-emerald-500 text-slate-950 px-2.5 h-6 rounded-full font-black uppercase tracking-widest flex items-center shadow-lg shadow-emerald-500/10"
                                                >
                                                    Translating
                                                </motion.span>
                                            )}
                                        </div>

                                        <div className="relative flex-grow flex flex-col">
                                            <Textarea
                                                value={issue}
                                                onChange={(e) => setIssue(e.target.value.substring(0, MAX_CHARS))}
                                                placeholder="Describe transaction anomalies or layout constraints. Example: LDAP verification timeout block error code 503."
                                                className="min-h-[160px] flex-grow rounded-2xl border-white/10 bg-white/[0.01] text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm p-4 resize-none leading-relaxed font-medium shadow-inner"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    {/* Voice Signal Input Section */}
                                    {supportsSpeech && (
                                        <div className="relative overflow-hidden rounded-3xl border border-white/[0.05] bg-white/[0.01] p-5 shadow-inner">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3.5 text-left">
                                                    <div className={`p-2.5 rounded-xl transition-colors duration-500 ${isListening ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                                                        <Mic size={18} className={isListening ? "animate-pulse" : ""} />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <h4 className="text-sm font-extrabold text-white font-syne uppercase tracking-wider m-0">Voice Input Matrix</h4>
                                                        <p className="text-xs text-slate-500 font-medium m-0">{isListening ? "Streaming real-time audio..." : "Describe parameters via speech"}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={toggleMic}
                                                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-500 border-none shrink-0 cursor-pointer
                                                        ${isListening
                                                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/10'
                                                            : 'bg-emerald-600 hover:bg-emerald-50 text-slate-950 font-bold shadow-lg shadow-emerald-600/10'}`}
                                                >
                                                    {isListening ? <Volume2 className="animate-bounce text-white" size={18} /> : <Mic size={18} />}
                                                </Button>
                                            </div>

                                            <AnimatePresence>
                                                {isListening && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 32 }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="flex items-center justify-center gap-1 mt-4 overflow-hidden"
                                                    >
                                                        {[...Array(12)].map((_, i) => (
                                                            <motion.div
                                                                key={i}
                                                                animate={{
                                                                    height: [8, 24, 8],
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
                                        </div>
                                    )}

                                    {/* Dropzone Attachment Bounding Area */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-0.5">Telemetry Frame Attachment</label>

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
                                                    className="group relative h-36 border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.01] hover:bg-emerald-500/[0.02] hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center shadow-inner"
                                                >
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileChange}
                                                        accept="image/png, image/jpeg"
                                                        className="hidden"
                                                    />
                                                    <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md">
                                                        <Upload className="text-emerald-400" size={16} />
                                                    </div>
                                                    <p className="text-sm font-extrabold text-slate-300 font-syne uppercase tracking-wider m-0">Uplink System Screenshot</p>
                                                    <p className="text-xs text-slate-500 font-medium mt-1 m-0">PNG or JPG block array up to 10MB</p>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="preview"
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.98 }}
                                                    className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-4 items-center flex gap-4 text-left shadow-2xl"
                                                >
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/5 shadow-inner shrink-0 bg-black">
                                                        <img src={imagePreview} alt="Attached vector mapping payload" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-0.5">
                                                        <p className="text-sm font-bold text-white truncate m-0">{file?.name}</p>
                                                        <p className="text-xs font-medium text-slate-400 m-0">
                                                            {(file?.size / 1024 / 1024).toFixed(2)} MB
                                                            {isOcrLoading && " • Executing OCR Text Extraction..."}
                                                            {!isOcrLoading && extractedOCR && " • OCR ingestion token mapped"}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={removeFile}
                                                        className="text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded-full shrink-0 h-9 w-9 p-0 bg-transparent border-none cursor-pointer"
                                                    >
                                                        <X size={16} />
                                                    </Button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Action Failure System Warning Logs */}
                                    <AnimatePresence mode="wait">
                                        {error && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs font-bold uppercase tracking-wide leading-snug overflow-hidden text-left"
                                            >
                                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                                <p className="m-0">{error}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Submission Execution Node */}
                                    <Button
                                        type="submit"
                                        disabled={isLoading || isOcrLoading || isTranslating || !issue.trim()}
                                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/10 active:scale-[0.99] transition-all border-none cursor-pointer uppercase tracking-wider disabled:opacity-20"
                                    >
                                        {(isLoading || isTranslating) ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>{isTranslating ? 'Executing translation mapping...' : 'Transmitting core payload...'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Deploy Pipeline Triage</span>
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </Button>
                                    
                                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 select-none">
                                        <BrainCircuit size={14} />
                                        <span>Autonomous HelpDesk.ai Core Optimization Engine</span>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>

            {/* Modal dictation module overlay layer view */}
            <AnimatePresence>
                {showVoiceModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 15 }}
                            className="w-full max-w-lg bg-slate-950 border border-white/[0.08] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col text-left"
                        >
                            <div className="p-6 bg-white/[0.01] border-b border-white/[0.05] flex items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        {isListening && (
                                            <span className="absolute inset-0 rounded-xl border-2 border-emerald-500/30 animate-ping" />
                                        )}
                                        <Mic size={18} className={isListening ? "animate-pulse" : ""} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="font-extrabold text-white text-base font-syne uppercase tracking-wider m-0">Live Dictation Stream</h3>
                                        <p className="text-xs text-emerald-400 font-black uppercase tracking-widest m-0">{isListening ? "Active Channel" : "Stream Bypassed"}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCancelVoice}
                                    className="p-2 text-slate-500 hover:bg-white/5 hover:text-white rounded-full transition-all border-none bg-transparent cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-8 min-h-[180px] max-h-[280px] overflow-y-auto customize-scrollbar relative bg-black/20 shadow-inner">
                                <p className="text-slate-200 text-lg leading-relaxed font-medium m-0 font-sans">
                                    {voiceTranscript}
                                    <span className="text-slate-600 font-medium"> {interimVoice}</span>
                                    {isListening && <span className="inline-block w-1.5 h-4 ml-1.5 align-middle bg-emerald-400 animate-pulse" />}
                                </p>
                                {!voiceTranscript && !interimVoice && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm font-medium italic">
                                        Awaiting verbal payload blocks...
                                    </div>
                                )}
                            </div>

                            {/* Siri-style Audio Pulse Stream Visualizer */}
                            <AnimatePresence>
                                {isListening && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 50 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center justify-center gap-1 overflow-hidden bg-black/40 border-t border-white/[0.03] shadow-inner shrink-0"
                                    >
                                        {[...Array(16)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    height: visualizerData[i] || 12,
                                                    backgroundColor: (visualizerData[i] || 12) > 30 ? '#10b981' : '#34d399'
                                                }}
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 300,
                                                    damping: 20
                                                }}
                                                className="w-1 rounded-full bg-emerald-500"
                                            />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="p-5 bg-white/[0.01] flex gap-4 border-t border-white/[0.05]">
                                <Button
                                    type="button"
                                    onClick={handleCancelVoice}
                                    className="flex-1 h-12 border border-white/10 text-slate-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-white/5 transition-all cursor-pointer bg-transparent"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSaveVoice}
                                    disabled={!voiceTranscript && !interimVoice}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl shadow-xl shadow-emerald-600/10 border-none cursor-pointer text-xs uppercase tracking-wider disabled:opacity-20"
                                >
                                    Inject Payload
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
                .customize-scrollbar::-webkit-scrollbar { width: 4px; }
                .customize-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .customize-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 99px; }
            `}} />
        </div>
    );
};

export default CreateTicket;

