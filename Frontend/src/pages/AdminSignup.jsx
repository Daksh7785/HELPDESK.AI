import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Eye, EyeOff, BrainCircuit, ArrowRight,
    Loader2, CheckCircle2, ChevronRight,
    ChevronLeft, ShieldCheck, Mail,
    Building2, User, Lock, Phone,
    Briefcase, Globe, Info
} from "lucide-react";
import useAuthStore from "../store/authStore";
import { Select } from "../components/ui/select";

function AdminSignup() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        jobTitle: "",
        password: "",
        confirmPassword: "",
        companyName: "",
        companySize: "",
        industry: "",
        website: "",
        country: "",
        agreedToTerms: false,
        isAuthorized: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const navigate = useNavigate();
    const { signup, loading, user, profile } = useAuthStore();

    useEffect(() => {
        if (user && profile && profile.status === 'active') {
            navigate(profile.role === 'admin' ? "/admin/dashboard" : "/dashboard");
        }
    }, [user, profile, navigate]);

    const validatePassword = (pw) => {
        if (pw.length < 8) return 'Password must be at least 8 characters long.';
        if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter (a-z).';
        if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter (A-Z).';
        if (!/[0-9]/.test(pw)) return 'Password must contain at least one number (0-9).';
        return null;
    };

    useEffect(() => {
        const pw = formData.password;
        let strength = 0;
        if (pw.length >= 8) strength += 25;
        if (/[A-Z]/.test(pw)) strength += 25;
        if (/[0-9]/.test(pw)) strength += 25;
        if (/[^A-Za-z0-9]/.test(pw)) strength += 25;
        setPasswordStrength(strength);
    }, [formData.password]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
        setError("");
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
                setError("Please fill in all required personal information.");
                return;
            }
            const pwError = validatePassword(formData.password);
            if (pwError) {
                setError(pwError);
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
        } else if (step === 2) {
            if (!formData.companyName || !formData.companySize || !formData.industry || !formData.country) {
                setError("Please fill in all required company details.");
                return;
            }
        }
        setStep(prev => prev + 1);
        setError("");
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
        setError("");
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.agreedToTerms || !formData.isAuthorized) {
            setError("You must agree to the terms and authorize company registration.");
            return;
        }

        try {
            await signup(
                formData.email,
                formData.password,
                formData.fullName,
                'admin',
                formData.companyName,
                {
                    phone: formData.phone,
                    job_title: formData.jobTitle,
                    company_size: formData.companySize,
                    industry: formData.industry,
                    website: formData.website,
                    country: formData.country,
                },
                window.location.origin + '/login'
            );

            const updatedProfile = useAuthStore.getState().profile;

            if (updatedProfile?.status === 'pending_approval') {
                navigate('/admin-lobby');
            } else {
                setIsSubmitted(true);
                window.scrollTo(0, 0);
            }
        } catch (err) {
            console.error("Admin signup failed:", err);
            let errMsg = err.message || "Signup failed. Please try again.";
            if (errMsg.toLowerCase().includes("failed to fetch")) {
                errMsg = "Network Error: Failed to fetch. This usually happens if your browser's ad-blocker (like Brave Shields, uBlock Origin, etc.) is blocking Supabase requests. Please try disabling your ad-blocker for this site and refresh!";
            }
            setError(errMsg);
        }
    };

    const getStrengthColor = () => {
        if (passwordStrength <= 25) return "bg-red-500";
        if (passwordStrength <= 50) return "bg-orange-500";
        if (passwordStrength <= 75) return "bg-yellow-500";
        return "bg-emerald-500";
    };

    const getStrengthText = () => {
        if (passwordStrength <= 25) return "Weak";
        if (passwordStrength <= 50) return "Fair";
        if (passwordStrength <= 75) return "Good";
        return "Strong";
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-green-50 via-green-100/40 to-green-200 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-950 transition-colors duration-300">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none bg-radial from-emerald-500/10 dark:from-emerald-500/5 to-transparent blur-3xl" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 max-w-lg w-full text-center relative z-10 shadow-xl dark:shadow-black/30 border border-green-50 dark:border-slate-700/60 transition-colors duration-300"
                >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30">
                        <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="font-syne text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">Check Your Email</h2>
                    <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
                        Registration request received! We've sent a verification link to <span className="font-bold text-emerald-600 dark:text-emerald-400">{formData.email}</span>.
                    </p>
                    <div className="rounded-2xl p-5 sm:p-6 text-left mb-8 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Next Steps:
                        </h4>
                        <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                            <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400 font-bold">1.</span> Verify your email by clicking the link in our message.</li>
                            <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400 font-bold">2.</span> Your request will be reviewed by our Master Admin.</li>
                            <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400 font-bold">3.</span> You'll receive a final confirmation once approved.</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl py-4 text-sm sm:text-base font-semibold shadow-lg shadow-emerald-500/20 hover:translate-y-[-1px] active:translate-y-[0px] transition-all duration-200 cursor-pointer border-none"
                    >
                        Return to Login
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-slate-900 transition-colors duration-300">

            {/* Left Side: Branding/Hero */}
            <div className="hidden lg:flex w-5/12 items-center justify-center p-12 xl:p-16 relative overflow-hidden bg-gradient-to-br from-green-50 via-green-100/50 to-green-200 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-950 transition-colors duration-300">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none bg-radial from-emerald-500/10 dark:from-emerald-500/5 to-transparent blur-3xl" />

                <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 font-medium text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group">
                    <div className="p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm group-hover:border-emerald-500/30">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span>Back to Home</span>
                </Link>

                <div className="relative z-10 w-full max-w-md">
                    <div className="p-3 rounded-2xl w-fit mb-8 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-100 dark:border-emerald-900/30 cursor-pointer" onClick={() => navigate('/')}>
                        <BrainCircuit className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] tracking-widest uppercase mb-4">Enterprise Edition</p>
                    <h1 className="font-syne text-4xl xl:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-10">
                        Scale your <span className="text-emerald-600 dark:text-emerald-400">IT Support</span> globally.
                    </h1>

                    <div className="space-y-8">
                        {[{
                            icon: <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
                            title: 'Company-wide Isolation',
                            desc: 'Secure data siloing for departments and multiple office locations.'
                        }, {
                            icon: <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
                            title: 'Custom Dashboards',
                            desc: 'Tailored analytics and ticket routing for your industry specific needs.'
                        }, {
                            icon: <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
                            title: 'Admin Approval System',
                            desc: 'Multi-tenant architecture with human-verified vetting process.'
                        }].map((item, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-100 dark:border-emerald-900/30">
                                    {item.icon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">{item.title}</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 bg-white dark:bg-slate-800/80 border border-emerald-100 dark:border-slate-700/60 rounded-2xl p-[14px] px-[18px] shadow-sm dark:shadow-black/20 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                            <div>
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">System Status</p>
                                <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">All systems operational. 99.9% uptime.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Step Form */}
            <div className="flex-1 overflow-y-auto px-4 py-12 sm:p-12 relative flex justify-center items-center bg-white dark:bg-slate-900 border-l border-green-50 dark:border-slate-800 transition-colors duration-300">
                <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-[2rem] p-4 sm:p-8 md:p-12 shadow-xl dark:shadow-black/10 border border-green-50 dark:border-slate-700/60 transition-colors duration-300">

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-between mb-12 max-w-md mx-auto relative px-2">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-700 -translate-y-1/2 z-0" />
                        <div
                            className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-600 -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${(step - 1) * 50}%` }}
                        />

                        {[1, 2, 3].map((s) => (
                            <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                                <div 
                                    style={{
                                        background: step >= s ? 'linear-gradient(135deg,#16a34a,#22c55e)' : '',
                                        boxShadow: step >= s ? '0 4px 12px rgba(34,160,69,0.25)' : 'none'
                                    }}
                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                                        step >= s 
                                        ? 'text-white border-none' 
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-2 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                                </div>
                                <span className={`text-[9px] sm:text-xs uppercase font-bold tracking-wider ${step >= s ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {s === 1 ? "Personal" : s === 2 ? "Company" : "Agreement"}
                                </span>
                            </div>
                        ))}
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4"
                        >
                            <div className="rounded-full p-1 mt-0.5 bg-red-100 dark:bg-red-900/50">
                                <ShieldCheck className="w-3 h-3 text-red-600 dark:text-red-400 rotate-180" />
                            </div>
                            <p className="text-sm font-medium text-red-700 dark:text-red-400 leading-snug">{error}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <AnimatePresence mode="wait">
                            {/* STEP 1: PERSONAL INFO */}
                            {step === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Personal Information</h2>
                                        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">Tell us who you are and create your admin account.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <User className="w-3 h-3" /> Full Name
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                required
                                                placeholder="Alex Mercer"
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <Mail className="w-3 h-3" /> Work Email
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                placeholder="alex.mercer@acmecorp.com"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <Phone className="w-3 h-3" /> Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                placeholder="+1 (415) 555-0198"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <Briefcase className="w-3 h-3" /> Job Title
                                            </label>
                                            <input
                                                type="text"
                                                name="jobTitle"
                                                placeholder="Director of Operations"
                                                value={formData.jobTitle}
                                                onChange={handleChange}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <Lock className="w-3 h-3" /> Create Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="password"
                                                    required
                                                    placeholder="••••••••••"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all pr-11"
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600"><Eye size={16} /></button>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                {formData.password && (
                                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                                                        <span>Strength: {getStrengthText()}</span>
                                                        <span>{passwordStrength}%</span>
                                                    </div>
                                                )}
                                                {formData.password && (
                                                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <motion.div className={`h-full ${getStrengthColor()}`} initial={{ width: 0 }} animate={{ width: `${passwordStrength}%` }} />
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
                                                    {[
                                                        { label: '8+ characters', ok: formData.password.length >= 8 },
                                                        { label: 'Uppercase (A-Z)', ok: /[A-Z]/.test(formData.password) },
                                                        { label: 'Lowercase (a-z)', ok: /[a-z]/.test(formData.password) },
                                                        { label: 'Number (0-9)', ok: /[0-9]/.test(formData.password) },
                                                    ].map(({ label, ok }) => (
                                                        <span key={label} className={`text-xs font-bold flex items-center gap-1 transition-colors ${formData.password ? (ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-400') : 'text-slate-300 dark:text-slate-600'}`}>
                                                            <span>{ok ? '✓' : '○'}</span> {label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <Lock className="w-3 h-3" /> Confirm Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    required
                                                    placeholder="••••••••••"
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all pr-11"
                                                />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600"><Eye size={16} /></button>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl py-4 text-sm font-semibold shadow-lg shadow-emerald-500/20 active:scale-[0.98] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 mt-8 border-none cursor-pointer"
                                    >
                                        Continue to Company Details <ChevronRight className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            )}

                            {/* STEP 2: COMPANY DETAILS */}
                            {step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Company Details</h2>
                                        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">Tell us about the organization you're registering.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Building2 className="w-3 h-3" /> Company Name
                                        </label>
                                        <input
                                            type="text"
                                            name="companyName"
                                            required
                                            placeholder="Acme Global Inc."
                                            value={formData.companyName}
                                            onChange={handleChange}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <User className="w-3 h-3" /> Company Size
                                            </label>
                                            <Select
                                                name="companySize"
                                                value={formData.companySize}
                                                onChange={handleChange}
                                                placeholder="Select Size"
                                                options={[
                                                    { value: "1-10", label: "1-10 Employees" },
                                                    { value: "11-50", label: "11-51 Employees" },
                                                    { value: "51-200", label: "51-200 Employees" },
                                                    { value: "201-1000", label: "201-1,000 Employees" },
                                                    { value: "1000+", label: "1,000+ Employees" }
                                                ]}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <Briefcase className="w-3 h-3" /> Industry
                                            </label>
                                            <Select
                                                name="industry"
                                                value={formData.industry}
                                                onChange={handleChange}
                                                placeholder="Select Industry"
                                                options={[
                                                    { value: "Technology", label: "Technology" },
                                                    { value: "Healthcare", label: "Healthcare" },
                                                    { value: "Finance", label: "Finance" },
                                                    { value: "Education", label: "Education" },
                                                    { value: "Retail", label: "Retail" },
                                                    { value: "Manufacturing", label: "Manufacturing" },
                                                    { value: "Other", label: "Other" }
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2">
                                                <Globe className="w-3 h-3" /> Company Website
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                placeholder="https://acme.com"
                                                value={formData.website}
                                                onChange={handleChange}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2">
                                                <Globe className="w-3 h-3" /> Country
                                            </label>
                                            <input
                                                type="text"
                                                name="country"
                                                required
                                                placeholder="United States"
                                                value={formData.country}
                                                onChange={handleChange}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={prevStep} className="flex-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl py-4 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
                                            <ChevronLeft className="w-5 h-5" /> Back
                                        </button>
                                        <button type="button" onClick={nextStep} className="flex-[2] bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl py-4 font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 border-none cursor-pointer">
                                            Review &amp; Confirm <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: AGREEMENT */}
                            {step === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Final Confirmation</h2>
                                        <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">Review our policies and submit your application.</p>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                                        <label className="flex items-start gap-4 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                name="agreedToTerms"
                                                checked={formData.agreedToTerms}
                                                onChange={handleChange}
                                                className="mt-1 w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 transition-all"
                                            />
                                            <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                I agree to the <Link to="/terms" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Privacy Policy</Link>. I understand that my data will be stored securely.
                                            </span>
                                        </label>
                                        <label className="flex items-start gap-4 cursor-pointer group pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <input
                                                type="checkbox"
                                                name="isAuthorized"
                                                checked={formData.isAuthorized}
                                                onChange={handleChange}
                                                className="mt-1 w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 transition-all"
                                            />
                                            <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                I confirm that I am authorized to register <span className="font-bold text-slate-900 dark:text-white underline">{formData.companyName || "my company"}</span> on the HelpDesk.ai platform as a primary administrator.
                                            </span>
                                        </label>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={prevStep} disabled={loading} className="flex-1 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl py-4 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-800 disabled:opacity-50">
                                            <ChevronLeft className="w-5 h-5" /> Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-[2] bg-emerald-900 dark:bg-emerald-600 text-white rounded-xl py-4 font-bold hover:bg-emerald-800 dark:hover:bg-emerald-500 shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                            {loading ? "Processing..." : "Submit Registration"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>

                    <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-10">
                        Secure enterprise registration portal. Your data is protected by 256-bit encryption.
                    </p>
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4 font-medium">
                        Are you an employee?{' '}
                        <Link to="/signup" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                            Join your team here →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdminSignup;