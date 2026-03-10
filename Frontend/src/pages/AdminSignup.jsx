import { useState, useEffect } from "react";
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

/**
 * AdminSignup — Premium Multi-step Company Registration
 * Path: /admin-signup
 */
function AdminSignup() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Personal Info
        fullName: "",
        email: "",
        phone: "",
        jobTitle: "",
        password: "",
        confirmPassword: "",
        // Company Details
        companyName: "",
        companySize: "",
        industry: "",
        website: "",
        country: "",
        // Agreements
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

    // Redirect if already logged in and verified
    useEffect(() => {
        if (user && profile && profile.status === 'active') {
            navigate(profile.role === 'admin' ? "/admin/dashboard" : "/dashboard");
        }
    }, [user, profile, navigate]);

    // Password strength calculation
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
            if (formData.password.length < 8) {
                setError("Password must be at least 8 characters long.");
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
            // Trigger Supabase Signup
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

            // After signup, the store's 'profile' should be updated.
            // If email confirmation is OFF in Supabase, status will usually be 'pending_approval' immediately.
            const updatedProfile = useAuthStore.getState().profile;

            if (updatedProfile?.status === 'pending_approval') {
                // Email was auto-verified, go straight to lobby
                navigate('/admin-lobby');
            } else {
                // Email verification is required, show the success screen
                setIsSubmitted(true);
                window.scrollTo(0, 0);
            }
        } catch (err) {
            console.error("Admin signup failed:", err);
            setError(err.message || "Signup failed. Please try again.");
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
            <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
                {/* Background Patterns */}
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-600 rounded-full blur-3xl opacity-20"></div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-10 max-w-lg w-full text-center relative z-10 shadow-2xl"
                >
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-10 h-10 text-emerald-700" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Check Your Email</h2>
                    <p className="text-gray-600 text-lg leading-relaxed mb-8">
                        Registration request received! We've sent a verification link to <span className="font-bold text-emerald-700 font-mono">{formData.email}</span>.
                    </p>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-left mb-8">
                        <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4" /> Next Steps:
                        </h4>
                        <ul className="space-y-3 text-sm text-emerald-800">
                            <li className="flex gap-2">
                                <span className="font-bold">1.</span> Verify your email by clicking the link in our message.
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold">2.</span> Your request will be reviewed by our Master Admin.
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold">3.</span> You'll receive a final confirmation once approved.
                            </li>
                        </ul>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-emerald-900 text-white rounded-xl py-4 font-bold hover:bg-emerald-800 transition-all shadow-lg"
                    >
                        Return to Login
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-emerald-950 flex font-sans overflow-hidden">
            {/* Background Patterns (Global) */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

            {/* Left Side: Branding/Hero */}
            <div className="hidden lg:flex w-5/12 text-white items-center justify-center p-16 relative overflow-hidden bg-emerald-900/60 backdrop-blur-3xl border-r border-white/5">
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
                <div className="absolute top-24 right-24 w-64 h-64 bg-teal-400 rounded-full blur-[100px] opacity-10"></div>

                <div className="relative z-10 max-w-md">
                    <div className="bg-white/10 p-3 rounded-2xl w-fit mb-8 backdrop-blur-md border border-white/10 cursor-pointer" onClick={() => navigate('/')}>
                        <BrainCircuit className="w-10 h-10 text-emerald-300" />
                    </div>
                    <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs mb-4">Enterprise Edition</p>
                    <h1 className="text-3xl xl:text-5xl font-extrabold mb-8 leading-tight">
                        Scale your <span className="text-emerald-400">IT Support</span> globally.
                    </h1>

                    <div className="space-y-8">
                        <div className="flex gap-4 items-start group">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-1">Company-wide Isolation</h4>
                                <p className="text-emerald-100/60 text-sm leading-relaxed">Secure data siloing for departments and multiple office locations.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start group">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all">
                                <Building2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-1">Custom Dashboards</h4>
                                <p className="text-emerald-100/60 text-sm leading-relaxed">Tailored analytics and ticket routing for your industry specific needs.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start group">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all">
                                <User className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-1">Admin Approval system</h4>
                                <p className="text-emerald-100/60 text-sm leading-relaxed">Multi-tenant architecture with human-verified vetting process.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Step Form */}
            <div className="flex-1 overflow-y-auto px-4 py-8 lg:p-12 relative flex justify-center items-start lg:items-center bg-[#05110d]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="w-full max-w-2xl bg-white/[0.98] backdrop-blur-xl shadow-2xl rounded-[1.5rem] lg:rounded-[2.5rem] p-6 md:p-12 border border-white/20 my-auto relative z-10 transition-all">

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-between mb-12 max-w-md mx-auto relative">
                        {/* Connector Line */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
                        <div
                            className="absolute top-1/2 left-0 h-0.5 bg-emerald-600 -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${(step - 1) * 50}%` }}
                        ></div>

                        {[1, 2, 3].map((s) => (
                            <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                  ${step >= s ? 'bg-emerald-900 text-white shadow-lg shadow-emerald-900/20' : 'bg-white text-gray-400 border-2 border-gray-100'}
                `}>
                                    {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                                </div>
                                <span className={`text-[10px] uppercase font-bold tracking-widest ${step >= s ? 'text-emerald-900' : 'text-gray-400'}`}>
                                    {s === 1 ? "Personal" : s === 2 ? "Company" : "Agreement"}
                                </span>
                            </div>
                        ))}
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3"
                        >
                            <div className="bg-red-100 rounded-full p-1 mt-0.5">
                                <ShieldCheck className="w-3 h-3 text-red-600 rotate-180" />
                            </div>
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <AnimatePresence mode="wait">
                            {/* STEP 1: PERSONAL INFO */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                                        <p className="text-gray-500 text-sm">Tell us who you are and create your admin account.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <User className="w-3 h-3" /> Full Name
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                required
                                                placeholder="John Doe"
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-emerald-600 focus:bg-white outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Mail className="w-3 h-3" /> Work Email
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                placeholder="john@company.com"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-emerald-600 focus:bg-white outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Phone className="w-3 h-3" /> Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                placeholder="+1 (555) 000-0000"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-emerald-600 focus:bg-white outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Briefcase className="w-3 h-3" /> Job Title
                                            </label>
                                            <input
                                                type="text"
                                                name="jobTitle"
                                                placeholder="IT Manager"
                                                value={formData.jobTitle}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-emerald-600 focus:bg-white outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
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
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-emerald-600 focus:bg-white outline-none transition-all pr-11"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {/* Strength Meter */}
                                            {formData.password && (
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                        <span>Strength: {getStrengthText()}</span>
                                                        <span>{passwordStrength}%</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className={`h-full ${getStrengthColor()}`}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${passwordStrength}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
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
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-emerald-600 focus:bg-white outline-none transition-all pr-11"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="w-full bg-emerald-900 text-white rounded-xl py-4 font-bold hover:bg-emerald-800 transition-all shadow-xl shadow-emerald-900/20 mt-8 flex items-center justify-center gap-2"
                                    >
                                        Continue to Company Details <ChevronRight className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            )}

                            {/* STEP 2: COMPANY DETAILS */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-bold text-gray-900">Company Details</h2>
                                        <p className="text-gray-500 text-sm">Tell us about the organization you're registering.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <Building2 className="w-3 h-3" /> Company Name
                                        </label>
                                        <input
                                            type="text"
                                            name="companyName"
                                            required
                                            placeholder="Acme Global Inc."
                                            value={formData.companyName}
                                            onChange={handleChange}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-emerald-600 focus:bg-white outline-none transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <User className="w-3 h-3" /> Company Size
                                            </label>
                                            <Select
                                                name="companySize"
                                                value={formData.companySize}
                                                onChange={handleChange}
                                                placeholder="Select Size"
                                                options={[
                                                    { value: "1-10", label: "1-10 Employees" },
                                                    { value: "11-50", label: "11-50 Employees" },
                                                    { value: "51-200", label: "51-200 Employees" },
                                                    { value: "201-1000", label: "201-1,000 Employees" },
                                                    { value: "1000+", label: "1,000+ Employees" }
                                                ]}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Globe className="w-3 h-3" /> Company Website
                                            </label>
                                            <input
                                                type="url"
                                                name="website"
                                                placeholder="https://acme.com"
                                                value={formData.website}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-emerald-600 focus:bg-white outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Globe className="w-3 h-3" /> Country
                                            </label>
                                            <input
                                                type="text"
                                                name="country"
                                                required
                                                placeholder="United States"
                                                value={formData.country}
                                                onChange={handleChange}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:border-emerald-600 focus:bg-white outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-8">
                                        <button
                                            type="button"
                                            onClick={prevStep}
                                            className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-4 font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ChevronLeft className="w-5 h-5" /> Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={nextStep}
                                            className="flex-[2] bg-emerald-900 text-white rounded-xl py-4 font-bold hover:bg-emerald-800 transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-2"
                                        >
                                            Review & Confirm <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: AGREEMENT */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-bold text-gray-900">Final Confirmation</h2>
                                        <p className="text-gray-500 text-sm">Review our policies and submit your application.</p>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 space-y-4">
                                        <label className="flex items-start gap-4 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                name="agreedToTerms"
                                                checked={formData.agreedToTerms}
                                                onChange={handleChange}
                                                className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-all"
                                            />
                                            <span className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
                                                I agree to the <Link to="/terms" className="text-emerald-700 font-bold hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-emerald-700 font-bold hover:underline">Privacy Policy</Link>. I understand that my data will be stored securely.
                                            </span>
                                        </label>
                                        <label className="flex items-start gap-4 cursor-pointer group pt-4 border-t border-gray-200/50">
                                            <input
                                                type="checkbox"
                                                name="isAuthorized"
                                                checked={formData.isAuthorized}
                                                onChange={handleChange}
                                                className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-all"
                                            />
                                            <span className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
                                                I confirm that I am authorized to register <span className="font-bold text-gray-900 underline">{formData.companyName || "my company"}</span> on the HelpDesk.ai platform as a primary administrator.
                                            </span>
                                        </label>
                                    </div>

                                    <div className="flex gap-4 pt-8">
                                        <button
                                            type="button"
                                            onClick={prevStep}
                                            disabled={loading}
                                            className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-4 font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ChevronLeft className="w-5 h-5" /> Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-[2] bg-emerald-900 text-white rounded-xl py-4 font-bold hover:bg-emerald-800 transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                            {loading ? "Processing..." : "Submit Registration"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-12">
                        Secure enterprise registration portal. Your data is protected by 256-bit encryption.
                    </p>
                    <p className="text-center text-xs text-gray-500 mt-4">
                        Are you an employee?{' '}
                        <Link to="/signup" className="text-emerald-700 font-bold hover:underline">
                            Join your team here →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdminSignup;
