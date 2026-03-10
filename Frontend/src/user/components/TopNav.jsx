import React from 'react';
import { Bell, Box, CheckCircle2, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import useTicketStore from "../../store/ticketStore";
import NotificationPopover from "./NotificationPopover";

import useAuthStore from "../../store/authStore";

const TopNav = () => {
    const navigate = useNavigate();
    const { notifications = [], markNotificationsRead } = useTicketStore();
    const { profile } = useAuthStore();
    const initials = profile?.full_name ? profile.full_name[0].toUpperCase() : (profile?.email ? profile.email[0].toUpperCase() : 'U');

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between">
                {/* Left: Logo */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center overflow-hidden">
                        <img src="/favicon.png" alt="HELPDESK.AI Logo" className="w-7 h-7 object-contain" />
                    </div>
                    <h1 className="text-xl font-black tracking-tighter text-gray-900 italic">HELPDESK.AI</h1>
                </div>

                {/* Center: Navigation Links */}
                <nav className="hidden md:flex items-center gap-8">
                    <Link className="text-sm font-semibold text-gray-900 hover:text-emerald-600 transition-colors" to="/dashboard">Dashboard</Link>
                    <Link className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors" to="/my-tickets">My Tickets</Link>
                    <Link className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors" to="/help">Help</Link>
                </nav>

                {/* Right: Profile */}
                <div className="flex items-center gap-4">
                    <NotificationPopover />
                    <Avatar
                        onClick={() => navigate('/profile')}
                        className="size-9 border border-gray-200 cursor-pointer hover:ring-2 hover:ring-emerald-500 hover:ring-offset-2 transition-all"
                    >
                        <AvatarImage src={profile?.profile_picture} />
                        <AvatarFallback className="bg-gray-100 font-bold text-gray-600 text-xs">{initials}</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </header>
    );
};

export default TopNav;
