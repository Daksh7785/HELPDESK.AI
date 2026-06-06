import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ListTodo, Sparkles } from 'lucide-react';

const WelcomeCard = ({ userName = "Ritesh" }) => {
    const navigate = useNavigate();

    return (
        <div
            id="tour-welcome"
            className="bg-white border-l-2 border-green-600 rounded-[20px] shadow-[0_2px_24px_rgba(0,0,0,0.06)] p-10 relative overflow-hidden"
        >
            {/* Badge */}
            <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 border border-green-200 rounded-full text-[11px] font-semibold tracking-wider px-3.5 py-1.5">
                    <Sparkles size={12} className="fill-green-600" />
                    AI-Enhanced Support
                </span>
            </div>

            {/* Heading */}
            <h2 className="font-syne text-[34px] font-extrabold text-gray-900 tracking-tight mb-2">
                Welcome back, {userName}
            </h2>

            {/* Description */}
            <p className="text-gray-500 text-[15px] max-w-[520px] mb-7 leading-relaxed">
                Our AI assistant is ready to help you. Most issues are analyzed and resolved in under 5 minutes.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
                <button
                    id="tour-create-ticket"
                    onClick={() => navigate('/create-ticket')}
                    className="inline-flex items-center gap-2 bg-gradient-to-br from-green-600 to-green-500 text-white rounded-xl px-6 py-3 font-semibold text-sm border-none cursor-pointer shadow-[0_4px_16px_rgba(34,160,69,0.3)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                    <PlusCircle size={18} />
                    Report New Issue
                </button>
                <button
                    onClick={() => navigate('/my-tickets')}
                    className="inline-flex items-center gap-2 bg-white text-green-700 border-2 border-green-100 rounded-xl px-6 py-3 font-semibold text-sm cursor-pointer transition-colors duration-200 hover:bg-green-50"
                >
                    <ListTodo size={18} />
                    View My Tickets
                </button>
            </div>
        </div>
    );
};

export default WelcomeCard;
