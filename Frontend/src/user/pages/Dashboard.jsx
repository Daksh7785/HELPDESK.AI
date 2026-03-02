import React from 'react';
import WelcomeCard from "../components/WelcomeCard";
import QuickActions from "../components/QuickActions";
import RecentTickets from "../components/RecentTickets";
import OnboardingTour from "../components/OnboardingTour";

import useAuthStore from "../../store/authStore";

const Dashboard = () => {
    const { profile } = useAuthStore();
    const userName = profile?.full_name || "Guest";

    return (
        <div
            className="min-h-screen pb-20 relative"
            style={{
                background: `
                    radial-gradient(circle at top right, rgba(19,236,146,0.08), transparent 60%),
                    linear-gradient(180deg, #f8faf9 0%, #f3f6f4 100%)
                `,
                backgroundAttachment: 'fixed'
            }}
        >

            <main className="pt-24 px-6 md:px-10">
                <div className="w-full max-w-[1100px] mx-auto flex flex-col gap-8">
                    {/* Hero Section */}
                    <section>
                        <WelcomeCard userName={userName} />
                    </section>

                    {/* Quick Actions Grid */}
                    <section id="tour-quick-actions">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Quick Support Actions</h2>
                        </div>
                        <QuickActions />
                    </section>

                    {/* Recent Activity Table */}
                    <section id="tour-recent-tickets">
                        <RecentTickets />
                    </section>

                    {/* Footer Info */}
                    <footer className="mt-8 text-center">
                        <p className="text-xs text-gray-400 font-medium tracking-tight">
                            &copy; 2026 Emerald Helpdesk. All systems operational.
                        </p>
                    </footer>
                </div>
            </main>
            <OnboardingTour />
        </div>
    );
};

export default Dashboard;
