import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Edit3, Plus, RotateCw, Trash2, X } from "lucide-react";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import { usePlatformAuth } from "@/platform/state/auth";
import type { PlatformSource, PlatformTenant } from "@/platform/types";

function parseLinks(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function statusClass(status: string) {
  if (status === "ready") return "ready";
  if (status === "processing") return "indexing";
  if (status === "error") return "error";
  return "pending";
}

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
  }, [tenant.tenant_id]);

  const grouped = useMemo(
    () => ({
      sitemap: sources.find((source) => source.source_type === "sitemap")?.source_value || "",
      urls: sources.filter((source) => source.source_type === "url").map((source) => source.source_value),
      faq: sources.find((source) => source.source_type === "faq")?.source_value || ""
    }),
    [sources]
  );

  useEffect(() => {
    setSitemapUrl(grouped.sitemap);
    setDocUrls(grouped.urls.join("\n"));
    setFaqText(grouped.faq);
  }, [grouped.sitemap, grouped.faq, grouped.urls.join("|")]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    setError("");

    const next: Array<{ source_type: "sitemap" | "url" | "faq" | "doc_text"; source_value: string }> = [];
    if (sitemapUrl.trim()) next.push({ source_type: "sitemap", source_value: sitemapUrl.trim() });
    for (const url of parseLinks(docUrls)) next.push({ source_type: "url", source_value: url });
    if (faqText.trim()) next.push({ source_type: "faq", source_value: faqText.trim() });

    try {
      const result = await saveTenantSources(tenant.tenant_id, next);
      setSources(result.sources);
      setStatus(
        result.knowledge_base.message ||
          (result.ingestion.errors.length > 0
            ? `Saved with warnings. Chunks: ${result.ingestion.inserted_chunks}.`
            : `Saved and indexed. Chunks: ${result.ingestion.inserted_chunks}.`)
      );
    } catch {
      // handled by context
    }
  }

  async function handleReindex() {
    setStatus("");
    setError("");

    try {
      const result = await runIngest(tenant.tenant_id, true);
      setStatus(
        result.errors.length > 0
          ? `Re-indexed with warnings. Chunks: ${result.inserted}.`
          : `Re-indexed successfully. Chunks: ${result.inserted}.`
      );
    } catch {
      // handled by context
    }
  }

  const kb = tenant.knowledge_base;

  return (
    <div className="mt-4 border-t border-[#0a0a0f]/08 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">Knowledge Base</span>
          <span className={`app-status-badge ${statusClass(kb.status)}`}>{kb.status}</span>
        </div>
        <button className="app-btn-secondary" type="button" onClick={handleReindex} disabled={loading}>
          <RotateCw size={15} aria-hidden />
          Re-index
        </button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <label className="app-form-group">
          <span>Sitemap URL</span>
          <input
            className="app-input"
            placeholder="https://example.com/sitemap.xml"
            value={sitemapUrl}
            onChange={(event) => setSitemapUrl(event.target.value)}
          />
        </label>
        <label className="app-form-group">
          <span>Doc URLs <span className="font-normal text-[#0a0a0f]/40">(one per line)</span></span>
          <textarea
            className="app-textarea"
            rows={3}
            value={docUrls}
            onChange={(event) => setDocUrls(event.target.value)}
            placeholder={"https://example.com/docs\nhttps://example.com/faq"}
          />
        </label>
        <label className="app-form-group">
          <span>FAQ / policy text</span>
          <textarea
            className="app-textarea"
            rows={4}
            value={faqText}
            onChange={(event) => setFaqText(event.target.value)}
            placeholder="Paste policy or FAQ content"
          />
        </label>
        {error ? <p className="app-error">{error}</p> : null}
        {status ? <p className="app-success">{status}</p> : null}
        <div className="app-action-row">
          <button className="app-btn-primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save sources"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TenantCard({
  tenant,
  onDelete
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

  useEffect(() => {
    setDomainValue(tenant.allowed_domains[0] ?? "");
  }, [tenant.tenant_id, tenant.allowed_domains.join("|")]);

  const verified = tenant.domain_verification?.status === "verified";
  const hasDomain = Boolean(tenant.allowed_domains[0]);

  async function handleDomainSave(event: React.FormEvent) {
    event.preventDefault();
    setDomainStatus("");
    setDomainError("");

    try {
      await updateTenantDomain({ tenant_id: tenant.tenant_id, website_url: domainValue });
      setDomainStatus("Domain updated.");
      setEditingDomain(false);
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : "Failed to update domain");
    }
  }

  return (
    <article className="app-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 font-[family-name:var(--font-display)] text-xl font-medium text-[#0a0a0f]">
              {tenant.name || tenant.tenant_id}
            </h3>
            <span className={`app-status-badge ${verified ? "ready" : "pending"}`}>
              {verified ? "DNS verified" : hasDomain ? "Pending DNS" : "Setup needed"}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#0a0a0f]/45">
            ID: <code className="rounded bg-[#0a0a0f]/05 px-1.5 py-0.5 text-xs">{tenant.tenant_id}</code>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="app-btn-secondary" type="button" onClick={() => setShowKb((value) => !value)}>
            <BookOpen size={15} aria-hidden />
            {showKb ? "Hide KB" : "Knowledge Base"}
          </button>
          <button
            className="app-btn-secondary"
            type="button"
            onClick={() => {
              setEditingDomain((value) => !value);
              setDomainStatus("");
              setDomainError("");
            }}
          >
            <Edit3 size={15} aria-hidden />
            Edit Domain
          </button>
          {!confirmDelete ? (
            <button className="app-btn-danger" type="button" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} aria-hidden />
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#0a0a0f]/55">Confirm?</span>
              <button
                className="app-btn-danger"
                type="button"
                onClick={() => onDelete(tenant.tenant_id)}
                disabled={loading}
              >
                Delete
              </button>
              <button className="app-btn-secondary" type="button" onClick={() => setConfirmDelete(false)}>
                <X size={15} aria-hidden />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {hasDomain ? (
          tenant.allowed_domains.slice(0, 2).map((domain) => (
            <span key={domain} className="rounded-full bg-[#0a0a0f]/05 px-2.5 py-1 text-xs text-[#0a0a0f]/55">
              {domain}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            No domain connected
          </span>
        )}
      </div>

      {editingDomain ? (
        <form onSubmit={handleDomainSave} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="app-form-group mb-0 min-w-[220px] flex-1">
            <span>Website URL</span>
            <input
              className="app-input"
              placeholder="https://new-domain.com"
              value={domainValue}
              onChange={(event) => setDomainValue(event.target.value)}
            />
          </label>
          <button className="app-btn-primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
          <button className="app-btn-secondary" type="button" onClick={() => setEditingDomain(false)}>
            Cancel
          </button>
          {domainError ? <p className="app-error w-full">{domainError}</p> : null}
          {domainStatus ? <p className="app-success w-full">{domainStatus}</p> : null}
        </form>
      ) : null}

      {showKb ? <KnowledgeEditor tenant={tenant} /> : null}
    </article>
  );
}

export default function TenantManagementPage() {
  const { profile, deleteTenant, loading } = usePlatformAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const createParam = searchParams.get("create") === "1";
  const [showCreate, setShowCreate] = useState(createParam);
  const [deleteError, setDeleteError] = useState("");

  const tenants = profile?.tenants ?? [];

  useEffect(() => {
    setShowCreate(createParam);
  }, [createParam]);

  function openCreateForm() {
    setShowCreate(true);
    setSearchParams({ create: "1" });
  }

  function closeCreateForm() {
    setShowCreate(false);
    setSearchParams({});
  }

  async function handleDelete(tenantId: string) {
    setDeleteError("");
    try {
      await deleteTenant(tenantId);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete project");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Workspace Management</p>
          <h2 className="app-h1">Projects</h2>
          <p className="app-lead">
            Create, update, and delete project workspaces. Manage knowledge sources for each project.
          </p>
        </div>
        {!showCreate ? (
          <button className="app-btn-primary" type="button" onClick={openCreateForm}>
            <Plus size={16} aria-hidden />
            New Project
          </button>
        ) : null}
      </div>

      <div className="app-stat-grid">
        <div className="app-stat-card teal">
          <p className="stat-label">Total projects</p>
          <p className="stat-value">{tenants.length}</p>
          <p className="stat-desc">Managed workspaces</p>
        </div>
        <div className="app-stat-card">
          <p className="stat-label">DNS Verified</p>
          <p className="stat-value">{tenants.filter((tenant) => tenant.domain_verification?.status === "verified").length}</p>
          <p className="stat-desc">Live widget enabled</p>
        </div>
        <div className="app-stat-card">
          <p className="stat-label">KB Ready</p>
          <p className="stat-value">{tenants.filter((tenant) => tenant.knowledge_base.status === "ready").length}</p>
          <p className="stat-desc">Indexed and serving answers</p>
        </div>
      </div>

      {showCreate ? (
        <WorkspaceCreateForm
          variant="inline"
          defaultMode="scratch"
          onCancel={closeCreateForm}
          onCreated={() => {
            closeCreateForm();
            navigate("/platform/app/site-setup");
          }}
        />
      ) : null}

      {deleteError ? <p className="app-error max-w-2xl">{deleteError}</p> : null}

      {tenants.length === 0 && !loading && !showCreate ? (
        <div className="app-empty mx-auto my-8 max-w-lg">
          <div className="empty-icon">+</div>
          <p className="empty-title">No projects yet</p>
          <p className="empty-desc">Create a project to start Setup & Content from scratch.</p>
        </div>
      ) : tenants.length > 0 ? (
        <div className="flex flex-col gap-5">
          {tenants.map((tenant) => (
            <TenantCard key={tenant.tenant_id} tenant={tenant} onDelete={handleDelete} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
