import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PlatformLogo from "@/platform/components/PlatformLogo";
import {
  platformRequestPasswordReset,
  platformResetPassword,
  resolvePlatformApiBaseUrl
} from "@/lib/platformApi";

function useResetToken() {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("token")?.trim() || "";
  }, [location.search]);
}

export default function ResetPasswordPage() {
  const resetToken = useResetToken();
  const hasToken = resetToken.length > 0;
  const backendUrl = resolvePlatformApiBaseUrl();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRequestReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await platformRequestPasswordReset({ email }, backendUrl);
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await platformResetPassword({ token: resetToken, password }, backendUrl);
      setSuccess(response.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen font-[family-name:var(--font-body)]">
      <section className="relative hidden lg:flex lg:w-[45%] flex-col justify-between p-10 bg-[#120d07] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-1/4 -left-1/4 h-[620px] w-[620px] rounded-full bg-[#9f6b1f]/18 blur-[130px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[#f2d0a4]/8 blur-[110px]" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e1b36a]/10 text-[#e1b36a]">
            <PlatformLogo className="h-8 w-8" />
          </div>
          <div>
            <strong className="block text-sm font-semibold text-white">AeroConcierge</strong>
            <p className="text-[11px] uppercase tracking-widest text-white/40">Account recovery</p>
          </div>
        </div>

        <div className="relative">
          <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e1b36a]">
            <span className="h-px w-6 bg-[#e1b36a]" />
            Secure access
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-light leading-tight text-white lg:text-5xl">
            {hasToken ? "Choose a new password." : "Recover your login."}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            {hasToken
              ? "This reset link lets you replace your existing password and sign back in."
              : "Enter your email and we will send a password reset link to your inbox."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Single-use links", "Session revocation", "Email-based recovery"].map((item) => (
              <span key={item} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
          <p className="text-sm leading-relaxed text-white/70 italic">
            "Use the reset flow when you lose access. The link is one-time and existing sessions are revoked after the password changes."
          </p>
          <strong className="mt-4 block text-xs font-semibold text-white">Platform Security</strong>
          <span className="text-[11px] text-white/40">Password recovery workflow</span>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-[#fbf6ee] px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex items-center justify-center text-[#b07a2a]">
              <PlatformLogo className="h-8 w-8" />
            </div>
            <div>
              <strong className="block text-sm font-semibold text-[#0a0a0f]">AeroConcierge</strong>
              <p className="text-[11px] uppercase tracking-widest text-[#0a0a0f]/50">Account recovery</p>
            </div>
          </div>

          <h2 className="font-[family-name:var(--font-display)] text-3xl font-light text-[#0a0a0f]">
            {hasToken ? "Reset Password" : "Forgot Password"}
          </h2>
          <p className="mt-1 text-sm text-[#0a0a0f]/50">
            {hasToken
              ? "Enter your new password below."
              : "We will email you a secure reset link."}
          </p>

          <form onSubmit={hasToken ? handleResetPassword : handleRequestReset} className="mt-8 space-y-5">
            {!hasToken ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3 text-sm text-[#0a0a0f] shadow-sm placeholder:text-[#0a0a0f]/30 focus:border-[#9f6b1f]/40 focus:outline-none focus:ring-2 focus:ring-[#9f6b1f]/15 transition"
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">New password</span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      minLength={8}
                      className="w-full rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3 pr-20 text-sm text-[#0a0a0f] shadow-sm placeholder:text-[#0a0a0f]/30 focus:border-[#9f6b1f]/40 focus:outline-none focus:ring-2 focus:ring-[#9f6b1f]/15 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-[#0a0a0f]/40 hover:text-[#0a0a0f] transition"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">Confirm password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your new password"
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3 text-sm text-[#0a0a0f] shadow-sm placeholder:text-[#0a0a0f]/30 focus:border-[#9f6b1f]/40 focus:outline-none focus:ring-2 focus:ring-[#9f6b1f]/15 transition"
                  />
                </label>
              </>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {success && (
              <div className="rounded-xl border border-[#9f6b1f]/20 bg-[#9f6b1f]/5 px-4 py-3 text-sm text-[#7a5316]">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0f0d0b] px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#9f6b1f] hover:shadow-[#9f6b1f]/25 disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : hasToken
                  ? "Update Password →"
                  : "Send Reset Link →"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#0a0a0f]/50">
            <Link to="/platform/login" className="font-medium text-[#9f6b1f] hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
