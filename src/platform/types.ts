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
export type PlatformAvatarSource = "initials" | "manual" | "google" | "facebook";
export type PlatformAuthProvider = "password" | "google" | "facebook";
export type PlatformSubscriptionPlan = "trial" | "starter" | "growth" | "enterprise";
export type PlatformSubscriptionStatus = "active" | "canceled" | "expired" | "past_due";
export type WorkspaceMemberRole = "owner" | "admin" | "supervisor" | "agent" | "viewer";
export type AgentPresenceStatus = "online" | "away" | "offline";
export type AgentEffectiveStatus = "online" | "busy" | "away" | "offline";
export type QueueRoutingMode = "manual_accept" | "auto_assign";
export type QueueAfterHoursAction = "collect_info" | "overflow" | "ai_only";

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
  csat_enabled: boolean;
  csat_prompt: string;
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
  workspace_role?: WorkspaceMemberRole | null;
  subscription?: PlatformSubscription | null;
  business_profile: TenantBusinessProfile;
  knowledge_base: PlatformKnowledgeBase;
  retention?: {
    conversation_retention_days: number;
    retention_purge_grace_days: number;
    allow_conversation_export: boolean;
  };
  domain_verification: PlatformDomainVerification;
  widget?: PlatformWidgetConfig;
};

export type PlatformUser = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  avatar_source: PlatformAvatarSource;
  has_password: boolean;
  auth_providers: PlatformAuthProvider[];
  created_at: string;
};

export type PlatformSubscription = {
  id: string;
  user_id: string;
  plan: PlatformSubscriptionPlan;
  status: PlatformSubscriptionStatus;
  max_tenants: number;
  max_messages_mo: number;
  max_seats: number;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  trial_days_remaining: number | null;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
};

export type PlatformAnalyticsRange = "7d" | "30d" | "billing_cycle";

export type PlatformAnalyticsSummary = {
  conversations: number;
  vip_conversations: number;
  messages_total: number;
  user_messages: number;
  assistant_messages: number;
  unique_visitors: number;
  tokens_total: number;
  tokens_exact: number;
  tokens_estimated: number;
  avg_response_ms: number | null;
  avg_first_response_seconds: number | null;
  avg_handle_seconds: number | null;
  agent_utilization_ratio: number | null;
  csat_avg_rating: number | null;
  csat_responses: number;
  message_quota_used: number;
  message_quota_limit: number;
};

export type PlatformAnalyticsPoint = {
  bucket_start: string;
  conversations: number;
  messages_total: number;
  unique_visitors: number;
  tokens_total: number;
};

export type PlatformAnalyticsWorkspaceRow = {
  tenant_id: string;
  name: string;
  messages_total: number;
  tokens_total: number;
  conversations: number;
  unique_visitors: number;
  avg_first_response_seconds: number | null;
  avg_handle_seconds: number | null;
  agent_utilization_ratio: number | null;
};

export type PlatformAnalyticsBreakdownRow = {
  key: string;
  label: string;
  value: number;
  share: number;
};

export type PlatformAnalyticsTokenSourceRow = {
  key: "provider" | "counted" | "estimated" | "none";
  label: string;
  value: number;
  share: number;
};

export type PlatformAnalyticsHealth = {
  workspaces_total: number;
  dns_verified_count: number;
  knowledge_ready_count: number;
  widget_ready_count: number;
};

export type PlatformAnalyticsScope = {
  summary: PlatformAnalyticsSummary;
  trend: PlatformAnalyticsPoint[];
  services: PlatformAnalyticsBreakdownRow[];
  intents: PlatformAnalyticsBreakdownRow[];
  token_sources: PlatformAnalyticsTokenSourceRow[];
  knowledge_hit_rate: number | null;
  avg_response_ms: number | null;
};

export type PlatformAnalyticsResponse = {
  range: PlatformAnalyticsRange;
  timezone: string;
  generated_at: string;
  token_tracking_started_at: string | null;
  account: PlatformAnalyticsScope & {
    workspaces: PlatformAnalyticsWorkspaceRow[];
    health: PlatformAnalyticsHealth;
  };
  workspace:
    | (PlatformAnalyticsScope & {
        tenant_id: string;
        name: string;
      })
    | null;
};

export type PlatformProfile = {
  user: PlatformUser;
  tenants: PlatformTenant[];
  subscription?: PlatformSubscription;
};

export type PlatformVisitorContact = {
  id: string;
  tenant_id: string;
  device_id: string;
  chat_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  captured_at: string;
};

export type PlatformVisitorContactsResponse = {
  tenant_id: string;
  total: number;
  limit: number;
  offset: number;
  contacts: PlatformVisitorContact[];
};

export type PlatformWorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
};

export type PlatformWorkspaceInvitation = {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceMemberRole;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  status: "pending" | "accepted" | "expired";
};

export type PlatformQueue = {
  id: string;
  workspace_id: string;
  tenant_id: string;
  name: string;
  routing_mode: QueueRoutingMode;
  routing_strategy: "priority_least_active" | "round_robin";
  is_vip_queue: boolean;
  is_active: boolean;
  business_hours: Record<string, unknown>;
  after_hours_action: QueueAfterHoursAction;
  sla_first_response_seconds: number;
  sla_warning_seconds: number;
  overflow_after_seconds: number;
  overflow_queue_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PlatformQueueMember = {
  id: string;
  queue_id: string;
  workspace_member_id: string;
  priority: number;
  max_concurrent_chats: number;
  skills: string[];
  handles_vip: boolean;
  last_assigned_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  workspace_member: {
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceMemberRole;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    platform_user: {
      id: string;
      email: string;
      full_name: string;
      avatar_url: string | null;
    } | null;
  } | null;
};

export type PlatformPresenceEntry = {
  workspace_member_id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: WorkspaceMemberRole;
  status: AgentPresenceStatus;
  last_heartbeat_at: string | null;
  active_chats?: number;
  capacity_limit?: number;
  is_busy?: boolean;
  effective_status?: AgentEffectiveStatus;
};

export type SupervisorAgentLoad = {
  queue_id: string;
  user_id: string;
  full_name: string;
  role: WorkspaceMemberRole;
  status: AgentPresenceStatus;
  last_heartbeat_at: string | null;
  active_chats: number;
  max_concurrent_chats: number;
  priority: number;
};
