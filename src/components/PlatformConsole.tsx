import { useEffect, useMemo, useState } from "react";
import {
  platformLogin,
  platformMe,
  platformRunIngest,
  platformSignup,
  platformVerifyDomain
} from "@/lib/platformApi";

type PlatformConsoleProps = {
  backendUrl?: string;
};

const TOKEN_KEY = "aeroconcierge_platform_token";

export function PlatformConsole({ backendUrl }: PlatformConsoleProps) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [docUrls, setDocUrls] = useState("");
  const [faqText, setFaqText] = useState("");

  async function refreshProfile(activeToken: string) {
    setLoading(true);
    setError("");

    try {
      const data = await platformMe(activeToken, backendUrl);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    refreshProfile(token).catch(() => undefined);
  }, [token]);

  const tenantCards = useMemo(() => profile?.tenants ?? [], [profile]);

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await platformSignup(
        {
          full_name: fullName,
          email,
          password,
          company_name: companyName,
          website_url: websiteUrl,
          sitemap_url: sitemapUrl || undefined,
          faq_text: faqText || undefined,
          doc_urls: docUrls
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        },
        backendUrl
      );

      if (response.token) {
        localStorage.setItem(TOKEN_KEY, response.token);
        setToken(response.token);
      }
      setProfile({
        user: response.user,
        tenants: [response.tenant]
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await platformLogin({ email, password }, backendUrl);
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setProfile({
        user: response.user,
        tenants: response.tenants
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyDomain(tenantId: string) {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await platformVerifyDomain(token, tenantId, backendUrl);
      await refreshProfile(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Domain verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleReingest(tenantId: string) {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await platformRunIngest(token, tenantId, true, backendUrl);
      await refreshProfile(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-ingest failed");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setProfile(null);
    setMode("login");
  }

  return (
    <div className="platform-page">
      <div className="platform-card">
        <h1>AeroConcierge Platform</h1>
        <p>Create your tenant, verify one domain via DNS TXT, ingest website knowledge, and embed widget.</p>

        {!token ? (
          <div className="platform-auth">
            <div className="chip-row">
              <button type="button" onClick={() => setMode("signup")}>Signup</button>
              <button type="button" onClick={() => setMode("login")}>Login</button>
            </div>

            <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="platform-form">
              {mode === "signup" ? (
                <>
                  <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  <input placeholder="Website URL (https://example.com)" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                  <input placeholder="Sitemap URL (optional)" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} />
                  <input
                    placeholder="Docs URLs comma-separated (optional)"
                    value={docUrls}
                    onChange={(e) => setDocUrls(e.target.value)}
                  />
                  <textarea
                    placeholder="FAQ or support text (optional)"
                    value={faqText}
                    onChange={(e) => setFaqText(e.target.value)}
                    rows={4}
                  />
                </>
              ) : null}

              <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}</button>
            </form>
          </div>
        ) : (
          <div className="platform-dashboard">
            <div className="platform-topbar">
              <strong>{profile?.user?.full_name || "User"}</strong>
              <button type="button" onClick={handleLogout}>Logout</button>
            </div>

            {tenantCards.map((tenant: any) => (
              <article key={tenant.tenant_id} className="tenant-card">
                <h3>{tenant.name || tenant.tenant_id}</h3>
                <p><strong>Tenant ID:</strong> {tenant.tenant_id}</p>
                <p><strong>Domain:</strong> {tenant.allowed_domains?.[0] || "N/A"}</p>
                <p><strong>Domain status:</strong> {tenant.domain_verification?.status || "pending"}</p>
                <p><strong>TXT Name:</strong> <code>{tenant.domain_verification?.txt_name || "N/A"}</code></p>
                <p><strong>TXT Value:</strong> <code>{tenant.domain_verification?.txt_value || "N/A"}</code></p>

                <div className="chip-row">
                  <button type="button" onClick={() => handleVerifyDomain(tenant.tenant_id)} disabled={loading}>
                    Verify DNS
                  </button>
                  <button type="button" onClick={() => handleReingest(tenant.tenant_id)} disabled={loading}>
                    Rebuild Knowledge Base
                  </button>
                </div>

                <div className="snippet-block">
                  <p><strong>Widget Script Snippet</strong></p>
                  <textarea readOnly value={tenant.widget?.script_snippet || ""} rows={8} />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(tenant.widget?.script_snippet || "")}
                  >
                    Copy Snippet
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </div>
  );
}
