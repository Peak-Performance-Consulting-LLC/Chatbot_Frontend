import { Link } from "react-router-dom";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import { getDnsReminderMessage, getDnsStatusLabel, getKnowledgeStatusLabel } from "@/platform/status";
import { usePlatformAuth } from "@/platform/state/auth";

export default function OverviewPage() {
  const { selectedTenant } = usePlatformAuth();

  if (!selectedTenant) {
    return <WorkspaceCreateForm />;
  }

  const profile = selectedTenant.business_profile;
  const domainVerification = selectedTenant.domain_verification;
  const knowledgeBase = selectedTenant.knowledge_base;
  const widgetReady = selectedTenant.widget?.enabled === true;

  const checklist = [
    {
      done: Boolean(selectedTenant.allowed_domains?.[0]),
      label: "Tenant domain configured"
    },
    {
      done: domainVerification?.status === "verified",
      label: "DNS ownership verified"
    },
    {
      done: knowledgeBase.status === "ready" || knowledgeBase.status === "warning",
      label: "Knowledge base indexed"
    },
    {
      done: widgetReady,
      label: "Widget ready for website install"
    }
  ];

  return (
    <div className="platform-grid two-col">
      <section className="platform-panel hero">
        <h2>Overview</h2>
        <p>Track onboarding status, keep knowledge fresh, and move to live website install only after DNS verification.</p>

        {domainVerification?.status !== "verified" ? (
          <div className="platform-callout warning">
            <strong>{getDnsStatusLabel(domainVerification?.status)}</strong>
            <p>{getDnsReminderMessage(domainVerification)}</p>
          </div>
        ) : null}

        <div className="kpi-grid">
          <article>
            <span>Primary domain</span>
            <strong>{selectedTenant.allowed_domains?.[0] || "Not configured"}</strong>
          </article>
          <article>
            <span>DNS status</span>
            <strong>{getDnsStatusLabel(domainVerification?.status)}</strong>
          </article>
          <article>
            <span>Knowledge base</span>
            <strong>{getKnowledgeStatusLabel(knowledgeBase.status)}</strong>
          </article>
          <article>
            <span>Website widget</span>
            <strong>{widgetReady ? "Ready to install" : "Blocked until DNS verification"}</strong>
          </article>
          <article>
            <span>Services enabled</span>
            <strong>{profile.supported_services.join(", ") || "flights"}</strong>
          </article>
          <article>
            <span>Specialist number</span>
            <strong>{profile.support_phone || "Not configured"}</strong>
          </article>
        </div>
      </section>

      <section className="platform-panel">
        <h3>Launch checklist</h3>
        <ul className="status-list">
          {checklist.map((item) => (
            <li key={item.label} className={item.done ? "done" : "pending"}>
              {item.label}
            </li>
          ))}
        </ul>

        <div className="platform-stack note-stack">
          <div className="platform-inline-note">
            <strong>Portal preview</strong>
            <p>You can keep testing the chatbot inside this dashboard before DNS verification.</p>
          </div>
          <div className="platform-inline-note">
            <strong>Website install</strong>
            <p>Live widget/embed remains blocked until the DNS TXT record is verified.</p>
          </div>
        </div>

        <div className="action-row">
          <Link to="/platform/app/site-setup" className="platform-link-btn">Open Site Setup</Link>
          <Link to="/platform/app/dns" className="platform-link-btn">Verify DNS</Link>
          <Link to="/platform/app/widget" className="platform-link-btn">Widget Code</Link>
        </div>
      </section>
    </div>
  );
}
