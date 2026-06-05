import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Settings, LogOut, UserCircle, X, PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationPopover from '../../user/components/NotificationPopover';
import ThemeToggle from '../../components/ThemeToggle';
import useAuthStore from '../../store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";

/**
 * AdminHeader Component
 * Refined 64px header for the administrative console.
 */
const AdminHeader = ({ onMobileNavToggle, isSidebarCollapsed, onToggleSidebar }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);
    const searchRef = useRef(null);
    const navigate = useNavigate();
    const { logout, profile: adminProfile } = useAuthStore();
    
    const initials = adminProfile?.full_name 
        ? adminProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() 
        : 'AD';

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/admin/tickets?q=${encodeURIComponent(searchQuery.trim())}`);
            searchRef.current?.blur();
        } else if (e.key === 'Escape') {
            setSearchQuery('');
            searchRef.current?.blur();
        }
    };

    const handleSearchClear = () => {
        setSearchQuery('');
        searchRef.current?.focus();
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-6 md:px-10 flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-4 flex-1">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={onMobileNavToggle}
                    className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                >
                    <Menu size={20} />
                </button>

                {/* Desktop Sidebar Toggle */}
                {onToggleSidebar && (
                    <button
                        onClick={onToggleSidebar}
                        className="hidden md:flex p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                )}

                {/* Primary Search Terminal */}
                <div className="flex-1 max-w-xl relative hidden md:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4 pointer-events-none" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search tickets, users… (press Enter)"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-9 py-2 text-sm font-medium tracking-tight focus:outline-none focus:ring-4 focus:ring-emerald-600/5 dark:focus:ring-emerald-400/5 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={handleSearchClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                            tabIndex={-1}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Header Operations */}
            <div className="flex items-center gap-4 lg:gap-6">
                <div className="relative border-r border-slate-200 dark:border-slate-800 pr-4 lg:pr-6 hidden sm:block">
                    <NotificationPopover isAdmin={true} />
                </div>

                <ThemeToggle />

                {/* Identity Access & Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 p-1.5 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all group"
                    >
                        <Avatar className="w-8 h-8 rounded-lg shadow-sm group-hover:scale-105 transition-transform">
                            <AvatarImage src={adminProfile?.profile_picture} className="object-cover" />
                            <AvatarFallback className="bg-slate-900 dark:bg-emerald-600 text-white font-black text-[10px] rounded-lg">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="hidden lg:flex items-center gap-1.5">
                            <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 tracking-widest leading-none uppercase italic">Admin</p>
                            <ChevronDown size={14} className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-none py-2 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-800 mb-1">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Signed in as</p>
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{adminProfile?.full_name}</p>
                            </div>
                            
                            <button
                                onClick={() => { navigate('/admin/profile'); setIsProfileOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            >
                                <UserCircle size={16} className="opacity-70" /> Profile
                            </button>
                            <button
                                onClick={() => { navigate('/admin/settings'); setIsProfileOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            >
                                <Settings size={16} className="opacity-70" /> Settings
                            </button>
                            
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                            
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <LogOut size={16} className="opacity-70" /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;