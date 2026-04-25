import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Inbox,
    Users,
    BarChart3,
    UserCircle,
    Settings,
    LogOut,
    Activity
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const AdminSidebar = ({ isMobile, onClose }) => {
    const navItems = [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Tickets', path: '/admin/tickets', icon: Inbox },
        { label: 'Users', path: '/admin/users', icon: Users },
        { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
        { label: 'Profile', path: '/admin/profile', icon: UserCircle },
    ];

    const { logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <aside 
            className={`${isMobile ? 'w-full h-full' : 'md:w-20 lg:w-[260px] fixed left-0 top-0 h-full'} z-40 transition-all duration-300 overflow-hidden flex flex-col`}
            style={{
                background: '#ffffff',
                borderRight: '1px solid #f0fdf4',
                boxShadow: '2px 0 12px rgba(0,0,0,0.04)'
            }}
        >
            {/* Logo Section */}
            <div className="p-6 lg:p-8 border-b border-gray-50 flex justify-center lg:justify-start">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>
                        <Activity size={20} color="#ffffff" />
                    </div>
                    <div className="hidden lg:block animate-in fade-in duration-500">
                        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#0f1f12', fontSize: '20px', letterSpacing: '-0.02em', lineHeight: 1 }}>
                            HELPDESK.AI
                        </h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Admin Console</p>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
                {!isMobile && (
                    <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#9ca3af', fontWeight: 600, paddingLeft: '14px', marginBottom: '16px' }} className="hidden lg:block uppercase">
                        CORE MODULES
                    </p>
                )}
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={isMobile ? onClose : undefined}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '12px',
                            borderRadius: '10px', padding: '9px 14px',
                            color: isActive ? '#15803d' : '#6b7280',
                            background: isActive ? '#f0fdf4' : 'transparent',
                            fontWeight: isActive ? 600 : 500,
                            textDecoration: 'none', transition: 'all 0.2s ease',
                            justifyContent: isMobile || window.innerWidth < 1024 ? 'center' : 'flex-start'
                        })}
                        className="group hover:bg-gray-50"
                    >
                        <item.icon size={20} className="shrink-0 transition-transform group-hover:scale-110" />
                        <span className="hidden lg:block text-sm tracking-tight truncate animate-in fade-in slide-in-from-left-2 duration-300">
                            {item.label}
                        </span>

                        {/* Tooltip for collapsed mode (simple title) */}
                        {!isMobile && (
                            <div className="lg:hidden absolute left-20 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-gray-800 ml-2 shadow-lg">
                                {item.label}
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Profile / Logout Shortcut */}
            <div className="p-4 lg:p-6 border-t border-gray-50 space-y-2 pb-10 flex flex-col items-center lg:items-stretch">
                <NavLink
                    to="/admin/settings"
                    onClick={isMobile ? onClose : undefined}
                    style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: '12px',
                        borderRadius: '10px', padding: '9px 14px',
                        color: isActive ? '#15803d' : '#6b7280',
                        background: isActive ? '#f0fdf4' : 'transparent',
                        fontWeight: isActive ? 600 : 500,
                        textDecoration: 'none', transition: 'all 0.2s ease',
                        justifyContent: isMobile || window.innerWidth < 1024 ? 'center' : 'flex-start'
                    })}
                    className="group hover:bg-gray-50"
                >
                    <Settings size={20} className="shrink-0 group-hover:rotate-45 transition-transform duration-300" />
                    <span className="hidden lg:block text-sm tracking-tight animate-in fade-in duration-300">Settings</span>
                </NavLink>

                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        borderRadius: '10px', padding: '9px 14px',
                        color: '#6b7280', background: 'transparent',
                        fontWeight: 500, border: 'none', cursor: 'pointer',
                        transition: 'all 0.2s ease', width: '100%',
                        justifyContent: isMobile || window.innerWidth < 1024 ? 'center' : 'flex-start'
                    }}
                    className="group hover:bg-red-50 hover:text-red-600"
                >
                    <LogOut size={20} className="shrink-0 group-hover:translate-x-1 transition-transform" />
                    <span className="hidden lg:block text-sm tracking-tight animate-in fade-in duration-300">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;

