import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PlatformLogo from "@/platform/components/PlatformLogo";
import SocialAuthButtons from "@/platform/components/SocialAuthButtons";
import { usePlatformAuth } from "@/platform/state/auth";

const PENDING_INVITE_TOKEN_KEY = "aeroconcierge_pending_invite_token";

function splitDocUrls(input: string): string[] {
  return input.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
}

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, loading, error, setError } = usePlatformAuth();
  const inviteToken = new URLSearchParams(location.search).get("invite")?.trim() || "";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [docUrls, setDocUrls] = useState("");
  const [faqText, setFaqText] = useState("");

  useEffect(() => {
    if (!inviteToken) {
      return;
    }
    localStorage.setItem(PENDING_INVITE_TOKEN_KEY, inviteToken);
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signup({ full_name: fullName, email, password, company_name: companyName, website_url: websiteUrl, sitemap_url: sitemapUrl || undefined, doc_urls: splitDocUrls(docUrls), faq_text: faqText || undefined });
      navigate(
        inviteToken
          ? `/platform/app/overview?invite=${encodeURIComponent(inviteToken)}`
          : "/platform/app/overview"
      );
    } catch { /* handled in context */ }
  }

  const inputCls = "w-full rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3 text-sm text-[#0a0a0f] shadow-sm placeholder:text-[#0a0a0f]/30 focus:border-[#1a5c5c]/40 focus:outline-none focus:ring-2 focus:ring-[#1a5c5c]/15 transition";
  const labelCls = "block";
  const labelSpan = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50";

  return (
    <div className="flex min-h-screen font-[family-name:var(--font-body)] lg:h-screen lg:overflow-hidden">

      {/* ── Left Panel ───────────────────────────── */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#0a0a0f] p-10 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[40%] lg:flex-shrink-0">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-[#1a5c5c]/20 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-[#c9a96e]/10 blur-[90px]" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a96e]/10 text-[#c9a96e]">
            <div className="flex items-center justify-center  text-[#c9a96e]">
              <PlatformLogo className="h-8 w-8" />
            </div>          </div>
          <div>
            <strong className="block text-sm font-semibold text-white">AeroConcierge</strong>
            <p className="text-[11px] uppercase tracking-widest text-white/40">Travel commerce orchestration</p>
          </div>
        </div>

        <div className="relative">
          <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c9a96e]">
            <span className="h-px w-6 bg-[#c9a96e]" />
            AeroConcierge Platform
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-light leading-tight text-white lg:text-5xl">
            Launch your <em className="not-italic text-[#c9a96e]">branded</em> concierge.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/50">
            Connect domain, ingest knowledge, and deploy a tenant-specific chat widget in minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Brand-safe onboarding", "Knowledge-backed answers", "Responsive widget deployment"].map((pt) => (
              <span key={pt} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">{pt}</span>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
          <p className="text-sm leading-relaxed text-white/70">
            Go from website URL to launch-ready concierge with guided onboarding, domain verification, and live preview.
          </p>
          <strong className="mt-4 block text-xs font-semibold text-white">Premium setup flow</strong>
          <span className="text-[11px] text-white/40">Purpose-built for modern travel operators</span>
        </div>
      </section>

      {/* ── Right Panel: Form ─────────────────────── */}
      <section className="flex flex-1 items-start justify-center overflow-y-auto bg-[#faf8f4] px-5 py-12 sm:px-10 lg:h-screen lg:min-h-0">
        <div className="w-full max-w-lg">

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

          <h2 className="font-[family-name:var(--font-display)] text-3xl font-light text-[#0a0a0f]">Create Account</h2>
          <p className="mt-1 text-sm text-[#0a0a0f]/50">Create your account and connect the first workspace.</p>

          <div className="mt-8">
            <SocialAuthButtons
              disabled={loading}
              dividerLabel="Start with social login"
              helperText="Google and Facebook sign-in create your account first. You can set up the first workspace right after login."
            />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">

            {/* Account section */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#0a0a0f]/08" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">Account</span>
                <div className="h-px flex-1 bg-[#0a0a0f]/08" />
              </div>
              <div className="space-y-4">
                <label className={labelCls}>
                  <span className={labelSpan}>Full name</span>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputCls} placeholder="Jane Smith" />
                </label>
                <label className={labelCls}>
                  <span className={labelSpan}>Work email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} placeholder="jane@company.com" />
                </label>
                <label className={labelCls}>
                  <span className={labelSpan}>Password</span>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required className={`${inputCls} pr-20`} placeholder="Min. 8 characters" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-[#0a0a0f]/40 hover:text-[#0a0a0f] transition">
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              </div>
            </div>

            {/* Company section */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#0a0a0f]/08" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">Company</span>
                <div className="h-px flex-1 bg-[#0a0a0f]/08" />
              </div>
              <div className="space-y-4">
                <label className={labelCls}>
                  <span className={labelSpan}>Company name</span>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className={inputCls} placeholder="Acme Travel Co." />
                </label>
                <label className={labelCls}>
                  <span className={labelSpan}>Website URL</span>
                  <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} required className={inputCls} placeholder="https://example.com" />
                </label>
              </div>
            </div>

            {/* Knowledge section */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#0a0a0f]/08" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">Knowledge</span>
                <div className="h-px flex-1 bg-[#0a0a0f]/08" />
              </div>
              <div className="space-y-4">
                <label className={labelCls}>
                  <span className={labelSpan}>Sitemap URL <span className="text-[#0a0a0f]/30 normal-case font-normal">(optional)</span></span>
                  <input value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} className={inputCls} placeholder="https://example.com/sitemap.xml" />
                </label>
                <label className={labelCls}>
                  <span className={labelSpan}>Doc URLs <span className="text-[#0a0a0f]/30 normal-case font-normal">(comma or new line)</span></span>
                  <textarea rows={3} value={docUrls} onChange={(e) => setDocUrls(e.target.value)} className={`${inputCls} resize-none`} placeholder="https://example.com/refund&#10;https://example.com/baggage" />
                </label>
                <label className={labelCls}>
                  <span className={labelSpan}>FAQs / support text <span className="text-[#0a0a0f]/30 normal-case font-normal">(optional)</span></span>
                  <textarea rows={4} value={faqText} onChange={(e) => setFaqText(e.target.value)} className={`${inputCls} resize-none`} placeholder="Paste FAQs or policy text…" />
                </label>
              </div>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {loading && <div className="rounded-xl border border-[#1a5c5c]/20 bg-[#1a5c5c]/05 px-4 py-3 text-sm text-[#1a5c5c]">Creating the workspace, saving sources, and starting knowledge base ingestion…</div>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#0a0a0f] px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#1a5c5c] hover:shadow-[#1a5c5c]/25 disabled:opacity-60">
              {loading ? "Building workspace…" : "Create Workspace →"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#0a0a0f]/50">
            Already have an account?{" "}
            <Link
              to={inviteToken ? `/platform/login?invite=${encodeURIComponent(inviteToken)}` : "/platform/login"}
              className="font-medium text-[#1a5c5c] hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
