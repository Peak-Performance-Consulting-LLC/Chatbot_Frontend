import type {
  PlatformProfile,
  PlatformService,
  PlatformSource,
  PlatformTenant,
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
  tenant: {
    tenant_id: string;
    name: string;
    domain: string;
    business_profile: TenantBusinessProfile;
  };
  domain_verification: {
    status: "pending" | "verified";
    txt_name: string;
    txt_value: string;
    verified_at: string | null;
  };
  widget: PlatformTenant["widget"];
  ingest: {
    inserted_chunks: number;
    fetched_documents: number;
    skipped_documents: number;
    errors: string[];
  };
};

function resolveBaseUrl(override?: string) {
  return (override || import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");
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
  method?: "GET" | "POST" | "PATCH" | "PUT";
  body?: unknown;
  backendUrl?: string;
}): Promise<T> {
  const base = resolveBaseUrl(input.backendUrl);
  const response = await fetch(`${base}${input.path}`, {
    method: input.method ?? "GET",
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
  const base = resolveBaseUrl(backendUrl);
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
    tenant: {
      tenant_id: string;
      name: string;
      domain: string;
      business_profile: TenantBusinessProfile;
    };
    domain_verification: PlatformTenant["domain_verification"];
    widget: PlatformTenant["widget"];
    ingest: {
      inserted_chunks: number;
      fetched_documents: number;
      skipped_documents: number;
      errors: string[];
    };
  }>({
    path: "/api/platform/workspaces",
    token,
    method: "POST",
    body: payload,
    backendUrl
  });
}

export async function platformLogin(payload: LoginPayload, backendUrl?: string) {
  const base = resolveBaseUrl(backendUrl);
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
    ingestion: {
      inserted_chunks: number;
      fetched_documents: number;
      skipped_documents: number;
      errors: string[];
    };
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
    business_description?: string;
  },
  backendUrl?: string
) {
  return authedJson<{
    tenant_id: string;
    business_profile: TenantBusinessProfile;
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
    tenant_id: string;
    domain: string;
    allowed_domains: string[];
    domain_verification: PlatformTenant["domain_verification"];
    widget: PlatformTenant["widget"];
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
  }>({
    path: "/api/platform/sources",
    token,
    method: "PUT",
    body: payload,
    backendUrl
  });
}
