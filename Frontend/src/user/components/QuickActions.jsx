import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Laptop, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent } from "../../components/ui/card";

const actions = [
    {
        title: "Network Issues",
        description: "Connectivity problems, VPN access, and slow internet.",
        category: "Network",
        icon: Network,
        color: "emerald"
    },
    {
        title: "Software Problems",
        description: "Application crashes, license issues, and installations.",
        category: "Software",
        icon: Laptop,
        color: "blue"
    },
    {
        title: "Access Requests",
        description: "Permission changes, new account setup, and MFA.",
        category: "Access",
        icon: ShieldCheck,
        color: "purple"
    }
];

const QuickActions = () => {
    const navigate = useNavigate();

    const handleActionClick = (category) => {
        navigate('/create-ticket', { state: { prefilledCategory: category } });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actions.map((action, index) => (
                <Card
                    key={index}
                    onClick={() => handleActionClick(action.category)}
                    className="group cursor-pointer border-none bg-white rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <CardContent className="p-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${action.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' :
                                action.color === 'blue' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' :
                                    'bg-purple-50 text-purple-600 group-hover:bg-purple-100'
                            }`}>
                            <action.icon size={24} />
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6">
                            {action.description}
                        </p>

                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 group-hover:translate-x-1 transition-transform">
                            Start Request
                            <ArrowRight size={16} />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default QuickActions;
