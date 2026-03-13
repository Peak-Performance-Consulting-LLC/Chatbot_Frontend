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
    if (!selectedTenant) return;
    setError("");
    getTenantSources(selectedTenant.tenant_id)
      .then((rows) => setSources(rows))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sources"));
  }, [selectedTenant?.tenant_id]);

  const grouped = useMemo(() => ({
    sitemap: sources.find((s) => s.source_type === "sitemap")?.source_value || "",
    urls: sources.filter((s) => s.source_type === "url").map((s) => s.source_value),
    faq: sources.find((s) => s.source_type === "faq")?.source_value || "",
  }), [sources]);

  useEffect(() => {
    setSitemapUrl(grouped.sitemap);
    setDocUrls(grouped.urls.join("\n"));
    setFaqText(grouped.faq);
  }, [grouped.sitemap, grouped.faq, grouped.urls.join("|")]);

  if (!selectedTenant) {
    return (
      <div className="app-empty" style={{ maxWidth: 480, margin: "4rem auto" }}>
        <div className="empty-icon">🧠</div>
        <p className="empty-title">No workspace selected</p>
        <p className="empty-desc">Select a tenant to manage knowledge sources.</p>
      </div>
    );
  }

  const tenantId = selectedTenant.tenant_id;
  const kb = selectedTenant.knowledge_base;
  const groupedSources = [
    { label: "Sitemap", value: grouped.sitemap },
    ...grouped.urls.map((value, i) => ({ label: `Documentation ${i + 1}`, value })),
    ...(grouped.faq ? [{ label: "FAQ / Policies", value: grouped.faq }] : []),
  ].filter((s) => s.value);

  const statusClass =
    kb.status === "ready" ? "ready" :
    kb.status === "processing" ? "indexing" :
    kb.status === "error" ? "error" : "pending";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(""); setError("");
    const nextSources: Array<{ source_type: "sitemap"|"url"|"faq"|"doc_text"; source_value: string }> = [];
    if (sitemapUrl.trim()) nextSources.push({ source_type: "sitemap", source_value: sitemapUrl.trim() });
    for (const url of parseLinks(docUrls)) nextSources.push({ source_type: "url", source_value: url });
    if (faqText.trim()) nextSources.push({ source_type: "faq", source_value: faqText.trim() });
    try {
      const rows = await saveTenantSources(tenantId, nextSources);
      setSources(rows);
      setStatus("Sources saved. Run re-index to refresh knowledge chunks.");
    } catch { /* handled by context */ }
  }

  async function handleReindex() {
    if (!selectedTenant) return;
    setStatus(""); setError("");
    try {
      const result = await runIngest(tenantId, true);
      setStatus(result.errors.length > 0
        ? `Indexed with warnings. Chunks inserted: ${result.inserted}.`
        : `Knowledge indexed successfully. Chunks inserted: ${result.inserted}.`);
    } catch { /* handled by context */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Page header ────────────────────────────────────────── */}
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Knowledge Ops</p>
          <h2 className="app-h1">Knowledge Base</h2>
          <p className="app-lead">
            Manage sitemap, support URLs, and FAQ text for tenant-scoped RAG answers.
          </p>
        </div>
        <button className="app-btn-primary" type="button" onClick={handleReindex} disabled={loading}>
          {loading ? "Indexing…" : "↺ Re-index knowledge"}
        </button>
      </div>

      {/* ── Stat strip ─────────────────────────────────────────── */}
      <div className="app-stat-grid">
        <div className="app-stat-card">
          <p className="stat-label">Total sources</p>
          <p className="stat-value">{sources.length}</p>
          <p className="stat-desc">Connected content endpoints</p>
        </div>
        <div className={`app-stat-card ${kb.status === "ready" ? "teal" : kb.status === "error" ? "" : "gold"}`}>
          <p className="stat-label">Status</p>
          <p className="stat-value" style={{ fontSize: "1.15rem", marginTop: "4px" }}>{kb.status}</p>
          <p className="stat-desc">{kb.message || "Knowledge is ready for tenant answers."}</p>
        </div>
        <div className="app-stat-card">
          <p className="stat-label">Last indexed</p>
          <p className="stat-value" style={{ fontSize: "1rem", marginTop: "4px" }}>
            {kb.last_ingested_at ? new Date(kb.last_ingested_at).toLocaleDateString() : "Pending"}
          </p>
          <p className="stat-desc">
            {kb.last_ingested_at ? new Date(kb.last_ingested_at).toLocaleTimeString() : "Awaiting first index run"}
          </p>
        </div>
      </div>

      {/* ── Two-col: sources list + form ───────────────────────── */}
      <div className="app-two-col">

        {/* Current sources */}
        <div className="app-card">
          <p className="app-card-title">Current sources</p>
          {groupedSources.length > 0 ? (
            <div className="app-source-list">
              {groupedSources.map((src) => (
                <div key={`${src.label}-${src.value.slice(0, 40)}`} className="app-source-item">
                  <div>
                    <p className="src-name">{src.label}</p>
                    <p className="src-value">{src.value}</p>
                  </div>
                  <span className={`app-status-badge ${statusClass}`}>{kb.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="app-empty" style={{ padding: "32px 16px" }}>
              <div className="empty-icon">📄</div>
              <p className="empty-title">No sources yet</p>
              <p className="empty-desc">Add a sitemap, support URLs, or FAQ text to start grounding answers.</p>
            </div>
          )}
        </div>

        {/* Add / update sources */}
        <div className="app-card">
          <p className="app-card-title">Add or update sources</p>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="app-form-group">
              <span>Sitemap URL</span>
              <input
                className="app-input"
                placeholder="https://example.com/sitemap.xml"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
              />
            </div>

            <div className="app-form-group">
              <span>Doc URLs <span style={{ color: "rgba(10,10,15,0.4)", fontWeight: 400 }}>(one per line)</span></span>
              <textarea
                className="app-textarea"
                rows={4}
                value={docUrls}
                onChange={(e) => setDocUrls(e.target.value)}
                placeholder={"https://example.com/refund\nhttps://example.com/contact"}
              />
            </div>

            <div className="app-form-group">
              <span>FAQ / policy text</span>
              <textarea
                className="app-textarea"
                rows={6}
                value={faqText}
                onChange={(e) => setFaqText(e.target.value)}
                placeholder="Paste policy and FAQ content…"
              />
            </div>

            {error  && <p className="app-error">{error}</p>}
            {status && <p className="app-success">{status}</p>}

            <div className="app-action-row" style={{ marginTop: "4px" }}>
              <button className="app-btn-primary" type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save sources"}
              </button>
              <button className="app-btn-secondary" type="button" onClick={handleReindex} disabled={loading}>
                Re-index knowledge
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
