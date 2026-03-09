import { useEffect, useMemo, useState } from "react";
import type { PlatformSource } from "@/platform/types";
import { usePlatformAuth } from "@/platform/state/auth";

function parseLinks(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function KnowledgePage() {
  const { selectedTenant, getTenantSources, saveTenantSources, runIngest, loading, error, setError } = usePlatformAuth();

  const [sources, setSources] = useState<PlatformSource[]>([]);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [docUrls, setDocUrls] = useState("");
  const [faqText, setFaqText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!selectedTenant) {
      return;
    }

    setError("");
    getTenantSources(selectedTenant.tenant_id)
      .then((rows) => setSources(rows))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sources"));
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
    return <section className="platform-panel"><p>Select a tenant to manage knowledge sources.</p></section>;
  }

  const tenantId = selectedTenant.tenant_id;

  async function handleSave(event: React.FormEvent) {
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
      setStatus("Sources saved. Run re-index to refresh knowledge chunks.");
    } catch {
      // handled by context
    }
  }

  async function handleReindex() {
    if (!selectedTenant) {
      return;
    }

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
      // handled by context
    }
  }

  return (
    <section className="platform-panel">
      <h2>Knowledge Base</h2>
      <p>Manage sitemap, support URLs, and FAQ text for tenant-scoped RAG answers.</p>

      <form onSubmit={handleSave} className="platform-form-grid">
        <label>
          Sitemap URL
          <input
            placeholder="https://example.com/sitemap.xml"
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
            placeholder="https://example.com/refund\nhttps://example.com/contact"
          />
        </label>

        <label>
          FAQ / policy text
          <textarea
            rows={6}
            value={faqText}
            onChange={(event) => setFaqText(event.target.value)}
            placeholder="Paste policy and FAQ content"
          />
        </label>

        <div className="action-row">
          <button className="platform-primary-btn" type="submit" disabled={loading}>Save sources</button>
          <button className="platform-secondary-btn" type="button" onClick={handleReindex} disabled={loading}>Re-index knowledge</button>
        </div>

        {error ? <p className="platform-error">{error}</p> : null}
        {status ? <p className="platform-success">{status}</p> : null}
      </form>
    </section>
  );
}
