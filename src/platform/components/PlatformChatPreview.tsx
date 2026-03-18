import { ChatWidget } from "@/components/ChatWidget";
import type { PlatformTenant } from "@/platform/types";

type PlatformChatPreviewProps = {
  tenant: PlatformTenant;
  token?: string | null;
};

export default function PlatformChatPreview({ tenant, token }: PlatformChatPreviewProps) {
  const profile = tenant.business_profile;
  const previewWidth = Math.min(1120, Math.max(920, profile.window_width || 0));
  const previewHeight = Math.min(760, Math.max(640, profile.window_height || 0));
  const previewKey = [
    tenant.tenant_id,
    "platform-preview",
    profile.support_phone ?? "",
    profile.support_cta_label ?? "",
    profile.header_cta_label ?? "",
    profile.header_cta_notice ?? "",
    profile.primary_color ?? "",
    profile.user_bubble_color ?? "",
    profile.bot_bubble_color ?? "",
    profile.font_family ?? "",
    profile.launcher_style ?? "",
    profile.theme_style ?? "",
    profile.bg_pattern ?? "",
    profile.launcher_icon ?? "",
    profile.border_radius ?? "",
    profile.bot_name ?? "",
    profile.welcome_message ?? "",
    profile.bot_avatar_url ?? "",
    profile.quick_replies.join("|"),
    profile.notif_enabled ? "1" : "0",
    profile.notif_text ?? "",
    profile.notif_animation ?? "",
    profile.notif_chips.join("|"),
    previewWidth,
    previewHeight,
  ].join(":");

  return (
    <ChatWidget
      key={previewKey}
      tenantId={tenant.tenant_id}
      embedded
      layoutVariant="platform"
      portalToken={token || undefined}
      supportPhoneOverride={profile.support_phone}
      supportCtaLabelOverride={profile.support_cta_label}
      headerCtaLabelOverride={profile.header_cta_label}
      headerCtaNoticeOverride={profile.header_cta_notice}
      appearanceOverride={{
        primaryColor: profile.primary_color,
        userBubbleColor: profile.user_bubble_color,
        botBubbleColor: profile.bot_bubble_color,
        fontFamily: profile.font_family,
        widgetPosition: profile.widget_position,
        launcherStyle: profile.launcher_style,
        themeStyle: profile.theme_style,
        bgPattern: profile.bg_pattern,
        launcherIcon: profile.launcher_icon,
        windowWidth: previewWidth,
        windowHeight: previewHeight,
        borderRadius: profile.border_radius,
        botName: profile.bot_name,
        welcomeMessage: profile.welcome_message,
        botAvatarUrl: profile.bot_avatar_url,
        quickReplies: profile.quick_replies,
        notifEnabled: profile.notif_enabled,
        notifText: profile.notif_text,
        notifAnimation: profile.notif_animation,
        notifChips: profile.notif_chips,
      }}
    />
  );
}
