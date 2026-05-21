import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldOff,
    KeyRound,
    MailX,
    Printer,
    WifiOff,
    Download,
    X,
    Check,
    Sparkles,
} from 'lucide-react';
import TICKET_TEMPLATES from '../../data/ticketTemplates';

/**
 * Maps icon name strings from the template data to actual lucide-react components.
 */
const ICON_MAP = {
    ShieldOff,
    KeyRound,
    MailX,
    Printer,
    WifiOff,
    Download,
};

/**
 * Color palette for template cards — each template gets a distinct, harmonious color.
 */
const CARD_COLORS = {
    'vpn-connectivity': {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        activeBorder: 'border-amber-400',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-700',
    },
    'password-reset': {
        bg: 'bg-violet-50',
        border: 'border-violet-200',
        activeBorder: 'border-violet-400',
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
        badge: 'bg-violet-100 text-violet-700',
    },
    'email-access': {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        activeBorder: 'border-blue-400',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-700',
    },
    'printer-issue': {
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        activeBorder: 'border-rose-400',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-600',
        badge: 'bg-rose-100 text-rose-700',
    },
    'wifi-network': {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        activeBorder: 'border-emerald-400',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        badge: 'bg-emerald-100 text-emerald-700',
    },
    'software-installation': {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        activeBorder: 'border-indigo-400',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        badge: 'bg-indigo-100 text-indigo-700',
    },
};

/**
 * TemplateSelector — displays a grid of template cards above the ticket form.
 *
 * Props:
 *   selectedTemplateId  — currently selected template ID (or null)
 *   onSelectTemplate    — callback(templateObject) when a card is clicked
 *   onDismissTemplate   — callback() when the dismiss chip is clicked
 */
const TemplateSelector = ({ selectedTemplateId, onSelectTemplate, onDismissTemplate }) => {
    const selectedTemplate = TICKET_TEMPLATES.find((t) => t.id === selectedTemplateId);

    return (
        <div className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2">
                <div className="p-1 bg-emerald-100 text-emerald-600 rounded-md">
                    <Sparkles size={14} className="fill-emerald-600" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Start from a template
                </span>
                <span className="text-xs text-gray-300 font-medium">(optional)</span>
            </div>

            {/* Template cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TICKET_TEMPLATES.map((template) => {
                    const IconComponent = ICON_MAP[template.icon];
                    const colors = CARD_COLORS[template.id];
                    const isSelected = selectedTemplateId === template.id;

                    return (
                        <motion.button
                            key={template.id}
                            type="button"
                            onClick={() => onSelectTemplate(template)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className={`
                                relative group text-left p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer
                                ${isSelected
                                    ? `${colors.bg} ${colors.activeBorder} shadow-md`
                                    : `bg-white border-gray-100 hover:${colors.bg} hover:border-gray-200 shadow-sm hover:shadow-md`
                                }
                            `}
                        >
                            {/* Selected checkmark */}
                            <AnimatePresence>
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm"
                                    >
                                        <Check size={12} className="text-white" strokeWidth={3} />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Icon */}
                            <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors
                                    ${isSelected ? colors.iconBg : 'bg-gray-50 group-hover:' + colors.iconBg}
                                `}
                            >
                                {IconComponent && (
                                    <IconComponent
                                        size={18}
                                        className={`transition-colors ${isSelected ? colors.iconColor : 'text-gray-400 group-hover:' + colors.iconColor}`}
                                    />
                                )}
                            </div>

                            {/* Label */}
                            <p className="text-sm font-semibold text-gray-800 leading-tight mb-1.5">
                                {template.label}
                            </p>

                            {/* Category badge */}
                            <span
                                className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
                                    ${isSelected ? colors.badge : 'bg-gray-100 text-gray-500'}
                                `}
                            >
                                {template.category}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Active template dismiss chip */}
            <AnimatePresence>
                {selectedTemplate && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3.5 py-1.5">
                                <Check size={12} className="text-emerald-600" strokeWidth={3} />
                                <span className="text-xs font-bold text-emerald-700">
                                    Using: {selectedTemplate.label}
                                </span>
                                <button
                                    type="button"
                                    onClick={onDismissTemplate}
                                    className="ml-1 p-0.5 rounded-full text-emerald-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    aria-label="Dismiss template"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-gray-100"></div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                    or fill manually
                </span>
                <div className="flex-1 h-px bg-gray-100"></div>
            </div>
        </div>
    );
};

export default TemplateSelector;
