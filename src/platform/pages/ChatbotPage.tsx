import { ChatWidget } from "@/components/ChatWidget";
import { getDnsReminderMessage } from "@/platform/status";
import { usePlatformAuth } from "@/platform/state/auth";

export default function ChatbotPage() {
  const { selectedTenant, token } = usePlatformAuth();

  if (!selectedTenant) {
    return <section className="platform-panel"><p>Select a tenant to preview chatbot.</p></section>;
  }

  return (
    <div className="platform-grid two-col">
      <section className="platform-panel">
        <h2>My Chatbot</h2>
        <p>
          This preview runs inside the portal and stays available even before DNS verification. Live website usage is
          unlocked only after the TXT record is verified.
        </p>

        {selectedTenant.domain_verification?.status !== "verified" ? (
          <div className="platform-callout warning compact">
            <strong>Portal preview is active</strong>
            <p>{getDnsReminderMessage(selectedTenant.domain_verification)}</p>
          </div>
        ) : null}

        <div className="widget-preview-frame">
          <ChatWidget
            key={[
              selectedTenant.tenant_id,
              selectedTenant.business_profile.support_phone ?? "",
              selectedTenant.business_profile.support_cta_label ?? "",
              selectedTenant.business_profile.header_cta_label ?? "",
              selectedTenant.business_profile.header_cta_notice ?? "",
              selectedTenant.business_profile.primary_color ?? "",
              selectedTenant.business_profile.bot_name ?? "",
              selectedTenant.business_profile.bot_avatar_url ?? ""
            ].join(":")}
            tenantId={selectedTenant.tenant_id}
            embedded
            portalToken={token}
            supportPhoneOverride={selectedTenant.business_profile.support_phone}
            supportCtaLabelOverride={selectedTenant.business_profile.support_cta_label}
            headerCtaLabelOverride={selectedTenant.business_profile.header_cta_label}
            headerCtaNoticeOverride={selectedTenant.business_profile.header_cta_notice}
            appearanceOverride={{
              primaryColor: selectedTenant.business_profile.primary_color,
              userBubbleColor: selectedTenant.business_profile.user_bubble_color,
              botBubbleColor: selectedTenant.business_profile.bot_bubble_color,
              fontFamily: selectedTenant.business_profile.font_family,
              widgetPosition: selectedTenant.business_profile.widget_position,
              launcherStyle: selectedTenant.business_profile.launcher_style,
              windowWidth: selectedTenant.business_profile.window_width,
              windowHeight: selectedTenant.business_profile.window_height,
              borderRadius: selectedTenant.business_profile.border_radius,
              botName: selectedTenant.business_profile.bot_name,
              welcomeMessage: selectedTenant.business_profile.welcome_message,
              botAvatarUrl: selectedTenant.business_profile.bot_avatar_url
            }}
          />
        </div>
      </section>

      <section className="platform-panel">
        <h3>Behavior</h3>
        <ul className="text-list">
          <li>Portal preview uses authenticated tenant access and does not require DNS verification.</li>
          <li>Website widget/embed stays blocked until DNS verification succeeds.</li>
          <li>Knowledge answers are filtered by tenant ID and refresh after indexing finishes.</li>
          <li>Flight prices come only from the configured flight API.</li>
          <li>Hotels, cars, and cruises use guided flows and route to the tenant specialist CTA.</li>
        </ul>
      </section>
    </div>
  );
}
