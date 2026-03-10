import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { Eye, EyeOff, BrainCircuit, ArrowRight, Loader2, ArrowLeft } from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login, loading, user, profile } = useAuthStore();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      if (profile.status === "active") {
        if (profile.role === "master_admin") navigate("/master-admin/dashboard");
        else if (profile.role === "admin") navigate("/admin/dashboard");
        else if (profile.role === "user") navigate("/dashboard");
      } else if (profile.status === "pending_approval") {
        if (profile.role === "admin") navigate("/admin-lobby");
        else if (profile.role === "user") navigate("/user-lobby");
      } else if (profile.status === "rejected") {
        navigate("/not-approved");
      }
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setError("");

    try {
      const { profile } = await login(email, password);

      if (!profile) {
        throw new Error("User profile not found. Please contact support.");
      }

      if (profile.status === "pending_email_verification") {
        throw new Error("Please verify your email first.");
      }

      if (profile.status === "rejected") {
        navigate("/not-approved");
        return; // Navigation will happen, but just return to prevent further execution
      }

      if (profile.role === "master_admin" && profile.status === "active") {
        navigate("/master-admin/dashboard");
      } else if (profile.role === "admin") {
        if (profile.status === "active") navigate("/admin/dashboard");
        else if (profile.status === "pending_approval") navigate("/admin-lobby");
      } else if (profile.role === "user") {
        if (profile.status === "active") navigate("/dashboard");
        else if (profile.status === "pending_approval") navigate("/user-lobby");
      }
    } catch (err) {
      console.error("Login component error:", err);
      setError(err.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Side Branding */}
      <div className="hidden lg:flex w-1/2 bg-emerald-900 text-white items-center justify-center p-12 relative overflow-hidden">
        {/* Background Patterns */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute top-24 right-24 w-64 h-64 bg-teal-400 rounded-full blur-3xl opacity-10"></div>

        <div className="relative z-10 max-w-lg">
          <div className="bg-emerald-800/50 p-3 rounded-2xl w-fit mb-8 backdrop-blur-sm border border-emerald-700/50">
            <BrainCircuit className="w-10 h-10 text-emerald-300" />
          </div>
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">
            Automate your <span className="text-emerald-400">IT Support</span>
          </h1>
          <p className="text-xl text-emerald-100/80 leading-relaxed mb-8">
            Join thousands of IT teams using HelpDesk.ai to categorize, route, and resolve tickets instantly.
          </p>

          <div className="bg-emerald-950/30 rounded-xl p-6 border border-emerald-800/50 backdrop-blur-md">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <div className="text-emerald-300 font-bold">AI</div>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-200 uppercase tracking-wider mb-1">System Status</p>
                <p className="text-white font-medium">All systems operational. 99.9% uptime this month.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center bg-gray-50 p-6 relative">
        {/* Back Button */}
        <Link
          to="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-emerald-900 font-semibold transition-all group"
        >
          <div className="p-2 rounded-full bg-white border border-gray-100 shadow-sm group-hover:border-emerald-100 group-hover:shadow-md transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span>Back to Home</span>
        </Link>

        <div className="bg-white shadow-xl shadow-gray-200/50 rounded-3xl p-8 md:p-12 w-full max-w-md border border-gray-100 mt-8 lg:mt-0">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome Back</h2>
            <p className="text-gray-500">Please sign in to continue</p>
          </div>

          {/* Role Toggle Removed */}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
              <div className="bg-red-100 rounded-full p-1 mt-0.5">
                <ArrowRight className="w-3 h-3 text-red-600 rotate-45" />
              </div>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                placeholder="Enter your system email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-gray-800 placeholder:text-gray-400 font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <Link to="/forgot-password" title="Reset your password" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-md px-1 transition-all">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-gray-800 placeholder:text-gray-400 font-medium pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-900 text-white rounded-xl py-3.5 font-bold hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="text-center text-sm text-gray-500 mt-8">
              Don't have an account?{" "}
              <Link to="/signup" className="text-emerald-700 font-bold hover:underline transition-all">
                Create Account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
