export type PlatformService = "flights" | "hotels" | "cars" | "cruises";
export type DomainVerificationStatus = "pending" | "txt_not_found" | "txt_mismatch" | "verified";
export type KnowledgeBaseStatus = "pending" | "processing" | "ready" | "warning" | "error";
export type WidgetPosition = "left" | "right";
export type LauncherStyle = "rounded" | "pill" | "square" | "minimal";
export type ThemeStyle = "standard" | "glass" | "clay" | "dark" | "minimal";
export type BgPattern = "none" | "dots" | "grid" | "waves";
export type LauncherIcon = "chat" | "sparkle" | "headset" | "zap" | "heart";
export type NotifAnimation = "bounce" | "pulse" | "slide";
export type AiTone = "friendly" | "professional" | "concise" | "enthusiastic";

export type TenantBusinessProfile = {
  business_type: string;
  supported_services: PlatformService[];
  support_phone: string | null;
  support_email: string | null;
  support_cta_label: string;
  header_cta_label: string;
  header_cta_notice: string;
  business_description: string | null;
  primary_color: string;
  user_bubble_color: string;
  bot_bubble_color: string;
  font_family: string;
  widget_position: WidgetPosition;
  launcher_style: LauncherStyle;
  theme_style: ThemeStyle;
  bg_pattern: BgPattern;
  launcher_icon: LauncherIcon;
  window_width: number;
  window_height: number;
  border_radius: number;
  welcome_message: string;
  bot_name: string;
  bot_avatar_url: string | null;
  quick_replies: string[];
  ai_tone: AiTone;
  notif_enabled: boolean;
  notif_text: string;
  notif_animation: NotifAnimation;
  notif_chips: string[];
};

export type PlatformWidgetConfig = {
  tenant_id: string;
  enabled: boolean;
  status: "dns_required" | "ready";
  blocked_reason: string | null;
  widget_host_url: string;
  backend_url: string;
  embed_url: string | null;
  script_snippet: string | null;
  react_snippet: string | null;
};

export type PlatformSource = {
  id: string;
  tenant_id: string;
  source_type: "sitemap" | "url" | "faq" | "doc_text";
  source_value: string;
  created_at: string;
};

export type PlatformKnowledgeBase = {
  status: KnowledgeBaseStatus;
  message: string | null;
  last_ingested_at: string | null;
};

export type PlatformDomainVerification = {
  status: DomainVerificationStatus;
  txt_name: string;
  txt_value: string;
  last_checked_at: string | null;
  last_error: string | null;
  last_seen_records: string[];
  verified_at: string | null;
} | null;

export type PlatformTenant = {
  tenant_id: string;
  name: string | null;
  allowed_domains: string[];
  business_profile: TenantBusinessProfile;
  knowledge_base: PlatformKnowledgeBase;
  domain_verification: PlatformDomainVerification;
  widget?: PlatformWidgetConfig;
};

export type PlatformUser = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export type PlatformProfile = {
  user: PlatformUser;
  tenants: PlatformTenant[];
};
