import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Bug, Lightbulb, X, Loader2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import useAuthStore from '../../store/authStore';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';

export default function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState('bug'); // 'bug', 'improvement', 'other'
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const location = useLocation();
    const { profile } = useAuthStore();
    const { toast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);

        try {
            const { error } = await supabase.from('user_feedback').insert([
                {
                    user_id: profile?.id || null, // null for anonymous/login page
                    user_email: profile?.email || null,
                    user_role: profile?.role || 'anonymous',
                    type,
                    message: message.trim(),
                    url: location.pathname + location.search,
                },
            ]);

            if (error) throw error;

            toast({
                title: "Feedback Submitted!",
                description: "Thank you for helping us improve HELPDESK.AI.",
                variant: "default",
            });

            // Reset & Close
            setMessage('');
            setIsOpen(false);
        } catch (err) {
            console.error("Feedback submission error:", err);
            toast({
                title: "Submission Failed",
                description: "There was an issue saving your feedback. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed bottom-6 left-6 z-[100]">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 hover:shadow-emerald-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                        <MessageSquare className="h-6 w-6" />
                    </motion.button>
                </PopoverTrigger>

                <PopoverContent
                    side="top"
                    align="start"
                    sideOffset={16}
                    className="w-80 p-0 overflow-hidden shadow-2xl border-emerald-100"
                >
                    {/* Header */}
                    <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-gray-900">Send Feedback</h3>
                            <p className="text-xs text-emerald-600 mt-0.5">Let us know how we can improve.</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 bg-white space-y-4">
                        {/* Type Selection */}
                        <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
                            <button
                                type="button"
                                onClick={() => setType('bug')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${type === 'bug'
                                    ? 'bg-white text-red-600 shadow-sm border border-gray-200'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Bug className="h-3.5 w-3.5" />
                                Bug
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('improvement')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${type === 'improvement'
                                    ? 'bg-white text-emerald-600 shadow-sm border border-gray-200'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <Lightbulb className="h-3.5 w-3.5" />
                                Idea
                            </button>
                        </div>

                        {/* Message Area */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700 px-1">
                                Your thoughts
                            </label>
                            <Textarea
                                placeholder={type === 'bug' ? "What went wrong?" : "What could be better?"}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="resize-none min-h-[100px] text-sm focus-visible:ring-emerald-500 border-gray-200"
                                required
                            />
                        </div>

                        {/* Context Info (Visual Only) */}
                        <div className="text-[10px] text-gray-400 px-1 flex items-center justify-between">
                            <span>Capturing current page info</span>
                            <span className="truncate max-w-[120px]">{location.pathname}</span>
                        </div>

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isSubmitting || !message.trim()}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send {type === 'bug' ? 'Report' : 'Feedback'}
                                </>
                            )}
                        </Button>
                    </form>
                </PopoverContent>
            </Popover>
        </div>
    );
}
