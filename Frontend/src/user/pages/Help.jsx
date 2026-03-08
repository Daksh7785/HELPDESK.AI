import React from 'react';
import { HelpCircle, Mail, MessageSquare, Book, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";

const Help = () => {
    const faqs = [
        {
            q: "How does the AI categorization work?",
            a: "When you submit a ticket, our AI analyzes the text and any uploaded screenshots to identify the core issue, categorize it, and assign it to the correct support team automatically."
        },
        {
            q: "Can I reopen a resolved ticket?",
            a: "Yes. If an issue reoccurs or the provided solution didn't fully resolve your problem, you can click 'Reopen Ticket' on the ticket detail page."
        },
        {
            q: "How do I check the status of my ticket?",
            a: "Navigate to the 'My Tickets' page from the top navigation. You can filter by status, priority, or search for specific tickets."
        }
    ];

    return (
        <div className="min-h-screen bg-[#f6f8f7] pb-20">
            <main className="pt-10 px-6 max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <HelpCircle className="text-emerald-600 w-8 h-8" /> Help & Support
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">
                        Find answers to common questions or get in touch with our team.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Cards */}
                    <Card className="rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white group">
                        <CardContent className="p-6 flex items-start gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                                <MessageSquare size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">Live Chat</h3>
                                <p className="text-sm text-gray-500 mt-1">Chat with our support bot or request a human agent.</p>
                            </div>
                            <ChevronRight className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white group">
                        <CardContent className="p-6 flex items-start gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                <Mail size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">Email Support</h3>
                                <p className="text-sm text-gray-500 mt-1">Send us a detailed message at support@helpdesk.ai.</p>
                            </div>
                            <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </CardContent>
                    </Card>
                </div>

                {/* FAQ Section */}
                <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Book className="w-5 h-5 text-gray-400" /> Frequently Asked Questions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {faqs.map((faq, index) => (
                            <div key={index} className="space-y-2">
                                <h4 className="font-bold text-gray-900">{faq.q}</h4>
                                <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

            </main>
        </div>
    );
};

export default Help;
