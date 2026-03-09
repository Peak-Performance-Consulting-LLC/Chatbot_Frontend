import { Link } from "react-router-dom";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import { usePlatformAuth } from "@/platform/state/auth";

export default function OverviewPage() {
  const { selectedTenant } = usePlatformAuth();

  if (!selectedTenant) {
    return <WorkspaceCreateForm />;
  }

  const profile = selectedTenant?.business_profile;
  const domainVerification = selectedTenant?.domain_verification;

  const checklist = [
    {
      done: Boolean(selectedTenant?.allowed_domains?.[0]),
      label: "Tenant domain configured"
    },
    {
      done: domainVerification?.status === "verified",
      label: "DNS ownership verified"
    },
    {
      done: Boolean(selectedTenant?.widget?.script_snippet),
      label: "Widget code generated"
    },
    {
      done: false,
      label: "Knowledge base indexed with latest docs"
    }
  ];

  return (
    <div className="platform-grid two-col">
      <section className="platform-panel hero">
        <h2>Overview</h2>
        <p>Track onboarding status and complete setup before going live on production domain.</p>

        <div className="kpi-grid">
          <article>
            <span>Primary domain</span>
            <strong>{selectedTenant?.allowed_domains?.[0] || "Not configured"}</strong>
          </article>
          <article>
            <span>DNS status</span>
            <strong>{domainVerification?.status || "pending"}</strong>
          </article>
          <article>
            <span>Services enabled</span>
            <strong>{profile?.supported_services.join(", ") || "flights"}</strong>
          </article>
          <article>
            <span>Support CTA</span>
            <strong>{profile?.support_cta_label || "Connect with a specialist"}</strong>
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

        <div className="action-row">
          <Link to="/platform/app/site-setup" className="platform-link-btn">Open Site Setup</Link>
          <Link to="/platform/app/dns" className="platform-link-btn">Verify DNS</Link>
          <Link to="/platform/app/widget" className="platform-link-btn">Get Widget Code</Link>
        </div>
      </section>
    </div>
  );
}
