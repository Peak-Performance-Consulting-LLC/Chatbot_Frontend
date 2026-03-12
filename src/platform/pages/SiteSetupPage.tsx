import { useEffect, useMemo, useState } from "react";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import { getDnsReminderMessage, getDnsStatusLabel, getDnsStatusTone, getKnowledgeStatusLabel, getKnowledgeStatusTone } from "@/platform/status";
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

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Not available yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
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
  const knowledgeBase = selectedTenant.knowledge_base;
  const widget = selectedTenant.widget;
  const widgetBlocked = widget?.enabled === false;

  async function handleSaveDomain(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    setError("");

    try {
      await updateTenantDomain({
        tenant_id: tenantId,
        website_url: withProtocol(websiteUrl)
      });
      setStatus("Website domain updated. Replace the DNS TXT record with the new verification value before going live.");
    } catch {
      // handled in context
    }
  }

  async function handleVerifyDomain() {
    setStatus("");
    setError("");
    try {
      const result = await verifyDomain(tenantId);
      setStatus(result.message);
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
      setStatus("Knowledge sources saved. Run indexing to refresh the chatbot with the latest content.");
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
        setStatus(`Knowledge indexing completed with warnings. Chunks inserted: ${result.inserted}.`);
      } else {
        setStatus(`Knowledge indexing completed. Chunks inserted: ${result.inserted}.`);
      }
    } catch {
      // handled in context
    }
  }

  async function copy(value: string | null | undefined) {
    if (!value) {
      return;
    }
    await navigator.clipboard.writeText(value);
    setStatus("Copied to clipboard.");
  }

  return (
    <div className="platform-grid">
      <section className="platform-panel">
        <h2>Site Setup</h2>
        <p>Connect your website, verify ownership, keep the knowledge base fresh, and unlock live widget install after DNS verification.</p>

        <div className="setup-steps">
          <span className="setup-step-chip">1. Connect domain</span>
          <span className="setup-step-chip">2. Verify DNS</span>
          <span className="setup-step-chip">3. Index knowledge</span>
          <span className="setup-step-chip">4. Install widget</span>
        </div>
      </section>

      <div className="platform-grid two-col">
        <section className="platform-panel">
          <h3>Workspace readiness</h3>
          <div className="status-card-grid">
            <article className={`status-card tone-${getDnsStatusTone(verification?.status)}`}>
              <span>DNS status</span>
              <strong>{getDnsStatusLabel(verification?.status)}</strong>
              <p>{getDnsReminderMessage(verification)}</p>
            </article>
            <article className={`status-card tone-${getKnowledgeStatusTone(knowledgeBase.status)}`}>
              <span>Knowledge base</span>
              <strong>{getKnowledgeStatusLabel(knowledgeBase.status)}</strong>
              <p>{knowledgeBase.message || "No indexing activity yet."}</p>
            </article>
          </div>

          {widgetBlocked ? (
            <div className="platform-callout warning">
              <strong>Website widget is blocked</strong>
              <p>{widget?.blocked_reason}</p>
            </div>
          ) : (
            <div className="platform-callout success">
              <strong>Website widget is ready</strong>
              <p>Your DNS is verified. You can now install the widget on the live website.</p>
            </div>
          )}
        </section>

        <section className="platform-panel">
          <h3>Portal testing</h3>
          <p>You can continue testing the chatbot inside the portal before DNS verification. Only the live website widget is blocked.</p>
          <div className="platform-inline-note">
            <strong>Last knowledge refresh</strong>
            <p>{formatTimestamp(knowledgeBase.last_ingested_at)}</p>
          </div>
        </section>
      </div>

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
            <strong>{getDnsStatusLabel(verification?.status)}</strong>
          </article>
          <article>
            <span>Last checked</span>
            <strong>{formatTimestamp(verification?.last_checked_at)}</strong>
          </article>
          <article>
            <span>Verified at</span>
            <strong>{formatTimestamp(verification?.verified_at)}</strong>
          </article>
        </div>

        <div className="snippet-block">
          <p><strong>TXT host</strong></p>
          <code>{verification?.txt_name || "Not generated"}</code>
          <p><strong>TXT value</strong></p>
          <code>{verification?.txt_value || "Not generated"}</code>
          {verification?.last_seen_records?.length ? (
            <>
              <p><strong>Latest TXT records found</strong></p>
              <code>{verification.last_seen_records.join("\n")}</code>
            </>
          ) : null}
          {verification?.last_error ? <p className="platform-error">{verification.last_error}</p> : null}
        </div>

        <div className="action-row">
          <button className="platform-primary-btn" type="button" onClick={handleVerifyDomain} disabled={loading}>
            {loading ? "Checking..." : "Verify DNS"}
          </button>
          <button className="platform-secondary-btn" type="button" onClick={() => copy(verification?.txt_value)}>
            Copy TXT value
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
              {knowledgeBase.status === "processing" ? "Indexing..." : "Re-index now"}
            </button>
          </div>
        </form>
      </section>

      <section className="platform-panel">
        <h3>4) Widget Availability</h3>
        {widget?.enabled ? (
          <div className="snippet-block">
            <p><strong>Embed URL</strong></p>
            <code>{widget.embed_url}</code>
            <div className="action-row">
              <button className="platform-secondary-btn" type="button" onClick={() => copy(widget.embed_url)}>
                Copy URL
              </button>
            </div>
          </div>
        ) : (
          <div className="platform-callout warning">
            <strong>Complete DNS verification before installing the widget</strong>
            <p>{widget?.blocked_reason || "Widget installation is blocked until DNS verification succeeds."}</p>
          </div>
        )}
      </section>

      {error ? <p className="platform-error">{error}</p> : null}
      {status ? <p className="platform-success">{status}</p> : null}
    </div>
  );
}
