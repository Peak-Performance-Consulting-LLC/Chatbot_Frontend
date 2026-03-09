import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import type { PlatformSource } from "@/platform/types";
import { usePlatformAuth } from "@/platform/state/auth";

function parseLinks(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function withProtocol(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export default function SiteSetupPage() {
  const {
    selectedTenant,
    updateTenantDomain,
    verifyDomain,
    getTenantSources,
    saveTenantSources,
    runIngest,
    loading,
    error,
    setError
  } = usePlatformAuth();

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sources, setSources] = useState<PlatformSource[]>([]);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [docUrls, setDocUrls] = useState("");
  const [faqText, setFaqText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!selectedTenant) {
      return;
    }

    const domain = selectedTenant.allowed_domains?.[0] || "";
    setWebsiteUrl(domain ? `https://${domain}` : "");

    setError("");
    getTenantSources(selectedTenant.tenant_id)
      .then((rows) => setSources(rows))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sources"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.tenant_id]);

  const grouped = useMemo(() => {
    return {
      sitemap: sources.find((source) => source.source_type === "sitemap")?.source_value || "",
      urls: sources
        .filter((source) => source.source_type === "url")
        .map((source) => source.source_value),
      faq: sources.find((source) => source.source_type === "faq")?.source_value || ""
    };
  }, [sources]);

  useEffect(() => {
    setSitemapUrl(grouped.sitemap);
    setDocUrls(grouped.urls.join("\n"));
    setFaqText(grouped.faq);
  }, [grouped.sitemap, grouped.faq, grouped.urls.join("|")]);

  if (!selectedTenant) {
    return <WorkspaceCreateForm />;
  }

  const tenantId = selectedTenant.tenant_id;
  const verification = selectedTenant.domain_verification;
  const widget = selectedTenant.widget;

  async function handleSaveDomain(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    setError("");

    try {
      await updateTenantDomain({
        tenant_id: tenantId,
        website_url: withProtocol(websiteUrl)
      });
      setStatus("Website domain updated. Add the new TXT record and verify DNS.");
    } catch {
      // handled in context
    }
  }

  async function handleVerifyDomain() {
    setStatus("");
    setError("");
    try {
      await verifyDomain(tenantId);
      setStatus("DNS verification check completed.");
    } catch {
      // handled in context
    }
  }

  async function handleSaveSources(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    setError("");

    const nextSources: Array<{ source_type: "sitemap" | "url" | "faq" | "doc_text"; source_value: string }> = [];
    if (sitemapUrl.trim()) {
      nextSources.push({ source_type: "sitemap", source_value: sitemapUrl.trim() });
    }

    for (const url of parseLinks(docUrls)) {
      nextSources.push({ source_type: "url", source_value: url });
    }

    if (faqText.trim()) {
      nextSources.push({ source_type: "faq", source_value: faqText.trim() });
    }

    try {
      const rows = await saveTenantSources(tenantId, nextSources);
      setSources(rows);
      setStatus("Knowledge sources saved.");
    } catch {
      // handled in context
    }
  }

  async function handleReindex() {
    setStatus("");
    setError("");
    try {
      const result = await runIngest(tenantId, true);
      if (result.errors.length > 0) {
        setStatus(`Indexed with warnings. Chunks inserted: ${result.inserted}.`);
      } else {
        setStatus(`Knowledge indexed successfully. Chunks inserted: ${result.inserted}.`);
      }
    } catch {
      // handled in context
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setStatus("Copied to clipboard.");
  }

  return (
    <div className="platform-grid">
      <section className="platform-panel">
        <h2>Site Setup</h2>
        <p>Connect your website, verify ownership, index knowledge, and install the widget from one page.</p>

        <div className="setup-steps">
          <span className="setup-step-chip">1. Connect domain</span>
          <span className="setup-step-chip">2. Verify DNS</span>
          <span className="setup-step-chip">3. Index knowledge</span>
          <span className="setup-step-chip">4. Install widget</span>
        </div>
      </section>

      <section className="platform-panel">
        <h3>1) Connect Website Domain</h3>
        <form className="platform-form-grid" onSubmit={handleSaveDomain}>
          <label>
            Website URL
            <input
              placeholder="https://yourdomain.com"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
            />
          </label>
          <div className="action-row">
            <button className="platform-primary-btn" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save domain"}
            </button>
          </div>
        </form>
      </section>

      <section className="platform-panel">
        <h3>2) DNS Verification</h3>
        <div className="dns-grid">
          <article>
            <span>Connected domain</span>
            <strong>{selectedTenant.allowed_domains?.[0] || "Not set"}</strong>
          </article>
          <article>
            <span>Status</span>
            <strong>{verification?.status || "pending"}</strong>
          </article>
        </div>

        <div className="snippet-block">
          <p><strong>TXT host</strong></p>
          <code>{verification?.txt_name || "Not generated"}</code>
          <p><strong>TXT value</strong></p>
          <code>{verification?.txt_value || "Not generated"}</code>
        </div>

        <div className="action-row">
          <button className="platform-primary-btn" type="button" onClick={handleVerifyDomain} disabled={loading}>
            {loading ? "Checking..." : "Verify DNS"}
          </button>
        </div>
      </section>

      <section className="platform-panel">
        <h3>3) Knowledge Base</h3>
        <form className="platform-form-grid" onSubmit={handleSaveSources}>
          <label>
            Sitemap URL
            <input
              placeholder="https://yourdomain.com/sitemap.xml"
              value={sitemapUrl}
              onChange={(event) => setSitemapUrl(event.target.value)}
            />
          </label>

          <label>
            Doc URLs (one per line)
            <textarea
              rows={4}
              value={docUrls}
              onChange={(event) => setDocUrls(event.target.value)}
              placeholder="https://yourdomain.com/refund\nhttps://yourdomain.com/faq"
            />
          </label>

          <label>
            FAQs / policy text
            <textarea
              rows={5}
              value={faqText}
              onChange={(event) => setFaqText(event.target.value)}
              placeholder="Paste your support FAQ and policy text"
            />
          </label>

          <div className="action-row">
            <button className="platform-primary-btn" type="submit" disabled={loading}>
              Save sources
            </button>
            <button className="platform-secondary-btn" type="button" onClick={handleReindex} disabled={loading}>
              Re-index now
            </button>
          </div>
        </form>
      </section>

      <section className="platform-panel">
        <h3>4) Install + Test Widget</h3>
        <div className="snippet-block">
          <p><strong>Embed URL</strong></p>
          <textarea readOnly rows={2} value={widget?.embed_url || ""} />
          <button
            className="platform-secondary-btn"
            type="button"
            onClick={() => copy(widget?.embed_url || "")}
            disabled={!widget?.embed_url}
          >
            Copy embed URL
          </button>
        </div>

        <div className="snippet-block">
          <p><strong>Script snippet</strong></p>
          <textarea readOnly rows={10} value={widget?.script_snippet || ""} />
          <button
            className="platform-secondary-btn"
            type="button"
            onClick={() => copy(widget?.script_snippet || "")}
            disabled={!widget?.script_snippet}
          >
            Copy script
          </button>
        </div>

        <div className="action-row">
          <Link className="platform-link-btn" to="/platform/app/chatbot">
            Open chatbot preview
          </Link>
          {widget?.embed_url ? (
            <a className="platform-link-btn" href={widget.embed_url} target="_blank" rel="noreferrer">
              Open standalone widget
            </a>
          ) : null}
        </div>
      </section>

      {error ? <p className="platform-error">{error}</p> : null}
      {status ? <p className="platform-success">{status}</p> : null}
    </div>
  );
}
