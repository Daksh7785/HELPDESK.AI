import React, { useState } from 'react';
import { Star, CheckCircle2, X, Loader2, MessageSquare } from 'lucide-react';

/**
 * CSATModal — shown when a ticket is resolved and no rating has been given yet.
 * 
 * Props:
 *  - ticketId: string
 *  - onSubmit: () => void — called after a rating is saved successfully
 *  - onDismiss: () => void — called if the user closes without rating
 */
export default function CSATModal({ ticketId, onSubmit, onDismiss }) {
    const [hovered, setHovered] = useState(0);
    const [selected, setSelected] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const userLang = navigator.language?.split('-')[0] || 'en';
    const translations = {
        en: { title: "How was your resolution?", subtitle: "Your ticket has been resolved. Please rate our support.", commentLabel: "Leave a comment", commentPlaceholder: "What went well? What could be better?", skip: "Remind Me Later", submit: "Submit Feedback", thanks: "Thank you!", thanksSub: "Your feedback helps us improve.", opt: "(optional)", rating: {1: 'Very Dissatisfied', 2: 'Dissatisfied', 3: 'Neutral', 4: 'Satisfied', 5: 'Very Satisfied'} },
        es: { title: "¿Qué tan satisfecho está con la resolución?", subtitle: "Su ticket ha sido resuelto. Califique nuestro soporte.", commentLabel: "Dejar un comentario", commentPlaceholder: "¿Qué salió bien? ¿Qué se podría mejorar?", skip: "Recordarme más tarde", submit: "Enviar comentarios", thanks: "¡Gracias!", thanksSub: "Sus comentarios nos ayudan a mejorar.", opt: "(opcional)", rating: {1: 'Muy Insatisfecho', 2: 'Insatisfecho', 3: 'Neutral', 4: 'Satisfecho', 5: 'Muy Satisfecho'} },
        fr: { title: "Dans quelle mesure êtes-vous satisfait de la résolution ?", subtitle: "Votre ticket est résolu. Veuillez évaluer notre support.", commentLabel: "Laissez un commentaire", commentPlaceholder: "Qu'est-ce qui s'est bien passé ? Qu'est-ce qui pourrait être amélioré ?", skip: "Plus tard", submit: "Soumettre", thanks: "Merci !", thanksSub: "Vos commentaires nous aident à nous améliorer.", opt: "(facultatif)", rating: {1: 'Très Insatisfait', 2: 'Insatisfait', 3: 'Neutre', 4: 'Satisfait', 5: 'Très Satisfait'} }
    };
    const t = translations[userLang] || translations.en;
    const ratingLabels = t.rating;

    const handleSubmit = async () => {
        if (!selected) { setError('Please select a rating.'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/csat/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticket_id: ticketId,
                    rating: selected,
                    comment: comment.trim() || null,
                    language: userLang
                })
            });
            if (!res.ok) throw new Error('Failed to submit');
            setSubmitted(true);
            setTimeout(() => { onSubmit?.(selected); }, 1800);
        } catch (err) {
            setError('Failed to submit. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemindLater = async () => {
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/csat/remind-later`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket_id: ticketId })
            });
        } catch (err) {
            console.error('Failed to set remind later', err);
        }
        onDismiss();
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                <div className="bg-white rounded-3xl shadow-2xl p-10 text-center w-full max-w-sm border border-gray-100">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t.thanks}</h3>
                    <p className="text-gray-500 text-sm">{t.thanksSub}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 p-6 text-white relative">
                    <button
                        onClick={onDismiss}
                        className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-sm border border-white/20">
                        <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">{t.title}</h3>
                    <p className="text-emerald-100/80 text-sm">{t.subtitle}</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Star Rating */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onMouseEnter={() => setHovered(star)}
                                    onMouseLeave={() => setHovered(0)}
                                    onClick={() => { setSelected(star); setError(''); }}
                                    className="transition-all duration-200"
                                    style={{ transform: hovered === star ? 'scale(1.2)' : 'scale(1)' }}
                                >
                                    <Star
                                        className={`w-9 h-9 transition-all duration-300 ${star <= (hovered || selected)
                                                ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                                                : 'text-gray-200 fill-gray-200'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        {(hovered || selected) > 0 && (
                            <p className="text-sm font-semibold text-gray-700 transition-all">
                                {ratingLabels[hovered || selected]}
                            </p>
                        )}
                    </div>

                    {/* Optional Comment */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4" />
                            {t.commentLabel} <span className="text-gray-400 font-normal">{t.opt}</span>
                        </label>
                        <textarea
                            rows={3}
                            placeholder={t.commentPlaceholder}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none text-gray-800 placeholder:text-gray-400 transition-all"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm font-medium">{error}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleRemindLater}
                            className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            {t.skip}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-2 flex-grow py-3 bg-emerald-900 text-white text-sm font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {t.submit}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
