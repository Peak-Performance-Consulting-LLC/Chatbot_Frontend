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
  ThemeStyle,
  PlatformUser,
  TenantBusinessProfile
} from "@/platform/types";

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

export function resolvePlatformApiBaseUrl(override?: string) {
  return (override || import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");
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
  const response = await fetch(`${base}${input.path}`, {
    method: input.method ?? "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`
    },
    ...(input.body ? { body: JSON.stringify(input.body) } : {})
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
}

export async function platformSignup(payload: SignupPayload, backendUrl?: string) {
  const base = resolvePlatformApiBaseUrl(backendUrl);
  const response = await fetch(`${base}/api/platform/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

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
  const response = await fetch(`${base}/api/platform/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as PlatformLoginResponse;
}

export async function platformRequestPasswordReset(payload: ForgotPasswordPayload, backendUrl?: string) {
  const base = resolvePlatformApiBaseUrl(backendUrl);
  const response = await fetch(`${base}/api/platform/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as { ok: boolean; message: string };
}

export async function platformResetPassword(payload: ResetPasswordPayload, backendUrl?: string) {
  const base = resolvePlatformApiBaseUrl(backendUrl);
  const response = await fetch(`${base}/api/platform/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

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
