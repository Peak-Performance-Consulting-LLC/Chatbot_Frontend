import type {
  AiTone,
  BgPattern,
  LauncherIcon,
  NotifAnimation,
  PlatformAnalyticsRange,
  PlatformAnalyticsResponse,
  PlatformAuthProvider,
  PlatformProfile,
  PlatformService,
  PlatformSource,
  PlatformSubscription,
  PlatformTenant,
  PlatformVisitorContactsResponse,
  PlatformWorkspaceMember,
  PlatformWorkspaceInvitation,
  PlatformQueue,
  PlatformQueueMember,
  PlatformPresenceEntry,
  QueueAfterHoursAction,
  AgentPresenceStatus,
  SupervisorAgentLoad,
  ThemeStyle,
  PlatformUser,
  TenantBusinessProfile
} from "@/platform/types";
import type { ChatMessage, ChatThread, ConversationMode } from "@/types";

type SignupPayload = {
  full_name: string;
  email: string;
  password: string;
  company_name: string;
  website_url: string;
  sitemap_url?: string;
  faq_text?: string;
  doc_urls?: string[];
  business_type?: string;
  supported_services?: PlatformService[];
  support_phone?: string;
  support_email?: string;
  support_cta_label?: string;
  business_description?: string;
};

type CreateWorkspacePayload = {
  company_name: string;
  website_url: string;
  sitemap_url?: string;
  faq_text?: string;
  doc_urls?: string[];
  business_type?: string;
  supported_services?: PlatformService[];
  support_phone?: string;
  support_email?: string;
  support_cta_label?: string;
  business_description?: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type ForgotPasswordPayload = {
  email: string;
};

type ResetPasswordPayload = {
  token: string;
  password: string;
};

export type PlatformOauthProvider = Exclude<PlatformAuthProvider, "password">;

export type PlatformLoginResponse = {
  user: PlatformUser;
  token: string;
  expires_at: string;
  tenants: PlatformTenant[];
};

export type PlatformSignupResponse = {
  user: PlatformUser;
  token: string;
  expires_at: string;
  tenant: PlatformTenant;
  ingest: {
    inserted_chunks: number;
    fetched_documents: number;
    skipped_documents: number;
    errors: string[];
  };
};

export type PlatformIngestionSummary = {
  inserted_chunks: number;
  fetched_documents: number;
  skipped_documents: number;
  errors: string[];
};

export type PlatformRetentionSettings = {
  conversation_retention_days: number;
  retention_purge_grace_days: number;
  allow_conversation_export: boolean;
};

export type PlatformConversationExportConversation = {
  id: string;
  tenant_id: string;
  device_id: string;
  title: string;
  conversation_mode: string;
  conversation_status: string;
  assigned_agent_id: string | null;
  visitor_is_vip: boolean;
  routing_skill: string | null;
  created_at: string;
  last_message_at: string;
};

export type PlatformConversationExportMessage = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  sender_type: string | null;
  sender_id: string | null;
  is_internal: boolean;
  is_draft: boolean;
  dedupe_key: string | null;
  created_at: string;
};

export type PlatformConversationExportEvent = {
  id: string;
  chat_id: string;
  event_type: string;
  actor_id: string | null;
  actor_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function resolvePlatformApiBaseUrl(override?: string) {
  return (override || import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

function toNetworkError(path: string, error: unknown): Error {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error(`Request to ${path} was interrupted before the backend responded.`);
  }

  return new Error(
    `Network request failed for ${path}. Refresh the page and retry. If it persists, the browser or network blocked the request before the backend responded.`
  );
}

function generateClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function parseError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string };
    return json.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function authedJson<T>(input: {
  path: string;
  token: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  backendUrl?: string;
}): Promise<T> {
  const base = resolvePlatformApiBaseUrl(input.backendUrl);
  let response: Response;

  try {
    response = await fetch(`${base}${input.path}`, {
      method: input.method ?? "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.token}`
      },
      ...(input.body ? { body: JSON.stringify(input.body) } : {})
    });
  } catch (error) {
    throw toNetworkError(input.path, error);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
}

export async function platformSignup(payload: SignupPayload, backendUrl?: string) {
  const base = resolvePlatformApiBaseUrl(backendUrl);
  let response: Response;

  try {
    response = await fetch(`${base}/api/platform/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw toNetworkError("/api/platform/signup", error);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as PlatformSignupResponse;
}

export async function platformCreateWorkspace(
  token: string,
  payload: CreateWorkspacePayload,
  backendUrl?: string
) {
  return authedJson<{
    tenant: PlatformTenant;
    ingest: PlatformIngestionSummary;
  }>({
    path: "/api/platform/workspaces",
    token,
    method: "POST",
    body: payload,
    backendUrl
  });
}

export async function platformLogin(payload: LoginPayload, backendUrl?: string) {
  const base = resolvePlatformApiBaseUrl(backendUrl);
  let response: Response;

  try {
    response = await fetch(`${base}/api/platform/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw toNetworkError("/api/platform/login", error);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as PlatformLoginResponse;
}

export async function platformRequestPasswordReset(payload: ForgotPasswordPayload, backendUrl?: string) {
  const base = resolvePlatformApiBaseUrl(backendUrl);
  let response: Response;

  try {
    response = await fetch(`${base}/api/platform/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw toNetworkError("/api/platform/forgot-password", error);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as { ok: boolean; message: string };
}

export async function platformResetPassword(payload: ResetPasswordPayload, backendUrl?: string) {
  const base = resolvePlatformApiBaseUrl(backendUrl);
  let response: Response;

  try {
    response = await fetch(`${base}/api/platform/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw toNetworkError("/api/platform/reset-password", error);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as { ok: boolean; message: string };
}

export async function platformMe(token: string, backendUrl?: string) {
  return authedJson<PlatformProfile>({
    path: "/api/platform/me",
    token,
    backendUrl
  });
}

export async function platformVerifyDomain(token: string, tenantId: string, backendUrl?: string) {
  return authedJson<{
    tenant_id: string;
    verified: boolean;
    records: string[];
    message: string;
    domain_verification: PlatformTenant["domain_verification"];
  }>({
    path: "/api/platform/verify-domain",
    token,
    method: "POST",
    body: {
      tenant_id: tenantId
    },
    backendUrl
  });
}

export async function platformRunIngest(token: string, tenantId: string, replace = true, backendUrl?: string) {
  return authedJson<{
    tenant_id: string;
    ingestion: PlatformIngestionSummary;
    knowledge_base: PlatformTenant["knowledge_base"];
  }>({
    path: "/api/platform/ingest",
    token,
    method: "POST",
    body: {
      tenant_id: tenantId,
      replace
    },
    backendUrl
  });
}

export async function platformUpdateTenantProfile(
  token: string,
  payload: {
    tenant_id: string;
    business_type?: string;
    supported_services?: PlatformService[];
    support_phone?: string;
    support_email?: string;
    support_cta_label?: string;
    header_cta_label?: string;
    header_cta_notice?: string;
    business_description?: string;
    primary_color?: string;
    user_bubble_color?: string;
    bot_bubble_color?: string;
    font_family?: string;
    widget_position?: "left" | "right";
    launcher_style?: "rounded" | "pill" | "square" | "minimal";
    theme_style?: ThemeStyle;
    bg_pattern?: BgPattern;
    launcher_icon?: LauncherIcon;
    window_width?: number;
    window_height?: number;
    border_radius?: number;
    welcome_message?: string;
    bot_name?: string;
    bot_avatar_url?: string;
    quick_replies?: string[];
    ai_tone?: AiTone;
    notif_enabled?: boolean;
    notif_text?: string;
    notif_animation?: NotifAnimation;
    notif_chips?: string[];
    csat_enabled?: boolean;
    csat_prompt?: string;
  },
  backendUrl?: string
) {
  return authedJson<{
    tenant: PlatformTenant;
  }>({
    path: "/api/platform/tenant-profile",
    token,
    method: "PATCH",
    body: payload,
    backendUrl
  });
}

export async function platformUpdateTenantDomain(
  token: string,
  payload: {
    tenant_id: string;
    website_url: string;
  },
  backendUrl?: string
) {
  return authedJson<{
    tenant: PlatformTenant;
  }>({
    path: "/api/platform/domain",
    token,
    method: "PATCH",
    body: payload,
    backendUrl
  });
}

export async function platformGetTenantSources(
  token: string,
  tenantId: string,
  backendUrl?: string
) {
  const encodedTenant = encodeURIComponent(tenantId);
  return authedJson<{
    tenant_id: string;
    sources: PlatformSource[];
  }>({
    path: `/api/platform/sources?tenant_id=${encodedTenant}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformReplaceTenantSources(
  token: string,
  payload: {
    tenant_id: string;
    sources: Array<{ source_type: "sitemap" | "url" | "faq" | "doc_text"; source_value: string }>;
  },
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    sources: PlatformSource[];
    knowledge_base: PlatformTenant["knowledge_base"];
    ingestion: PlatformIngestionSummary;
  }>({
    path: "/api/platform/sources",
    token,
    method: "PUT",
    body: payload,
    backendUrl
  });
}

export async function platformDeleteWorkspace(
  token: string,
  tenantId: string,
  backendUrl?: string
) {
  return authedJson<{ tenant_id: string; deleted: boolean }>({
    path: `/api/platform/workspaces/${encodeURIComponent(tenantId)}`,
    token,
    method: "DELETE",
    backendUrl
  });
}

export async function platformGetSubscription(token: string, backendUrl?: string) {
  return authedJson<{
    subscription: PlatformSubscription;
  }>({
    path: "/api/platform/subscription",
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformCreateSubscriptionCheckout(
  token: string,
  plan: "starter" | "growth",
  backendUrl?: string
) {
  return authedJson<{
    checkout_url: string;
    session_id: string;
  }>({
    path: "/api/platform/subscription",
    token,
    method: "POST",
    body: { plan },
    backendUrl
  });
}

export async function platformGetAnalytics(
  token: string,
  input: {
    range: PlatformAnalyticsRange;
    tenantId?: string;
    timezone?: string;
  },
  backendUrl?: string
) {
  const params = new URLSearchParams();
  params.set("range", input.range);
  if (input.tenantId?.trim()) {
    params.set("tenant_id", input.tenantId.trim());
  }
  if (input.timezone?.trim()) {
    params.set("timezone", input.timezone.trim());
  }

  return authedJson<PlatformAnalyticsResponse>({
    path: `/api/platform/analytics?${params.toString()}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformGetWorkspaceRetention(
  token: string,
  tenantId: string,
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    retention: PlatformRetentionSettings;
  }>({
    path: `/api/platform/workspaces/${encodeURIComponent(tenantId)}/retention`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformUpdateWorkspaceRetention(
  token: string,
  input: {
    tenantId: string;
    conversationRetentionDays?: number;
    retentionPurgeGraceDays?: number;
    allowConversationExport?: boolean;
  },
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    retention: PlatformRetentionSettings;
  }>({
    path: `/api/platform/workspaces/${encodeURIComponent(input.tenantId)}/retention`,
    token,
    method: "PATCH",
    body: {
      conversation_retention_days: input.conversationRetentionDays,
      retention_purge_grace_days: input.retentionPurgeGraceDays,
      allow_conversation_export: input.allowConversationExport
    },
    backendUrl
  });
}

export async function platformExportConversationsJson(
  token: string,
  input: {
    tenantId: string;
    startAt?: string;
    endAt?: string;
    includeMessages?: boolean;
    includeEvents?: boolean;
    limit?: number;
    offset?: number;
  },
  backendUrl?: string
) {
  const params = new URLSearchParams();
  params.set("tenant_id", input.tenantId);
  params.set("format", "json");
  if (input.startAt?.trim()) {
    params.set("start_at", input.startAt.trim());
  }
  if (input.endAt?.trim()) {
    params.set("end_at", input.endAt.trim());
  }
  if (typeof input.includeMessages === "boolean") {
    params.set("include_messages", input.includeMessages ? "1" : "0");
  }
  if (typeof input.includeEvents === "boolean") {
    params.set("include_events", input.includeEvents ? "1" : "0");
  }
  if (typeof input.limit === "number") {
    params.set("limit", String(input.limit));
  }
  if (typeof input.offset === "number") {
    params.set("offset", String(input.offset));
  }

  return authedJson<{
    tenant_id: string;
    total: number;
    limit: number;
    offset: number;
    export: {
      generated_at: string;
      conversations: PlatformConversationExportConversation[];
      messages?: PlatformConversationExportMessage[];
      events?: PlatformConversationExportEvent[];
    };
  }>({
    path: `/api/platform/conversations/export?${params.toString()}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformExportConversationsCsv(
  token: string,
  input: {
    tenantId: string;
    startAt?: string;
    endAt?: string;
    includeMessages?: boolean;
    includeEvents?: boolean;
    limit?: number;
    offset?: number;
  },
  backendUrl?: string
) {
  const params = new URLSearchParams();
  params.set("tenant_id", input.tenantId);
  params.set("format", "csv");
  if (input.startAt?.trim()) {
    params.set("start_at", input.startAt.trim());
  }
  if (input.endAt?.trim()) {
    params.set("end_at", input.endAt.trim());
  }
  if (typeof input.includeMessages === "boolean") {
    params.set("include_messages", input.includeMessages ? "1" : "0");
  }
  if (typeof input.includeEvents === "boolean") {
    params.set("include_events", input.includeEvents ? "1" : "0");
  }
  if (typeof input.limit === "number") {
    params.set("limit", String(input.limit));
  }
  if (typeof input.offset === "number") {
    params.set("offset", String(input.offset));
  }

  const path = `/api/platform/conversations/export?${params.toString()}`;
  const base = resolvePlatformApiBaseUrl(backendUrl);
  let response: Response;

  try {
    response = await fetch(`${base}${path}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    throw toNetworkError(path, error);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.blob();
}

export async function platformGetVisitorContacts(
  token: string,
  input: {
    tenantId: string;
    query?: string;
    limit?: number;
    offset?: number;
  },
  backendUrl?: string
) {
  const params = new URLSearchParams();
  params.set("tenant_id", input.tenantId);
  if (input.query?.trim()) {
    params.set("query", input.query.trim());
  }
  if (typeof input.limit === "number") {
    params.set("limit", String(input.limit));
  }
  if (typeof input.offset === "number") {
    params.set("offset", String(input.offset));
  }

  return authedJson<PlatformVisitorContactsResponse>({
    path: `/api/platform/visitor-contacts?${params.toString()}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformUpdateUser(
  token: string,
  payload: {
    full_name?: string;
    email?: string;
    current_password?: string;
    new_password?: string;
    avatar_url?: string | null;
  },
  backendUrl?: string
) {
  return authedJson<{ user: PlatformUser }>({
    path: "/api/platform/me",
    token,
    method: "PATCH",
    body: payload,
    backendUrl
  });
}

export function getPlatformOauthUrl(provider: PlatformOauthProvider, backendUrl?: string, appUrl?: string) {
  const url = new URL(`/api/platform/oauth/${provider}`, resolvePlatformApiBaseUrl(backendUrl));
  if (appUrl?.trim()) {
    url.searchParams.set("app_url", appUrl.trim());
  }
  return url.toString();
}

export async function platformAgentInbox(
  token: string,
  backendUrl?: string,
  tenantId?: string
) {
  const params = tenantId?.trim() ? `?tenant_id=${encodeURIComponent(tenantId.trim())}` : "";
  return authedJson<{
    agent_id: string;
    conversations: ChatThread[];
    my_active: ChatThread[];
    queue_unassigned: ChatThread[];
  }>({
    path: `/api/agent/inbox${params}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformAgentConversationMessages(
  token: string,
  conversationId: string,
  backendUrl?: string
) {
  return authedJson<{
    chat_id: string;
    messages: ChatMessage[];
  }>({
    path: `/api/agent/conversation/${encodeURIComponent(conversationId)}/messages`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformAgentAcceptConversation(
  token: string,
  conversationId: string,
  backendUrl?: string
) {
  return authedJson<{
    chat_id: string;
    mode: ConversationMode;
    status: string;
    assigned_agent_id: string | null;
  }>({
    path: `/api/agent/conversation/${encodeURIComponent(conversationId)}/accept`,
    token,
    method: "POST",
    backendUrl
  });
}

export async function platformAgentReplyConversation(
  token: string,
  input: {
    conversationId: string;
    content: string;
    isInternal?: boolean;
    clientMessageId?: string;
  },
  backendUrl?: string
) {
  return authedJson<{
    message: ChatMessage;
  }>({
    path: `/api/agent/conversation/${encodeURIComponent(input.conversationId)}/reply`,
    token,
    method: "POST",
    body: {
      content: input.content,
      is_internal: Boolean(input.isInternal),
      client_message_id: input.clientMessageId ?? generateClientMessageId()
    },
    backendUrl
  });
}

export async function platformAgentReturnToAI(
  token: string,
  conversationId: string,
  backendUrl?: string
) {
  return authedJson<{
    chat_id: string;
    mode: ConversationMode;
    status: string;
  }>({
    path: `/api/agent/conversation/${encodeURIComponent(conversationId)}/return-to-ai`,
    token,
    method: "POST",
    backendUrl
  });
}

export async function platformAgentTyping(
  token: string,
  conversationId: string,
  isTyping: boolean,
  backendUrl?: string
) {
  return authedJson<{ ok: boolean }>({
    path: `/api/agent/conversation/${encodeURIComponent(conversationId)}/typing`,
    token,
    method: "POST",
    body: { is_typing: isTyping },
    backendUrl
  });
}

export async function platformAgentTransferConversation(
  token: string,
  input: {
    conversationId: string;
    targetAgentUserId?: string;
    targetQueueId?: string;
  },
  backendUrl?: string
) {
  return authedJson<{
    chat_id: string;
    mode: ConversationMode;
    status: string;
    assigned_agent_id: string | null;
    queue_id: string | null;
  }>({
    path: `/api/agent/conversation/${encodeURIComponent(input.conversationId)}/transfer`,
    token,
    method: "POST",
    body: {
      target_agent_user_id: input.targetAgentUserId,
      target_queue_id: input.targetQueueId
    },
    backendUrl
  });
}

export async function platformAgentHeartbeat(
  token: string,
  input: {
    tenantId: string;
    status?: AgentPresenceStatus;
    metadata?: Record<string, unknown>;
  },
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    heartbeat: {
      workspace_member_id: string;
      user_id: string;
      status: AgentPresenceStatus;
      last_heartbeat_at: string;
    };
  }>({
    path: "/api/agent/presence",
    token,
    method: "POST",
    body: {
      tenant_id: input.tenantId,
      status: input.status,
      metadata: input.metadata
    },
    backendUrl
  });
}

export async function platformWorkspacePresence(
  token: string,
  tenantId: string,
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    presence: PlatformPresenceEntry[];
  }>({
    path: `/api/agent/presence?tenant_id=${encodeURIComponent(tenantId)}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformWorkspaceTeam(
  token: string,
  tenantId: string,
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    members: PlatformWorkspaceMember[];
    invitations: PlatformWorkspaceInvitation[];
  }>({
    path: `/api/platform/team?tenant_id=${encodeURIComponent(tenantId)}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformInviteTeamMember(
  token: string,
  input: {
    tenantId: string;
    email: string;
    role?: "owner" | "admin" | "supervisor" | "agent" | "viewer";
  },
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    invitation: PlatformWorkspaceInvitation;
    invite_url: string;
    invite_token: string;
  }>({
    path: "/api/platform/team",
    token,
    method: "POST",
    body: {
      tenant_id: input.tenantId,
      email: input.email,
      role: input.role
    },
    backendUrl
  });
}

export async function platformUpdateTeamMemberRole(
  token: string,
  input: {
    tenantId: string;
    userId: string;
    role: "owner" | "admin" | "supervisor" | "agent" | "viewer";
  },
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    member: PlatformWorkspaceMember;
  }>({
    path: "/api/platform/team",
    token,
    method: "PATCH",
    body: {
      tenant_id: input.tenantId,
      user_id: input.userId,
      role: input.role
    },
    backendUrl
  });
}

export async function platformAcceptTeamInvitation(
  token: string,
  inviteToken: string,
  backendUrl?: string
) {
  return authedJson<{
    member: PlatformWorkspaceMember;
    invitation: PlatformWorkspaceInvitation;
  }>({
    path: "/api/platform/team/invitations/accept",
    token,
    method: "POST",
    body: {
      token: inviteToken
    },
    backendUrl
  });
}

export async function platformQueues(
  token: string,
  tenantId: string,
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    queues: PlatformQueue[];
  }>({
    path: `/api/platform/queues?tenant_id=${encodeURIComponent(tenantId)}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformCreateQueue(
  token: string,
  input: {
    tenantId: string;
    name: string;
    routingMode?: "manual_accept" | "auto_assign";
    routingStrategy?: "priority_least_active" | "round_robin";
    isVipQueue?: boolean;
  },
  backendUrl?: string
) {
  return authedJson<{
    queue: PlatformQueue;
  }>({
    path: "/api/platform/queues",
    token,
    method: "POST",
    body: {
      tenant_id: input.tenantId,
      name: input.name,
      routing_mode: input.routingMode,
      routing_strategy: input.routingStrategy,
      is_vip_queue: input.isVipQueue
    },
    backendUrl
  });
}

export async function platformQueueMembers(
  token: string,
  input: {
    tenantId: string;
    queueId: string;
  },
  backendUrl?: string
) {
  return authedJson<{
    queue_id: string;
    members: PlatformQueueMember[];
  }>({
    path: `/api/platform/queues/${encodeURIComponent(input.queueId)}/members?tenant_id=${encodeURIComponent(input.tenantId)}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformAddQueueMember(
  token: string,
  input: {
    tenantId: string;
    queueId: string;
    userId: string;
    priority?: number;
    maxConcurrentChats?: number;
    skills?: string[];
    handlesVip?: boolean;
  },
  backendUrl?: string
) {
  return authedJson<{
    queue_member: {
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
    };
  }>({
    path: `/api/platform/queues/${encodeURIComponent(input.queueId)}/members`,
    token,
    method: "POST",
    body: {
      tenant_id: input.tenantId,
      user_id: input.userId,
      priority: input.priority,
      max_concurrent_chats: input.maxConcurrentChats,
      skills: input.skills,
      handles_vip: input.handlesVip
    },
    backendUrl
  });
}

export async function platformUpdateQueue(
  token: string,
  input: {
    tenantId: string;
    queueId: string;
    name?: string;
    routingMode?: "manual_accept" | "auto_assign";
    routingStrategy?: "priority_least_active" | "round_robin";
    isVipQueue?: boolean;
    isActive?: boolean;
    businessHours?: Record<string, unknown>;
    afterHoursAction?: QueueAfterHoursAction;
    overflowQueueId?: string | null;
    slaFirstResponseSeconds?: number;
    slaWarningSeconds?: number;
    overflowAfterSeconds?: number;
  },
  backendUrl?: string
) {
  return authedJson<{
    queue: PlatformQueue;
  }>({
    path: `/api/platform/queues/${encodeURIComponent(input.queueId)}`,
    token,
    method: "PATCH",
    body: {
      tenant_id: input.tenantId,
      name: input.name,
      routing_mode: input.routingMode,
      routing_strategy: input.routingStrategy,
      is_active: input.isActive,
      is_vip_queue: input.isVipQueue,
      business_hours: input.businessHours,
      after_hours_action: input.afterHoursAction,
      overflow_queue_id: input.overflowQueueId,
      sla_first_response_seconds: input.slaFirstResponseSeconds,
      sla_warning_seconds: input.slaWarningSeconds,
      overflow_after_seconds: input.overflowAfterSeconds
    },
    backendUrl
  });
}

export async function platformSupervisorConversations(
  token: string,
  tenantId: string,
  input?: {
    includeClosed?: boolean;
  },
  backendUrl?: string
) {
  const includeClosed = input?.includeClosed ? "&include_closed=1" : "";
  return authedJson<{
    tenant_id: string;
    conversations: ChatThread[];
  }>({
    path: `/api/supervisor/conversations?tenant_id=${encodeURIComponent(tenantId)}${includeClosed}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformSupervisorAgentLoad(
  token: string,
  tenantId: string,
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    agents: SupervisorAgentLoad[];
  }>({
    path: `/api/supervisor/agents?tenant_id=${encodeURIComponent(tenantId)}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformSupervisorQueueStats(
  token: string,
  input: {
    tenantId: string;
    queueId: string;
  },
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    queue_id: string;
    stats: {
      pending_count: number;
      active_count: number;
      closed_count: number;
      breached_count: number;
      avg_wait_seconds: number;
    };
  }>({
    path: `/api/supervisor/queue/${encodeURIComponent(input.queueId)}/stats?tenant_id=${encodeURIComponent(input.tenantId)}`,
    token,
    method: "GET",
    backendUrl
  });
}

export async function platformSupervisorReassignConversation(
  token: string,
  input: {
    conversationId: string;
    targetAgentUserId: string;
    targetQueueId?: string;
  },
  backendUrl?: string
) {
  return authedJson<{
    chat_id: string;
    mode: ConversationMode;
    status: string;
    assigned_agent_id: string | null;
    queue_id: string | null;
  }>({
    path: `/api/supervisor/conversation/${encodeURIComponent(input.conversationId)}/reassign`,
    token,
    method: "POST",
    body: {
      target_agent_user_id: input.targetAgentUserId,
      target_queue_id: input.targetQueueId
    },
    backendUrl
  });
}

export async function platformSupervisorForceCloseConversation(
  token: string,
  conversationId: string,
  backendUrl?: string
) {
  return authedJson<{
    chat_id: string;
    mode: ConversationMode;
    status: string;
    closed_at: string | null;
  }>({
    path: `/api/supervisor/conversation/${encodeURIComponent(conversationId)}/force-close`,
    token,
    method: "POST",
    body: {},
    backendUrl
  });
}

export async function platformAgentCopilot(
  token: string,
  input: {
    conversationId: string;
    action: "enable" | "disable" | "draft";
    prompt?: string;
  },
  backendUrl?: string
) {
  return authedJson<{
    chat_id: string;
    mode: ConversationMode;
    status?: string;
    draft?: {
      draft: string;
      metadata: Record<string, unknown>;
      response_source: string;
      based_on_message_id: string | null;
    };
  }>({
    path: `/api/agent/conversation/${encodeURIComponent(input.conversationId)}/copilot`,
    token,
    method: "POST",
    body: {
      action: input.action,
      prompt: input.prompt
    },
    backendUrl
  });
}
