import { useEffect, useMemo, useState } from "react";
import { usePlatformAuth } from "@/platform/state/auth";
import type { PlatformSource, PlatformTenant } from "@/platform/types";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function parseLinks(value: string): string[] {
  return value.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
}

function statusClass(status: string) {
  if (status === "ready") return "ready";
  if (status === "processing") return "indexing";
  if (status === "error") return "error";
  return "pending";
}

/* ─── KB inline editor ────────────────────────────────────────────────────── */
function KnowledgeEditor({ tenant }: { tenant: PlatformTenant }) {
  const { getTenantSources, saveTenantSources, runIngest, loading, error, setError } = usePlatformAuth();
  const [sources, setSources] = useState<PlatformSource[]>([]);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [docUrls, setDocUrls] = useState("");
  const [faqText, setFaqText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setError("");
    getTenantSources(tenant.tenant_id)
      .then((rows) => setSources(rows))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sources"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.tenant_id]);

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(""); setError("");
    const next: Array<{ source_type: "sitemap" | "url" | "faq" | "doc_text"; source_value: string }> = [];
    if (sitemapUrl.trim()) next.push({ source_type: "sitemap", source_value: sitemapUrl.trim() });
    for (const u of parseLinks(docUrls)) next.push({ source_type: "url", source_value: u });
    if (faqText.trim()) next.push({ source_type: "faq", source_value: faqText.trim() });
    try {
      const result = await saveTenantSources(tenant.tenant_id, next);
      setSources(result.sources);
      setStatus(result.ingestion.errors.length > 0
        ? `Saved with warnings. Chunks: ${result.ingestion.inserted_chunks}.`
        : `Saved & indexed. Chunks: ${result.ingestion.inserted_chunks}.`);
    } catch { /* handled by context */ }
  }

  async function handleReindex() {
    setStatus(""); setError("");
    try {
      const result = await runIngest(tenant.tenant_id, true);
      setStatus(result.errors.length > 0
        ? `Re-indexed with warnings. Chunks: ${result.inserted}.`
        : `Re-indexed successfully. Chunks: ${result.inserted}.`);
    } catch { /* handled by context */ }
  }

  const kb = tenant.knowledge_base;

  return (
    <div style={{ marginTop: "16px", borderTop: "1px solid rgba(10,10,15,0.08)", paddingTop: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(10,10,15,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Knowledge Base</span>
          <span className={`app-status-badge ${statusClass(kb.status)}`}>{kb.status}</span>
        </div>
        <button className="app-btn-secondary" type="button" onClick={handleReindex} disabled={loading} style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
          ↺ Re-index
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="app-form-group">
          <span style={{ fontSize: "0.82rem" }}>Sitemap URL</span>
          <input className="app-input" placeholder="https://example.com/sitemap.xml" value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)} />
        </div>
        <div className="app-form-group">
          <span style={{ fontSize: "0.82rem" }}>Doc URLs <span style={{ color: "rgba(10,10,15,0.4)", fontWeight: 400 }}>(one per line)</span></span>
          <textarea className="app-textarea" rows={3} value={docUrls} onChange={(e) => setDocUrls(e.target.value)}
            placeholder={"https://example.com/docs\nhttps://example.com/faq"} />
        </div>
        <div className="app-form-group">
          <span style={{ fontSize: "0.82rem" }}>FAQ / Policy text</span>
          <textarea className="app-textarea" rows={4} value={faqText} onChange={(e) => setFaqText(e.target.value)}
            placeholder="Paste policy or FAQ content…" />
        </div>
        {error  && <p className="app-error">{error}</p>}
        {status && <p className="app-success">{status}</p>}
        <div className="app-action-row">
          <button className="app-btn-primary" type="submit" disabled={loading} style={{ fontSize: "0.85rem" }}>
            {loading ? "Saving…" : "Save sources"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Tenant card ─────────────────────────────────────────────────────────── */
function TenantCard({
  tenant,
  onDelete,
}: {
  tenant: PlatformTenant;
  onDelete: (id: string) => void;
}) {
  const { updateTenantDomain, loading } = usePlatformAuth();
  const [showKb, setShowKb] = useState(false);
  const [editingDomain, setEditingDomain] = useState(false);
  const [domainValue, setDomainValue] = useState(tenant.allowed_domains[0] ?? "");
  const [domainStatus, setDomainStatus] = useState("");
  const [domainError, setDomainError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const verified = tenant.domain_verification?.status === "verified";

  async function handleDomainSave(e: React.FormEvent) {
    e.preventDefault();
    setDomainStatus(""); setDomainError("");
    try {
      await updateTenantDomain({ tenant_id: tenant.tenant_id, website_url: domainValue });
      setDomainStatus("Domain updated.");
      setEditingDomain(false);
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : "Failed to update domain");
    }
  }

  return (
    <div className="app-card" style={{ position: "relative" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "1.2rem", fontWeight: 500, color: "#0a0a0f" }}>
              {tenant.name || tenant.tenant_id}
            </span>
            <span className={`app-status-badge ${verified ? "ready" : "pending"}`}>
              {verified ? "DNS Verified" : "Pending"}
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "rgba(10,10,15,0.45)", marginTop: "3px" }}>
            ID: <code style={{ fontSize: "0.78rem", background: "rgba(10,10,15,0.05)", padding: "1px 5px", borderRadius: "4px" }}>{tenant.tenant_id}</code>
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            className="app-btn-secondary"
            type="button"
            onClick={() => setShowKb((v) => !v)}
            style={{ fontSize: "0.82rem", padding: "6px 14px" }}
          >
            {showKb ? "Hide KB" : "🧠 Knowledge Base"}
          </button>
          <button
            className="app-btn-secondary"
            type="button"
            onClick={() => { setEditingDomain((v) => !v); setDomainStatus(""); setDomainError(""); }}
            style={{ fontSize: "0.82rem", padding: "6px 14px" }}
          >
            ✏️ Edit Domain
          </button>
          {!confirmDelete ? (
            <button
              className="app-btn-danger"
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{ fontSize: "0.82rem", padding: "6px 14px" }}
            >
              🗑 Delete
            </button>
          ) : (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "rgba(10,10,15,0.55)" }}>Sure?</span>
              <button
                className="app-btn-danger"
                type="button"
                onClick={() => onDelete(tenant.tenant_id)}
                disabled={loading}
                style={{ fontSize: "0.82rem", padding: "5px 12px" }}
              >
                Yes, Delete
              </button>
              <button
                className="app-btn-secondary"
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{ fontSize: "0.82rem", padding: "5px 12px" }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Domain info row */}
      <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
        {(tenant.allowed_domains).slice(0, 2).map((d) => (
          <span key={d} style={{ fontSize: "0.78rem", background: "rgba(10,10,15,0.05)", padding: "2px 8px", borderRadius: "20px", color: "rgba(10,10,15,0.55)" }}>
            {d}
          </span>
        ))}
      </div>

      {/* Domain edit form */}
      {editingDomain && (
        <form onSubmit={handleDomainSave} style={{ marginTop: "14px", display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="app-form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
            <span style={{ fontSize: "0.82rem" }}>New website URL</span>
            <input
              className="app-input"
              placeholder="https://new-domain.com"
              value={domainValue}
              onChange={(e) => setDomainValue(e.target.value)}
            />
          </div>
          <button className="app-btn-primary" type="submit" disabled={loading} style={{ fontSize: "0.82rem", padding: "9px 18px" }}>
            {loading ? "Saving…" : "Save"}
          </button>
          <button className="app-btn-secondary" type="button" onClick={() => setEditingDomain(false)} style={{ fontSize: "0.82rem", padding: "9px 14px" }}>
            Cancel
          </button>
          {domainError  && <p className="app-error" style={{ width: "100%", margin: 0 }}>{domainError}</p>}
          {domainStatus && <p className="app-success" style={{ width: "100%", margin: 0 }}>{domainStatus}</p>}
        </form>
      )}

      {/* Knowledge Base inline editor */}
      {showKb && <KnowledgeEditor tenant={tenant} />}
    </div>
  );
}

/* ─── Create workspace form ───────────────────────────────────────────────── */
function CreateTenantForm({ onClose }: { onClose: () => void }) {
  const { createWorkspace, loading, error, setError } = usePlatformAuth();
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [faqText, setFaqText] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createWorkspace({
        company_name: companyName,
        website_url: websiteUrl,
        sitemap_url: sitemapUrl || undefined,
        faq_text: faqText || undefined,
      });
      setDone(true);
    } catch { /* handled by context */ }
  }

  if (done) {
    return (
      <div className="app-card" style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🎉</div>
        <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "1.3rem", marginBottom: "8px" }}>Tenant created!</p>
        <p style={{ fontSize: "0.85rem", color: "rgba(10,10,15,0.5)", marginBottom: "20px" }}>Your new workspace is ready. You can now manage its knowledge base and chatbot settings.</p>
        <button className="app-btn-secondary" type="button" onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div className="app-card">
      <p className="app-card-title">Create new tenant</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div className="app-form-group">
          <span>Company / brand name <span style={{ color: "#c0392b" }}>*</span></span>
          <input className="app-input" required placeholder="Acme Travel" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="app-form-group">
          <span>Website URL <span style={{ color: "#c0392b" }}>*</span></span>
          <input className="app-input" required type="url" placeholder="https://acme-travel.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </div>
        <div className="app-form-group">
          <span>Sitemap URL <span style={{ color: "rgba(10,10,15,0.4)", fontWeight: 400 }}>(optional)</span></span>
          <input className="app-input" placeholder="https://acme-travel.com/sitemap.xml" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} />
        </div>
        <div className="app-form-group">
          <span>FAQ / Policy text <span style={{ color: "rgba(10,10,15,0.4)", fontWeight: 400 }}>(optional)</span></span>
          <textarea className="app-textarea" rows={4} placeholder="Paste FAQ or policy content…" value={faqText} onChange={(e) => setFaqText(e.target.value)} />
        </div>
        {error && <p className="app-error">{error}</p>}
        <div className="app-action-row">
          <button className="app-btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create tenant"}
          </button>
          <button className="app-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function TenantManagementPage() {
  const { profile, deleteTenant, loading } = usePlatformAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const tenants = profile?.tenants ?? [];

  async function handleDelete(tenantId: string) {
    setDeleteError("");
    try {
      await deleteTenant(tenantId);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete tenant");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Workspace Management</p>
          <h2 className="app-h1">Tenants</h2>
          <p className="app-lead">
            Create, update, and delete tenant workspaces. Manage knowledge base sources for each tenant.
          </p>
        </div>
        {!showCreate && (
          <button className="app-btn-primary" type="button" onClick={() => setShowCreate(true)}>
            + New Tenant
          </button>
        )}
      </div>

      {/* ── Stat strip ────────────────────────────────────────────────── */}
      <div className="app-stat-grid">
        <div className="app-stat-card teal">
          <p className="stat-label">Total tenants</p>
          <p className="stat-value">{tenants.length}</p>
          <p className="stat-desc">Managed workspaces</p>
        </div>
        <div className="app-stat-card">
          <p className="stat-label">DNS Verified</p>
          <p className="stat-value">{tenants.filter((t) => t.domain_verification?.status === "verified").length}</p>
          <p className="stat-desc">Live widget enabled</p>
        </div>
        <div className="app-stat-card">
          <p className="stat-label">KB Ready</p>
          <p className="stat-value">{tenants.filter((t) => t.knowledge_base.status === "ready").length}</p>
          <p className="stat-desc">Indexed & serving answers</p>
        </div>
      </div>

      {/* ── Create form (inline) ───────────────────────────────────────── */}
      {showCreate && (
        <CreateTenantForm onClose={() => setShowCreate(false)} />
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {deleteError && (
        <p className="app-error" style={{ maxWidth: 600 }}>{deleteError}</p>
      )}

      {/* ── Tenant list ───────────────────────────────────────────────── */}
      {tenants.length === 0 && !loading ? (
        <div className="app-empty" style={{ maxWidth: 480, margin: "2rem auto" }}>
          <div className="empty-icon">🏢</div>
          <p className="empty-title">No tenants yet</p>
          <p className="empty-desc">Click "New Tenant" above to create your first workspace.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant.tenant_id}
              tenant={tenant}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
