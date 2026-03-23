import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PlatformLogo from "@/platform/components/PlatformLogo";
import SocialAuthButtons from "@/platform/components/SocialAuthButtons";
import { usePlatformAuth } from "@/platform/state/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, acceptSessionToken, loading, error, setError } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [oauthStatus, setOauthStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthToken = params.get("oauth_token");
    const oauthError = params.get("oauth_error");

    if (oauthError) {
      setOauthStatus("");
      setError(oauthError);
      navigate("/platform/login", { replace: true });
      return;
    }

    if (!oauthToken) {
      return;
    }

    let cancelled = false;
    setOauthStatus("Completing your sign-in...");
    acceptSessionToken(oauthToken)
      .then(() => {
        if (!cancelled) {
          navigate("/platform/app/overview", { replace: true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          navigate("/platform/login", { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOauthStatus("");
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
      navigate("/platform/app/overview");
    } catch { /* handled in context */ }
  }

  return (
    <div className="flex min-h-screen font-[family-name:var(--font-body)]">

      {/* ── Left Panel: Branding ──────────────────── */}
      <section className="relative hidden lg:flex lg:w-[45%] flex-col justify-between p-10 bg-[#0a0a0f] overflow-hidden">
        {/* Decorative gradients */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-[#1a5c5c]/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#c9a96e]/10 blur-[100px]" />
        </div>

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a96e]/10 text-[#c9a96e]">
            <div className="flex items-center justify-center  text-[#c9a96e]">
              <PlatformLogo className="h-8 w-8" />
            </div>
          </div>
          <div>
            <strong className="block text-sm font-semibold text-white">AeroConcierge</strong>
            <p className="text-[11px] uppercase tracking-widest text-white/40">Travel commerce orchestration</p>
          </div>
        </div>

        {/* Center copy */}
        <div className="relative">
          <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c9a96e]">
            <span className="h-px w-6 bg-[#c9a96e]" />
            AeroConcierge Platform
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-light leading-tight text-white lg:text-5xl">
            Welcome <em className="not-italic text-[#c9a96e]">back.</em>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/50">
            Login to manage your tenant chatbot, theme, DNS verification, and knowledge base.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Multi-workspace control", "Verified domain deployment", "Live concierge preview"].map((pt) => (
              <span key={pt} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">{pt}</span>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
          <p className="text-sm leading-relaxed text-white/70 italic">
            "AeroConcierge transformed how we engage with customers. Our conversion rate increased by 40% in the first month."
          </p>
          <strong className="mt-4 block text-xs font-semibold text-white">Sarah Chen</strong>
          <span className="text-[11px] text-white/40">CEO, VoyageHub Travel</span>
        </div>
      </section>

      {/* ── Right Panel: Form ─────────────────────── */}
      <section className="flex flex-1 items-center justify-center bg-[#faf8f4] px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">

          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex items-center justify-center  text-[#c9a96e]">
              <PlatformLogo className="h-8 w-8" />
            </div>
            <div>
              <strong className="block text-sm font-semibold ">AeroConcierge</strong>
              <p className="text-[11px] uppercase tracking-widest ">Travel commerce orchestration</p>
            </div>
          </div>

          <h2 className="font-[family-name:var(--font-display)] text-3xl font-light text-[#0a0a0f]">Login</h2>
          <p className="mt-1 text-sm text-[#0a0a0f]/50">Log in to your workspace to continue.</p>

          <div className="mt-8">
            <SocialAuthButtons disabled={loading} dividerLabel="Sign in fast with" />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3 text-sm text-[#0a0a0f] shadow-sm placeholder:text-[#0a0a0f]/30 focus:border-[#1a5c5c]/40 focus:outline-none focus:ring-2 focus:ring-[#1a5c5c]/15 transition"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3 pr-20 text-sm text-[#0a0a0f] shadow-sm placeholder:text-[#0a0a0f]/30 focus:border-[#1a5c5c]/40 focus:outline-none focus:ring-2 focus:ring-[#1a5c5c]/15 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-[#0a0a0f]/40 hover:text-[#0a0a0f] transition"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link to="/platform/reset-password" className="text-xs font-medium text-[#1a5c5c] hover:underline">
                  Forgot password?
                </Link>
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {oauthStatus && (
              <div className="rounded-xl border border-[#1a5c5c]/20 bg-[#1a5c5c]/5 px-4 py-3 text-sm text-[#1a5c5c]">
                {oauthStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0a0a0f] px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#1a5c5c] hover:shadow-[#1a5c5c]/25 disabled:opacity-60"
            >
              {loading ? "Please wait…" : "Login →"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#0a0a0f]/50">
            Need an account?{" "}
            <Link to="/platform/signup" className="font-medium text-[#1a5c5c] hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
