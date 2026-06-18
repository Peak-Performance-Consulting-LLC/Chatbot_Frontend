import { useEffect, useMemo, useState } from "react";
import { BedDouble, Check, CircleSlash, Plane } from "lucide-react";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import {
  getDnsRelativeHost,
  getDnsReminderMessage,
  getDnsStatusLabel,
  getDnsStatusTone,
  getDnsZoneDomain,
  getKnowledgeStatusLabel,
  getKnowledgeStatusTone
} from "@/platform/status";
import type { PlatformService, PlatformSource } from "@/platform/types";
import { usePlatformAuth } from "@/platform/state/auth";

function parseLinks(value: string): string[] {
  return value.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
}
function withProtocol(value: string): string {
  const t = value.trim();
  if (!t) return t;
  return t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;
}
function formatTs(value?: string | null) {
  if (!value) return "Not available yet";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}

const stepStyle = {
  done:   "bg-[#1a5c5c]/10 text-[#1a5c5c] border-[#1a5c5c]/20",
  active: "bg-[#c9a96e]/10 text-[#a07840] border-[#c9a96e]/30",
  pending:"bg-[#0a0a0f]/05 text-[#0a0a0f]/30 border-[#0a0a0f]/08",
};

const DEAL_OPTIONS: Array<{
  id: "flights" | "hotels" | "other";
  label: string;
  description: string;
  icon: typeof Plane;
}> = [
  {
    id: "hotels",
    label: "Hotels",
    description: "Show hotel stay prompts and deal requests in the chatbox.",
    icon: BedDouble
  },
  {
    id: "flights",
    label: "Flight booking",
    description: "Show flight search prompts and live fare deals in the chatbox.",
    icon: Plane
  },
  {
    id: "other",
    label: "Other",
    description: "Keep the chatbox focused on support and knowledge answers.",
    icon: CircleSlash
  }
];

function buildDealChatDefaults(services: PlatformService[]) {
  const quickReplies = ["I have a question", "Contact support"];

  if (services.length === 0) {
    return {
      welcomeMessage: "Welcome. How can I help today?",
      quickReplies,
      notifChips: quickReplies
    };
  }

  return {
    welcomeMessage: "Welcome. How can I help today?",
    quickReplies,
    notifChips: quickReplies
  };
}

export default function SiteSetupPage() {
  const { selectedTenant, updateTenantDomain, updateTenantProfile, verifyDomain, getTenantSources, saveTenantSources, runIngest, loading, error, setError } = usePlatformAuth();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [dealServices, setDealServices] = useState<PlatformService[]>([]);
  const [sources, setSources] = useState<PlatformSource[]>([]);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [docUrls, setDocUrls] = useState("");
  const [faqText, setFaqText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!selectedTenant) return;
    const domain = selectedTenant.allowed_domains?.[0] || "";
    setWebsiteUrl(domain ? `https://${domain}` : "");
    setDealServices(
      (selectedTenant.business_profile.supported_services || []).filter((service) =>
        service === "flights" || service === "hotels"
      )
    );
    setError("");
    getTenantSources(selectedTenant.tenant_id).then(setSources).catch((e: Error) => setError(e.message || "Failed to load sources"));
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

  if (!selectedTenant) return <WorkspaceCreateForm />;

  const tenantId = selectedTenant.tenant_id;
  const verification = selectedTenant.domain_verification;
  const knowledgeBase = selectedTenant.knowledge_base;
  const widget = selectedTenant.widget;
  const hasDomain = Boolean(selectedTenant.allowed_domains?.[0]);
  const widgetBlocked = widget?.enabled === false;
  const zoneDomain = getDnsZoneDomain(selectedTenant.allowed_domains);
  const relativeHost = getDnsRelativeHost(verification?.txt_name, selectedTenant.allowed_domains);

  const progressSteps = [
    { label: "Connect domain",  state: hasDomain ? "done" : "active" },
    { label: "Verify DNS",      state: verification?.status === "verified" ? "done" : hasDomain ? "active" : "pending" },
    { label: "Index knowledge", state: (knowledgeBase.status === "ready" || knowledgeBase.status === "warning") ? "done" : "active" },
    { label: "Install widget",  state: widget?.enabled ? "done" : "pending" },
  ] as const;

  async function handleSaveDomain(e: React.FormEvent) {
    e.preventDefault(); setStatus(""); setError("");
    try { await updateTenantDomain({ tenant_id: tenantId, website_url: withProtocol(websiteUrl) }); setStatus("Website domain updated."); } catch {}
  }
  async function handleVerifyDomain() {
    setStatus(""); setError("");
    if (!verification) {
      setStatus("Save a website domain first to generate DNS verification records.");
      return;
    }
    try { const r = await verifyDomain(tenantId); setStatus(r.message); } catch {}
  }
  async function handleSaveDealServices() {
    setStatus(""); setError("");
    try {
      const chatDefaults = buildDealChatDefaults(dealServices);
      await updateTenantProfile({
        tenant_id: tenantId,
        business_type: dealServices.length > 0 ? "travel_booking" : "general",
        supported_services: dealServices,
        welcome_message: chatDefaults.welcomeMessage,
        quick_replies: chatDefaults.quickReplies,
        notif_chips: chatDefaults.notifChips
      });
      setStatus(
        dealServices.length > 0
          ? "Chatbox deal options updated."
          : "Chatbox deal options disabled. Visitors will see support messaging instead."
      );
    } catch {}
  }
  function toggleDealOption(option: "flights" | "hotels" | "other") {
    if (option === "other") {
      setDealServices([]);
      return;
    }
    setDealServices((prev) =>
      prev.includes(option)
        ? prev.filter((service) => service !== option)
        : [...prev, option]
    );
  }
  async function handleSaveSources(e: React.FormEvent) {
    e.preventDefault(); setStatus(""); setError("");
    const next: Array<{ source_type: "sitemap"|"url"|"faq"|"doc_text"; source_value: string }> = [];
    if (sitemapUrl.trim()) next.push({ source_type: "sitemap", source_value: sitemapUrl.trim() });
    for (const url of parseLinks(docUrls)) next.push({ source_type: "url", source_value: url });
    if (faqText.trim()) next.push({ source_type: "faq", source_value: faqText.trim() });
    try {
      const result = await saveTenantSources(tenantId, next);
      setSources(result.sources);
      setStatus(
        result.knowledge_base.message ||
          (result.ingestion.errors.length > 0
            ? `Knowledge sources saved with indexing warnings. Chunks: ${result.ingestion.inserted_chunks}.`
            : `Knowledge sources saved and indexed. Chunks: ${result.ingestion.inserted_chunks}.`)
      );
    } catch {}
  }
  async function handleReindex() {
    setStatus(""); setError("");
    try { const r = await runIngest(tenantId, true); setStatus(r.errors.length > 0 ? `Indexed with warnings. Chunks: ${r.inserted}.` : `Indexed successfully. Chunks: ${r.inserted}.`); } catch {}
  }
  async function copy(value?: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setStatus("Copied to clipboard.");
  }

  const inputCls = "w-full rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3 text-sm text-[#0a0a0f] shadow-sm placeholder:text-[#0a0a0f]/30 focus:border-[#1a5c5c]/40 focus:outline-none focus:ring-2 focus:ring-[#1a5c5c]/15 transition";
  const sectionHead = "mb-3 font-[family-name:var(--font-display)] text-xl font-light text-[#0a0a0f]";
  const card = "rounded-2xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm space-y-4";
  const primaryBtn = "rounded-xl bg-[#0a0a0f] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-[#1a5c5c] disabled:opacity-60";
  const secondaryBtn = "rounded-xl border border-[#0a0a0f]/10 bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0f]/70 shadow-sm transition hover:border-[#0a0a0f]/20 hover:text-[#0a0a0f] disabled:opacity-60";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">
          <span className="h-px w-5 bg-[#c9a96e]" /> Setup Wizard
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-light text-[#0a0a0f] sm:text-3xl">Site Setup</h2>
        <p className="mt-1 text-sm text-[#0a0a0f]/50">Connect your website, verify ownership, keep knowledge fresh, and unlock live widget install after DNS verification.</p>
      </div>

      {/* Progress Track */}
      <div className="flex flex-wrap gap-2">
        {progressSteps.map((step, i) => (
          <div key={step.label} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${stepStyle[step.state]}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold">{i + 1}</span>
            {step.label}
          </div>
        ))}
      </div>

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            tone: getDnsStatusTone(verification?.status),
            label: "DNS status",
            value: getDnsStatusLabel(verification?.status),
            note: hasDomain
              ? getDnsReminderMessage(verification)
              : "Connect a website domain to generate DNS verification records."
          },
          { tone: getKnowledgeStatusTone(knowledgeBase.status), label: "Knowledge base", value: getKnowledgeStatusLabel(knowledgeBase.status), note: knowledgeBase.message || "No indexing activity yet." },
        ].map((card_) => (
          <div key={card_.label} className={`rounded-2xl border p-4 ${card_.tone === "success" ? "border-[#1a5c5c]/20 bg-[#1a5c5c]/[0.04]" : card_.tone === "danger" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-current/60">{card_.label}</span>
            <strong className={`mt-1 block text-sm font-semibold ${card_.tone === "success" ? "text-[#1a5c5c]" : card_.tone === "danger" ? "text-red-700" : "text-amber-800"}`}>{card_.value}</strong>
            <p className={`mt-0.5 text-xs ${card_.tone === "success" ? "text-[#1a5c5c]/70" : card_.tone === "danger" ? "text-red-600" : "text-amber-700"}`}>{card_.note}</p>
          </div>
        ))}
      </div>

      {/* Widget status callout */}
      {!hasDomain ? (
        <div className="flex gap-3 rounded-2xl border border-[#1a5c5c]/20 bg-[#1a5c5c]/[0.04] p-4">
          <span className="text-[#1a5c5c]">1</span>
          <div>
            <strong className="text-sm font-semibold text-[#1a5c5c]">Project created from scratch</strong>
            <p className="mt-0.5 text-sm text-[#1a5c5c]/70">Add the website domain below, then continue through DNS, content, and widget setup.</p>
          </div>
        </div>
      ) : widgetBlocked ? (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="text-amber-500">⚠</span>
          <div>
            <strong className="text-sm font-semibold text-amber-800">Website widget is blocked</strong>
            <p className="mt-0.5 text-sm text-amber-700">{widget?.blocked_reason}</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 rounded-2xl border border-[#1a5c5c]/20 bg-[#1a5c5c]/[0.04] p-4">
          <span className="text-[#1a5c5c]">✓</span>
          <div>
            <strong className="text-sm font-semibold text-[#1a5c5c]">Website widget is ready</strong>
            <p className="mt-0.5 text-sm text-[#1a5c5c]/70">Your DNS is verified. You can now install the widget on the live website.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1: Domain */}
        <div className={card}>
          <h3 className={sectionHead}>1) Connect Website Domain</h3>
          <form onSubmit={handleSaveDomain} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">Website URL</span>
              <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourdomain.com" className={inputCls} />
            </label>
            <button type="submit" disabled={loading} className={primaryBtn}>{loading ? "Saving…" : "Save domain"}</button>
          </form>
        </div>

        {/* Deal routing */}
        <div className={card}>
          <div>
            <h3 className={sectionHead}>2) Website Deal Type</h3>
            <p className="text-sm text-[#0a0a0f]/55">
              Choose what kind of booking help this website should offer. Hotels and flights can both be enabled.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {DEAL_OPTIONS.map((option) => {
              const selected =
                option.id === "other"
                  ? dealServices.length === 0
                  : dealServices.includes(option.id);
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleDealOption(option.id)}
                  aria-pressed={selected}
                  className={`group flex min-h-[132px] flex-col justify-between rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[#1a5c5c]/35 bg-[#1a5c5c]/[0.06] shadow-sm"
                      : "border-[#0a0a0f]/08 bg-white hover:border-[#1a5c5c]/25 hover:bg-[#1a5c5c]/[0.03]"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      selected ? "bg-[#1a5c5c] text-white" : "bg-[#faf8f4] text-[#0a0a0f]/60"
                    }`}>
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      selected ? "border-[#1a5c5c] bg-[#1a5c5c] text-white" : "border-[#0a0a0f]/15 text-transparent"
                    }`}>
                      <Check size={13} strokeWidth={2.4} />
                    </span>
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#0a0a0f]">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#0a0a0f]/50">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleSaveDealServices} disabled={loading} className={primaryBtn}>
              {loading ? "Saving..." : "Save deal type"}
            </button>
            <span className="text-xs text-[#0a0a0f]/45">
              {dealServices.length > 0
                ? `Enabled: ${dealServices.map((service) => service === "flights" ? "Flight booking" : "Hotels").join(" + ")}`
                : "Other selected: no hotel or flight deals will appear."}
            </span>
          </div>
        </div>

        {/* Step 2: DNS */}
        <div className={card}>
          <h3 className={sectionHead}>3) DNS Verification</h3>
          <dl className="grid grid-cols-2 gap-3">
            {[
              { label: "Domain", value: selectedTenant.allowed_domains?.[0] || "Not set" },
              { label: "Status", value: getDnsStatusLabel(verification?.status) },
              { label: "Last checked", value: formatTs(verification?.last_checked_at) },
              { label: "Verified at", value: formatTs(verification?.verified_at) },
            ].map((kv) => (
              <div key={kv.label} className="rounded-xl bg-[#faf8f4] px-3 py-2">
                <dt className="text-[11px] text-[#0a0a0f]/40 uppercase tracking-wider">{kv.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[#0a0a0f] break-all">{kv.value}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-xl border border-[#0a0a0f]/08 bg-[#0a0a0f]/[0.02] p-3 font-mono text-xs text-[#0a0a0f]/70 space-y-2">
            <div><span className="font-semibold text-[#0a0a0f]/50">TXT host:</span> {verification?.txt_name || "Not generated"}</div>
            <div><span className="font-semibold text-[#0a0a0f]/50">Vercel / Cloudflare host:</span> {relativeHost || "Not generated"}</div>
            <div><span className="font-semibold text-[#0a0a0f]/50">TXT value:</span> <span className="break-all">{verification?.txt_value || "Not generated"}</span></div>
          </div>
          <p className="text-xs text-[#0a0a0f]/55">
            If your DNS provider manages <span className="font-semibold">{zoneDomain || "the root zone"}</span> directly,
            enter only <span className="font-mono">{relativeHost || verification?.txt_name || "the TXT host label"}</span> in the Name field.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleVerifyDomain} disabled={loading || !verification} className={primaryBtn}>{loading ? "Checking…" : "Verify DNS"}</button>
            <button type="button" onClick={() => copy(verification?.txt_value)} disabled={!verification?.txt_value} className={secondaryBtn}>Copy TXT value</button>
          </div>
        </div>

        {/* Step 3: Knowledge */}
        <div className={card}>
          <h3 className={sectionHead}>4) Knowledge Base</h3>
          <div className="rounded-xl bg-[#faf8f4] px-4 py-2.5 text-xs text-[#0a0a0f]/50">
            Last refresh: {formatTs(knowledgeBase.last_ingested_at)}
          </div>
          <form onSubmit={handleSaveSources} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">Sitemap URL</span>
              <input value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} placeholder="https://yourdomain.com/sitemap.xml" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">Doc URLs (one per line)</span>
              <textarea rows={3} value={docUrls} onChange={(e) => setDocUrls(e.target.value)} className={`${inputCls} resize-none`} placeholder="https://yourdomain.com/refund" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/50">FAQs / policy text</span>
              <textarea rows={4} value={faqText} onChange={(e) => setFaqText(e.target.value)} className={`${inputCls} resize-none`} placeholder="Paste your support FAQ and policy text" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={loading} className={primaryBtn}>Save sources</button>
              <button type="button" onClick={handleReindex} disabled={loading} className={secondaryBtn}>{knowledgeBase.status === "processing" ? "Indexing…" : "Re-index now"}</button>
            </div>
          </form>
        </div>

        {/* Step 4: Widget */}
        <div className={card}>
          <h3 className={sectionHead}>5) Widget Availability</h3>
          {widget?.enabled ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#0a0a0f]/08 bg-[#0a0a0f]/[0.02] p-3 font-mono text-xs text-[#0a0a0f]/70 break-all">{widget.embed_url}</div>
              <button type="button" onClick={() => copy(widget.embed_url)} className={secondaryBtn}>Copy embed URL</button>
            </div>
          ) : (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-amber-500">⚠</span>
              <div>
                <strong className="text-sm font-semibold text-amber-800">Complete DNS verification first</strong>
                <p className="mt-0.5 text-sm text-amber-700">{widget?.blocked_reason || "Widget installation is blocked until DNS verification succeeds."}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {status && <div className="rounded-xl border border-[#1a5c5c]/20 bg-[#1a5c5c]/[0.04] px-4 py-3 text-sm text-[#1a5c5c]">{status}</div>}
    </div>
  );
}
