import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ListTodo, Sparkles } from 'lucide-react';
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";

const WelcomeCard = ({ userName = "Ritesh" }) => {
    const navigate = useNavigate();

    return (
        <Card id="tour-welcome" className="relative overflow-hidden border-none rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 to-white">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50/30 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

            <CardHeader className="relative pt-8 px-8 pb-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 px-3 bg-emerald-100 text-emerald-600 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-emerald-200/50">
                        <Sparkles size={12} className="fill-emerald-600" />
                        AI-Enhanced Support
                    </div>
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900 tracking-tight">
                    Welcome back, {userName}
                </CardTitle>
                <CardDescription className="text-base text-gray-500 max-w-lg mt-2">
                    Our AI assistant is ready to help you. Most issues are analyzed and resolved in under 5 minutes.
                </CardDescription>
            </CardHeader>

            <CardContent className="relative px-8 pb-8 pt-2">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                        id="tour-create-ticket"
                        onClick={() => navigate('/create-ticket')}
                        className="h-12 px-6 bg-[#13ec92] hover:bg-[#11d683] text-gray-900 font-semibold rounded-xl flex items-center gap-2 transition-all border-none scale-100 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <PlusCircle size={20} />
                        Report New Issue
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/my-tickets')}
                        className="h-12 px-6 border-gray-100 bg-white hover:bg-gray-50 text-gray-600 font-semibold rounded-xl flex items-center gap-2 transition-all border shadow-sm hover:shadow-md scale-100 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <ListTodo size={20} />
                        View My Tickets
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default WelcomeCard;
