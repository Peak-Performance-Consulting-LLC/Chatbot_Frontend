import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

function splitDocUrls(input: string): string[] {
  return input
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, loading, error, setError } = usePlatformAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [docUrls, setDocUrls] = useState("");
  const [faqText, setFaqText] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      await signup({
        full_name: fullName,
        email,
        password,
        company_name: companyName,
        website_url: websiteUrl,
        sitemap_url: sitemapUrl || undefined,
        doc_urls: splitDocUrls(docUrls),
        faq_text: faqText || undefined
      });
      navigate("/platform/app/overview");
    } catch {
      // handled in context
    }
  }

  return (
    <div className="platform-auth-page">
      <section className="platform-auth-hero">
        <p className="platform-auth-eyebrow">AeroConcierge Platform</p>
        <h1>Launch your branded concierge.</h1>
        <p>Connect domain, ingest knowledge, and deploy tenant-specific chat widget in minutes.</p>
      </section>

      <section className="platform-auth-card">
        <h2>Create Account</h2>

        <form onSubmit={handleSubmit} className="platform-form-grid">
          <label>
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>

          <label>
            Work email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            Password
            <div className="platform-password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
              <button
                type="button"
                className="platform-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label>
            Company name
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
          </label>

          <label>
            Website URL
            <input
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              required
            />
          </label>

          <label>
            Sitemap URL
            <input
              placeholder="https://example.com/sitemap.xml"
              value={sitemapUrl}
              onChange={(event) => setSitemapUrl(event.target.value)}
            />
          </label>

          <label>
            Doc URLs (comma/new line)
            <textarea
              rows={3}
              placeholder="https://example.com/refund, https://example.com/baggage"
              value={docUrls}
              onChange={(event) => setDocUrls(event.target.value)}
            />
          </label>

          <label>
            FAQs / support text
            <textarea
              rows={4}
              placeholder="Paste FAQs or policy text"
              value={faqText}
              onChange={(event) => setFaqText(event.target.value)}
            />
          </label>

          {error ? <p className="platform-error">{error}</p> : null}
          {loading ? (
            <p className="platform-success">
              Creating the workspace, saving sources, and starting knowledge base ingestion.
            </p>
          ) : null}

          <button className="platform-primary-btn" type="submit" disabled={loading}>
            {loading ? "Building workspace..." : "Create Workspace"}
          </button>
        </form>

        <p className="platform-auth-footnote">
          Already have an account? <Link to="/platform/login">Login</Link>
        </p>
      </section>
    </div>
  );
}
