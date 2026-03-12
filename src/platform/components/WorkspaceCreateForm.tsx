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
    <section className="platform-panel">
      <h2>Create your first workspace</h2>
      <p>Your account exists, but it does not have a tenant workspace attached yet. Create one here.</p>

      <form onSubmit={handleSubmit} className="platform-form-grid">
        <label>
          Company name
          <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
        </label>

        <label>
          Website URL
          <input
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://yourdomain.com"
            required
          />
        </label>

        <label>
          Sitemap URL
          <input
            value={sitemapUrl}
            onChange={(event) => setSitemapUrl(event.target.value)}
            placeholder="https://yourdomain.com/sitemap.xml"
          />
        </label>

        <label>
          Doc URLs (comma or new line)
          <textarea
            rows={4}
            value={docUrls}
            onChange={(event) => setDocUrls(event.target.value)}
            placeholder="https://yourdomain.com/refund"
          />
        </label>

        <label>
          FAQs / support text
          <textarea
            rows={5}
            value={faqText}
            onChange={(event) => setFaqText(event.target.value)}
            placeholder="Paste your FAQ and support text"
          />
        </label>

        {error ? <p className="platform-error">{error}</p> : null}
        {loading ? <p className="platform-success">Creating workspace and starting website ingestion.</p> : null}

        <button className="platform-primary-btn" type="submit" disabled={loading}>
          {loading ? "Creating workspace..." : "Create workspace"}
        </button>
      </form>
    </section>
  );
}
