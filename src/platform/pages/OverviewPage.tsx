import { Link } from "react-router-dom";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import { getDnsReminderMessage, getDnsStatusLabel, getKnowledgeStatusLabel } from "@/platform/status";
import { usePlatformAuth } from "@/platform/state/auth";

export default function OverviewPage() {
  const { selectedTenant } = usePlatformAuth();

  if (!selectedTenant) return <WorkspaceCreateForm />;

  const profile = selectedTenant.business_profile;
  const domainVerification = selectedTenant.domain_verification;
  const knowledgeBase = selectedTenant.knowledge_base;
  const widgetReady = selectedTenant.widget?.enabled === true;

  const checklist = [
    { done: Boolean(selectedTenant.allowed_domains?.[0]), label: "Tenant domain configured" },
    { done: domainVerification?.status === "verified", label: "DNS ownership verified" },
    { done: knowledgeBase.status === "ready" || knowledgeBase.status === "warning", label: "Knowledge base indexed" },
    { done: widgetReady, label: "Widget ready for website install" },
  ];
  const completedSteps = checklist.filter((c) => c.done).length;
  const progress = Math.round((completedSteps / checklist.length) * 100);

  const kpis = [
    { label: "Primary domain", value: selectedTenant.allowed_domains?.[0] || "Not configured" },
    { label: "DNS status", value: getDnsStatusLabel(domainVerification?.status) },
    { label: "Knowledge base", value: getKnowledgeStatusLabel(knowledgeBase.status) },
    { label: "Website widget", value: widgetReady ? "Ready to install" : "Blocked until DNS" },
    { label: "Services enabled", value: profile.supported_services.join(", ") || "flights" },
    { label: "Specialist number", value: profile.support_phone || "Not configured" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────── */}
      <div>
        <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">
          <span className="h-px w-5 bg-[#c9a96e]" /> Control Center
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-light text-[#0a0a0f] sm:text-3xl">Overview</h2>
        <p className="mt-1 text-sm text-[#0a0a0f]/50">Track onboarding status, keep knowledge fresh, and move to live website install only after DNS verification.</p>
      </div>

      {/* ── Launch Readiness Banner ───────────────── */}
      <div className="rounded-2xl border border-[#1a5c5c]/15 bg-gradient-to-br from-[#1a5c5c]/[0.06] to-[#c9a96e]/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">Launch readiness</span>
            <strong className="mt-1 block text-lg font-semibold text-[#0a0a0f]">{completedSteps} of {checklist.length} steps completed</strong>
            <p className="mt-0.5 text-sm text-[#0a0a0f]/50">Your concierge is almost ready for production deployment.</p>
            {/* Progress bar */}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0a0a0f]/08">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1a5c5c] to-[#2a8080] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <Link
            to="/platform/app/site-setup"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-[#0a0a0f] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#1a5c5c] sm:self-center"
          >
            Continue setup →
          </Link>
        </div>
      </div>

      {/* ── DNS Warning ───────────────────────────── */}
      {domainVerification?.status !== "verified" && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="mt-0.5 text-amber-500">⚠</span>
          <div>
            <strong className="text-sm font-semibold text-amber-800">{getDnsStatusLabel(domainVerification?.status)}</strong>
            <p className="mt-0.5 text-sm text-amber-700">{getDnsReminderMessage(domainVerification)}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── KPI Grid ─────────────────────────────── */}
        <div className="rounded-2xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[#0a0a0f]/50 uppercase tracking-wider">Workspace details</h3>
          <dl className="grid grid-cols-2 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-[#faf8f4] px-4 py-3">
                <dt className="text-[11px] text-[#0a0a0f]/40 uppercase tracking-wider">{kpi.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-[#0a0a0f] break-words">{kpi.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Checklist ─────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-[#0a0a0f]/50 uppercase tracking-wider">Launch checklist</h3>
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.done ? "bg-[#1a5c5c]/10 text-[#1a5c5c]" : "bg-[#0a0a0f]/06 text-[#0a0a0f]/30"}`}>
                    {item.done ? "✓" : "·"}
                  </span>
                  <span className={`text-sm ${item.done ? "text-[#0a0a0f]" : "text-[#0a0a0f]/40"}`}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Portal preview", note: "Test the chatbot inside this dashboard before DNS verification." },
              { label: "Website install", note: "Live widget/embed is blocked until the DNS TXT record is verified." },
            ].map((n) => (
              <div key={n.label} className="rounded-2xl border border-[#0a0a0f]/08 bg-white p-4 shadow-sm">
                <strong className="block text-sm font-semibold text-[#0a0a0f]">{n.label}</strong>
                <p className="mt-1 text-xs text-[#0a0a0f]/50">{n.note}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Site Setup", to: "/platform/app/site-setup" },
              { label: "Verify DNS", to: "/platform/app/dns" },
              { label: "Widget Code", to: "/platform/app/widget" },
            ].map((l) => (
              <Link key={l.label} to={l.to} className="rounded-lg border border-[#0a0a0f]/10 bg-white px-4 py-2 text-sm font-medium text-[#0a0a0f]/70 shadow-sm transition hover:border-[#1a5c5c]/30 hover:text-[#1a5c5c]">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
