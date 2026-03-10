import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { supabase } from "../lib/supabaseClient";
import { Eye, EyeOff, BrainCircuit, ArrowRight, Loader2, CheckCircle2, ChevronDown, Search, Building2, ArrowLeft } from "lucide-react";

function Signup() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Company Dropdown state
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { signup, user, profile } = useAuthStore();

  // Fetch and subscribe to companies
  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoadingCompanies(true);
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (data) {
        setCompanies(data);
        setFilteredCompanies(data);
      }
      if (error) console.error("Error fetching companies:", error);
      setIsLoadingCompanies(false);
    };

    fetchCompanies();

    // Realtime subscription for companies
    const channel = supabase
      .channel('public:companies')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'companies' },
        () => {
          fetchCompanies(); // Refetch on any change
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter companies
  useEffect(() => {
    if (companySearch.trim() === "") {
      setFilteredCompanies(companies);
    } else {
      const lowerSearch = companySearch.toLowerCase();
      setFilteredCompanies(
        companies.filter((c) => c.name.toLowerCase().includes(lowerSearch))
      );
    }
  }, [companySearch, companies]);

  // Redirect if already logged in and active
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'admin' || profile.role === 'super_admin') {
        navigate("/admin/dashboard");
      } else if (profile.status === "active") {
        navigate("/dashboard");
      } else if (profile.status === "pending_approval") {
        navigate("/user-lobby");
      }
    }
  }, [user, profile, navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirmPassword || !fullName) {
      setError("All fields are required.");
      return;
    }

    if (!selectedCompany) {
      setError("Please select your company.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Signup with Auth (triggers verification email)
      // We pass the company name as metadata so the profile trigger has some info, 
      // but we'll manually ensure the proper company_id is set or linked.
      // Wait, we need to pass company ID so the trigger can use it? 
      // Since auth.signUp metadata is flexible, let's pass company_id.

      const newUser = await signup(
        email,
        password,
        fullName,
        'user',
        selectedCompany.name,
        {
          company_id: selectedCompany.id
        },
        window.location.origin + '/login'
      );

      if (newUser) {
        // Step 2: Insert into user_requests
        const { error: requestError } = await supabase
          .from('user_requests')
          .insert([{
            user_id: newUser.id,
            company_id: selectedCompany.id,
            status: 'pending'
          }]);

        if (requestError) {
          console.error("Failed to insert user request:", requestError);
          // Non-fatal, but we should log it
        }

        // Check if email confirmation was skipped
        const updatedProfile = useAuthStore.getState().profile;
        if (updatedProfile?.status === 'pending_approval') {
          // Email was auto-verified, go straight to lobby
          navigate('/user-lobby');
        } else {
          // Show success screen in-place (no redirect)
          setSuccessMsg(`📧 Check your email! We sent a verification link to ${email}. After verifying your email, your request will be reviewed by your company admin.`);
        }
      }

    } catch (err) {
      console.error("Signup component error:", err);
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Success State
  if (successMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-emerald-900 relative overflow-hidden p-6">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-8 border border-gray-100 relative z-10 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful</h2>
          <p className="text-gray-600 leading-relaxed mb-8">{successMsg}</p>
          <Link to="/login" className="inline-flex items-center justify-center w-full px-6 py-3 bg-emerald-900 text-white rounded-xl font-bold hover:bg-emerald-800 transition-colors">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-emerald-900 relative overflow-hidden p-6 py-12">
      {/* Background Patterns */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <Link
          to="/"
          className="absolute -top-12 left-0 flex items-center gap-2 text-emerald-100/70 hover:text-white font-semibold transition-all group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home</span>
        </Link>

        {/* Logo Header */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 transition hover:bg-white/20">
            <BrainCircuit className="w-5 h-5 text-emerald-300" />
            <span className="font-bold text-lg text-white">HelpDesk.ai</span>
          </Link>
        </div>

        <div className="bg-white shadow-2xl shadow-emerald-900/50 rounded-3xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-500 mt-1">Start automating your IT support today</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
              <div className="bg-red-100 rounded-full p-1 mt-0.5">
                <ArrowRight className="w-3 h-3 text-red-600 rotate-45" />
              </div>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Company Dropdown Selection */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>

              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full px-4 py-3 rounded-xl border ${isDropdownOpen ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-gray-200 hover:border-emerald-300'} transition-all cursor-pointer bg-white flex items-center justify-between`}
              >
                {selectedCompany ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    </div>
                    <span className="font-semibold text-gray-900">{selectedCompany.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400 font-medium">Select your company...</span>
                )}
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                    <Search className="w-4 h-4 text-gray-400 ml-2" />
                    <input
                      type="text"
                      placeholder="Search companies..."
                      className="w-full bg-transparent border-none outline-none text-sm py-1 font-medium"
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto p-1">
                    {isLoadingCompanies ? (
                      <div className="py-6 flex flex-col items-center justify-center gap-2 opacity-50">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-semibold text-gray-400">Loading companies...</span>
                      </div>
                    ) : filteredCompanies.length > 0 ? (
                      filteredCompanies.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCompany(c);
                            setIsDropdownOpen(false);
                            setCompanySearch("");
                          }}
                          className="px-3 py-2.5 hover:bg-emerald-50 rounded-lg cursor-pointer flex items-center gap-3 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg border border-gray-100 bg-white flex items-center justify-center group-hover:border-emerald-200">
                            <Building2 className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                          </div>
                          <span className="font-semibold text-gray-700 group-hover:text-emerald-900">{c.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm font-medium text-gray-500 bg-gray-50/50 rounded-lg mx-1 my-1 border border-gray-100 border-dashed">
                        No companies found.<br />
                        <span className="text-xs text-gray-400 mt-1 block font-normal">Ask your IT Admin to register your company first.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-gray-800 placeholder:text-gray-400 font-medium"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(""); }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                placeholder="Enter your system email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-gray-800 placeholder:text-gray-400 font-medium"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 chars"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-gray-800 placeholder:text-gray-400 font-medium pr-10"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-gray-800 placeholder:text-gray-400 font-medium pr-10"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-900 text-white rounded-xl py-3.5 font-bold hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isSubmitting ? "Creating Profile..." : "Submit Registration"}
            </button>

            <p className="text-center text-sm mt-6 text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="text-emerald-700 font-bold hover:underline transition-all">
                Login here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;
