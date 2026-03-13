import { Link } from "react-router-dom";
import PlatformChatPreview from "@/platform/components/PlatformChatPreview";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import { getDnsReminderMessage, getDnsStatusLabel, getKnowledgeStatusLabel } from "@/platform/status";
import { usePlatformAuth } from "@/platform/state/auth";

function formatDateTime(value?: string | null) {
  if (!value) return "Not indexed yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatbotPage() {
  const { selectedTenant, token } = usePlatformAuth();

  if (!selectedTenant) {
    return <WorkspaceCreateForm />;
  }

  const profile = selectedTenant.business_profile;
  const verification = selectedTenant.domain_verification;
  const knowledgeBase = selectedTenant.knowledge_base;
  const widget = selectedTenant.widget;
  const verified = verification?.status === "verified";
  const widgetReady = widget?.enabled === true;
  const primaryDomain = selectedTenant.allowed_domains?.[0] || "No domain connected";
  const supportedServices = profile.supported_services.length > 0 ? profile.supported_services : ["flights"];

  const readinessItems = [
    {
      label: "Portal preview is available inside the dashboard",
      done: Boolean(token),
      note: "You can test the assistant here before production rollout.",
    },
    {
      label: "Domain ownership is verified",
      done: verified,
      note: verified ? "Live website install is unlocked." : "Website launch is still blocked by DNS verification.",
    },
    {
      label: "Knowledge base is indexed",
      done: knowledgeBase.status === "ready" || knowledgeBase.status === "warning",
      note: knowledgeBase.message || "Refresh your sources to improve answer quality.",
    },
    {
      label: "Widget install is ready",
      done: widgetReady,
      note: widgetReady ? "Your embed can be installed on the verified domain." : widget?.blocked_reason || "Finish setup to unlock install code.",
    },
  ];

  const completedSteps = readinessItems.filter((item) => item.done).length;

  const statCards = [
    {
      label: "DNS status",
      value: getDnsStatusLabel(verification?.status),
      note: verified ? "Production deployment unlocked" : "Portal preview only until verification",
      tone: verified ? "border-[#1a5c5c]/15 bg-[#1a5c5c]/[0.04]" : "border-amber-200 bg-amber-50",
    },
    {
      label: "Knowledge base",
      value: getKnowledgeStatusLabel(knowledgeBase.status),
      note: knowledgeBase.message || "Grounded answers depend on indexed sources.",
      tone: knowledgeBase.status === "ready"
        ? "border-[#1a5c5c]/15 bg-[#1a5c5c]/[0.04]"
        : knowledgeBase.status === "error"
          ? "border-red-200 bg-red-50"
          : "border-[#0a0a0f]/08 bg-white",
    },
    {
      label: "Services enabled",
      value: String(supportedServices.length),
      note: supportedServices.join(", "),
      tone: "border-[#0a0a0f]/08 bg-white",
    },
    {
      label: "Last knowledge sync",
      value: formatDateTime(knowledgeBase.last_ingested_at),
      note: knowledgeBase.last_ingested_at ? "Latest indexed content timestamp" : "Run indexing after saving sources",
      tone: "border-[#0a0a0f]/08 bg-white",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">
            <span className="h-px w-5 bg-[#c9a96e]" /> Dashboard Preview
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-light text-[#0a0a0f] sm:text-3xl">
            My Chatbot
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#0a0a0f]/50">
            Review the live assistant inside the dashboard, confirm launch blockers, and move straight into
            customization or install from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/platform/app/customization"
            className="rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-2.5 text-sm font-medium text-[#0a0a0f]/70 shadow-sm transition hover:border-[#1a5c5c]/30 hover:text-[#1a5c5c]"
          >
            Customize bot
          </Link>
          <Link
            to={verified ? "/platform/app/widget" : "/platform/app/site-setup"}
            className="rounded-xl bg-[#0a0a0f] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-[#1a5c5c]"
          >
            {verified ? "Install widget" : "Finish setup"}
          </Link>
        </div>
      </div>

      <div
        className={`flex gap-3 rounded-2xl border p-4 ${
          verified
            ? "border-[#1a5c5c]/20 bg-[#1a5c5c]/[0.04]"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <span className={verified ? "text-[#1a5c5c]" : "text-amber-500"}>{verified ? "✓" : "⚠"}</span>
        <div>
          <strong className={`text-sm font-semibold ${verified ? "text-[#1a5c5c]" : "text-amber-800"}`}>
            {verified ? "Website launch is unlocked" : "Portal preview is active"}
          </strong>
          <p className={`mt-0.5 text-sm ${verified ? "text-[#1a5c5c]/70" : "text-amber-700"}`}>
            {verified
              ? "Your assistant can now be tested here and deployed on the verified domain."
              : getDnsReminderMessage(verification)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl border p-4 shadow-sm ${card.tone}`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0a0a0f]/45">
              {card.label}
            </span>
            <strong className="mt-2 block text-base font-semibold text-[#0a0a0f] sm:text-lg">{card.value}</strong>
            <p className="mt-1 text-xs leading-5 text-[#0a0a0f]/50">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <section className="rounded-2xl border border-[#0a0a0f]/08 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">
                Live Dashboard Preview
              </span>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-light text-[#0a0a0f]">
                {profile.bot_name || "AeroConcierge"}
              </h3>
              <p className="mt-1 text-sm text-[#0a0a0f]/50">
                This preview runs with authenticated tenant access, so you can validate the chat flow before
                the website widget goes live.
              </p>
            </div>
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                verified
                  ? "bg-[#1a5c5c]/10 text-[#1a5c5c]"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {verified ? "Production-ready preview" : "Dashboard-only preview"}
            </span>
          </div>

          <div className="app-chatbot-preview-frame">
            <PlatformChatPreview tenant={selectedTenant} token={token} />
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0a0a0f]/45">
              Launch checklist
            </span>
            <strong className="mt-2 block text-lg font-semibold text-[#0a0a0f]">
              {completedSteps} of {readinessItems.length} items complete
            </strong>
            <ul className="mt-4 space-y-3">
              {readinessItems.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      item.done
                        ? "bg-[#1a5c5c]/10 text-[#1a5c5c]"
                        : "bg-[#0a0a0f]/06 text-[#0a0a0f]/30"
                    }`}
                  >
                    {item.done ? "✓" : "·"}
                  </span>
                  <div>
                    <p className={`text-sm ${item.done ? "text-[#0a0a0f]" : "text-[#0a0a0f]/60"}`}>{item.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[#0a0a0f]/45">{item.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0a0a0f]/45">
              Workspace snapshot
            </span>
            <div className="mt-4 space-y-3">
              {[
                { label: "Workspace", value: selectedTenant.name || selectedTenant.tenant_id },
                { label: "Primary domain", value: primaryDomain },
                { label: "Support line", value: profile.support_phone || "Not configured" },
                { label: "Welcome message", value: profile.welcome_message || "Not configured" },
              ].map((entry) => (
                <div key={entry.label} className="rounded-xl bg-[#faf8f4] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-[#0a0a0f]/40">{entry.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#0a0a0f] break-words">{entry.value}</p>
                </div>
              ))}
            </div>
          </section>

        
        </div>
      </div>
    </div>
  );
}
