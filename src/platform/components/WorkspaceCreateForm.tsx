import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

function splitDocUrls(input: string): string[] {
  return input
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function WorkspaceCreateForm() {
  const navigate = useNavigate();
  const { createWorkspace, loading, error, setError } = usePlatformAuth();

  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [docUrls, setDocUrls] = useState("");
  const [faqText, setFaqText] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      await createWorkspace({
        company_name: companyName,
        website_url: websiteUrl,
        sitemap_url: sitemapUrl || undefined,
        doc_urls: splitDocUrls(docUrls),
        faq_text: faqText || undefined
      });
      navigate("/platform/app/site-setup");
    } catch {
      // handled in context
    }
  }

  return (
    <div className="space-y-6">
      <div className="app-page-header">
        <div>
          <p className="app-kicker">First Workspace</p>
          <h2 className="app-h1">Create your first workspace</h2>
          <p className="app-lead">
            Your account is active, but it does not have a workspace attached yet. Add the
            website, sitemap, and support content here to initialize onboarding cleanly.
          </p>
        </div>
      </div>

      <div className="app-stat-grid">
        <div className="app-stat-card teal">
          <p className="stat-label">Step 1</p>
          <p className="stat-value">Domain</p>
          <p className="stat-desc">Connect the primary website URL for this workspace.</p>
        </div>
        <div className="app-stat-card gold">
          <p className="stat-label">Step 2</p>
          <p className="stat-value">Sources</p>
          <p className="stat-desc">Seed the knowledge base with sitemap, docs, and FAQs.</p>
        </div>
      </div>

      <section className="app-card">
        <p className="app-card-subtitle">Workspace Setup</p>
        <h3 className="app-card-title">Business and website details</h3>

        <form onSubmit={handleSubmit} className="app-form-grid">
          <label>
            <span>Company name</span>
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Business Class Booking Hub"
              required
            />
          </label>

          <label>
            <span>Website URL</span>
            <input
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="https://yourdomain.com"
              required
            />
          </label>

          <label>
            <span>Sitemap URL</span>
            <input
              value={sitemapUrl}
              onChange={(event) => setSitemapUrl(event.target.value)}
              placeholder="https://yourdomain.com/sitemap.xml"
            />
          </label>

          <label className="full">
            <span>Doc URLs</span>
            <textarea
              rows={4}
              value={docUrls}
              onChange={(event) => setDocUrls(event.target.value)}
              placeholder={"https://yourdomain.com/refund\nhttps://yourdomain.com/policy"}
            />
          </label>

          <label className="full">
            <span>FAQs / support text</span>
            <textarea
              rows={6}
              value={faqText}
              onChange={(event) => setFaqText(event.target.value)}
              placeholder="Paste your FAQ and support text"
            />
          </label>

          {error ? (
            <div className="full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="full rounded-xl border border-[#1a5c5c]/20 bg-[#1a5c5c]/[0.04] px-4 py-3 text-sm text-[#1a5c5c]">
              Creating workspace and starting the initial website setup.
            </div>
          ) : null}

          <div className="full app-action-row">
            <button className="app-btn-primary" type="submit" disabled={loading}>
              {loading ? "Creating workspace..." : "Create workspace"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
