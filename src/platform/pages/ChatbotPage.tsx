import { ChatWidget } from "@/components/ChatWidget";
import { usePlatformAuth } from "@/platform/state/auth";

export default function ChatbotPage() {
  const { selectedTenant } = usePlatformAuth();

  if (!selectedTenant) {
    return <section className="platform-panel"><p>Select a tenant to preview chatbot.</p></section>;
  }

  return (
    <div className="platform-grid two-col">
      <section className="platform-panel">
        <h2>My Chatbot</h2>
        <p>
          This preview uses your tenant-specific embed URL. Responses are scoped to tenant knowledge and
          services.
        </p>

        <div className="widget-preview-frame">
          <ChatWidget
            tenantId={selectedTenant.tenant_id}
            embedded
            supportPhoneOverride={selectedTenant.business_profile.support_phone}
            supportCtaLabelOverride={selectedTenant.business_profile.support_cta_label}
          />
        </div>
      </section>

      <section className="platform-panel">
        <h3>Behavior</h3>
        <ul className="text-list">
          <li>Knowledge answers are filtered by tenant ID.</li>
          <li>Flight prices come only from the configured flight API.</li>
          <li>Hotels, cars, cruises run guided flows with specialist CTA.</li>
          <li>Domain checks are enforced on API requests.</li>
        </ul>
      </section>
    </div>
  );
}
