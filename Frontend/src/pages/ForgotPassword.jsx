import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { BrainCircuit, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email address");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setMessage("Check your email for the password reset link!");
        } catch (err) {
            console.error("Password reset error:", err);
            setError(err.message || "An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center font-sans bg-emerald-900 relative overflow-hidden p-6 py-12">
            {/* Background Patterns */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo Header */}
                <div className="flex justify-center mb-8">
                    <Link to="/" className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 transition hover:bg-white/20">
                        <BrainCircuit className="w-5 h-5 text-emerald-300" />
                        <span className="font-bold text-lg text-white">HelpDesk.ai</span>
                    </Link>
                </div>

                <div className="bg-white shadow-2xl shadow-emerald-900/50 rounded-3xl p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
                        <p className="text-gray-500 mt-1">No worries, we'll send you reset instructions.</p>
                    </div>

                    {message ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <p className="text-gray-900 font-bold text-lg mb-2">{message}</p>
                            <p className="text-gray-500 text-sm mb-8">If you don't see it, check your spam folder.</p>
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2 text-gray-500" />
                                Return to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3">
                                    <div className="bg-red-100 rounded-full p-1 mt-0.5 shrink-0">
                                        <ArrowLeft className="w-3 h-3 rotate-45" />
                                    </div>
                                    <p>{error}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Enter your system email"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-gray-800 placeholder:text-gray-400 font-medium bg-white"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-900 text-white rounded-xl py-3.5 font-bold hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] disabled:opacity-70 disabled:grayscale flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                            </button>

                            <div className="text-center pt-2">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-900 text-sm font-bold transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;
