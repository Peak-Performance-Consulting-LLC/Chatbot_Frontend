import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  platformCreateWorkspace,
  platformGetTenantSources,
  platformLogin,
  platformMe,
  platformReplaceTenantSources,
  platformRunIngest,
  platformSignup,
  platformUpdateTenantDomain,
  platformUpdateTenantProfile,
  platformVerifyDomain
} from "@/lib/platformApi";
import type {
  PlatformProfile,
  PlatformSource,
  PlatformTenant,
  PlatformService,
  TenantBusinessProfile
} from "@/platform/types";

const TOKEN_KEY = "aeroconcierge_platform_token";
const SELECTED_TENANT_KEY = "aeroconcierge_platform_selected_tenant";

type SignupInput = {
  full_name: string;
  email: string;
  password: string;
  company_name: string;
  website_url: string;
  sitemap_url?: string;
  faq_text?: string;
  doc_urls?: string[];
};

type PlatformSourcePayload = {
  source_type: "sitemap" | "url" | "faq" | "doc_text";
  source_value: string;
};

type PlatformAuthContextValue = {
  token: string;
  profile: PlatformProfile | null;
  loading: boolean;
  error: string;
  selectedTenantId: string | null;
  selectedTenant: PlatformTenant | null;
  setError: (value: string) => void;
  selectTenant: (tenantId: string) => void;
  login: (input: { email: string; password: string }) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  createWorkspace: (input: {
    company_name: string;
    website_url: string;
    sitemap_url?: string;
    faq_text?: string;
    doc_urls?: string[];
  }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  verifyDomain: (tenantId: string) => Promise<{ verified: boolean; message: string }>;
  runIngest: (tenantId: string, replace?: boolean) => Promise<{ inserted: number; errors: string[] }>;
  updateTenantProfile: (input: {
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
    window_width?: number;
    window_height?: number;
    border_radius?: number;
    welcome_message?: string;
    bot_name?: string;
    bot_avatar_url?: string;
  }) => Promise<TenantBusinessProfile>;
  updateTenantDomain: (input: {
    tenant_id: string;
    website_url: string;
  }) => Promise<void>;
  getTenantSources: (tenantId: string) => Promise<PlatformSource[]>;
  saveTenantSources: (tenantId: string, sources: PlatformSourcePayload[]) => Promise<PlatformSource[]>;
};

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

function resolveBackendUrl() {
  return import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:4000";
}

function upsertTenantInProfile(profile: PlatformProfile | null, tenant: PlatformTenant): PlatformProfile | null {
  if (!profile) {
    return profile;
  }

  const existing = profile.tenants.find((item) => item.tenant_id === tenant.tenant_id);
  if (!existing) {
    return {
      ...profile,
      tenants: [...profile.tenants, tenant]
    };
  }

  return {
    ...profile,
    tenants: profile.tenants.map((item) => (item.tenant_id === tenant.tenant_id ? tenant : item))
  };
}

export function PlatformAuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_TENANT_KEY)
  );

  const backendUrl = resolveBackendUrl();

  const selectedTenant = useMemo(() => {
    if (!profile?.tenants?.length) {
      return null;
    }

    const preferred = selectedTenantId
      ? profile.tenants.find((tenant) => tenant.tenant_id === selectedTenantId) ?? null
      : null;

    return preferred ?? profile.tenants[0] ?? null;
  }, [profile, selectedTenantId]);

  useEffect(() => {
    if (!selectedTenant?.tenant_id) {
      return;
    }

    setSelectedTenantId(selectedTenant.tenant_id);
    localStorage.setItem(SELECTED_TENANT_KEY, selectedTenant.tenant_id);
  }, [selectedTenant?.tenant_id]);

  async function refresh() {
    if (!token) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextProfile = await platformMe(token, backendUrl);
      setProfile(nextProfile);
      if (nextProfile.tenants.length === 0) {
        setSelectedTenantId(null);
        localStorage.removeItem(SELECTED_TENANT_KEY);
      } else if (!nextProfile.tenants.find((tenant) => tenant.tenant_id === selectedTenantId)) {
        const fallback = nextProfile.tenants[0]?.tenant_id ?? null;
        setSelectedTenantId(fallback);
        if (fallback) {
          localStorage.setItem(SELECTED_TENANT_KEY, fallback);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load account profile";
      setError(message);
      setProfile(null);
      localStorage.removeItem(TOKEN_KEY);
      setToken("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login(input: { email: string; password: string }) {
    setLoading(true);
    setError("");

    try {
      const response = await platformLogin(input, backendUrl);
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setProfile({
        user: response.user,
        tenants: response.tenants
      });
      const preferred = response.tenants[0]?.tenant_id ?? null;
      setSelectedTenantId(preferred);
      if (preferred) {
        localStorage.setItem(SELECTED_TENANT_KEY, preferred);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function signup(input: SignupInput) {
    setLoading(true);
    setError("");

    try {
      const response = await platformSignup(input, backendUrl);
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setProfile({
        user: response.user,
        tenants: [response.tenant]
      });
      setSelectedTenantId(response.tenant.tenant_id);
      localStorage.setItem(SELECTED_TENANT_KEY, response.tenant.tenant_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function createWorkspace(input: {
    company_name: string;
    website_url: string;
    sitemap_url?: string;
    faq_text?: string;
    doc_urls?: string[];
  }) {
    if (!token) {
      throw new Error("Not authenticated");
    }

    setLoading(true);
    setError("");

    try {
      const response = await platformCreateWorkspace(token, input, backendUrl);
      setProfile((previous) => upsertTenantInProfile(previous, response.tenant));
      setSelectedTenantId(response.tenant.tenant_id);
      localStorage.setItem(SELECTED_TENANT_KEY, response.tenant.tenant_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create workspace";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SELECTED_TENANT_KEY);
    setToken("");
    setProfile(null);
    setSelectedTenantId(null);
    setError("");
  }

  function selectTenant(tenantId: string) {
    setSelectedTenantId(tenantId);
    localStorage.setItem(SELECTED_TENANT_KEY, tenantId);
  }

  async function verifyDomain(tenantId: string) {
    if (!token) {
      throw new Error("Not authenticated");
    }

    setLoading(true);
    setError("");

    try {
      const response = await platformVerifyDomain(token, tenantId, backendUrl);
      await refresh();
      return {
        verified: response.verified,
        message: response.message
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Domain verification failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function runIngest(tenantId: string, replace = true) {
    if (!token) {
      throw new Error("Not authenticated");
    }

    setLoading(true);
    setError("");

    try {
      const response = await platformRunIngest(token, tenantId, replace, backendUrl);
      setProfile((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          tenants: previous.tenants.map((tenant) =>
            tenant.tenant_id === tenantId
              ? {
                  ...tenant,
                  knowledge_base: response.knowledge_base
                }
              : tenant
          )
        };
      });

      return {
        inserted: response.ingestion.inserted_chunks,
        errors: response.ingestion.errors
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Knowledge ingestion failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function updateTenantProfile(input: {
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
    window_width?: number;
    window_height?: number;
    border_radius?: number;
    welcome_message?: string;
    bot_name?: string;
    bot_avatar_url?: string;
  }) {
    if (!token) {
      throw new Error("Not authenticated");
    }

    setLoading(true);
    setError("");

    try {
      const response = await platformUpdateTenantProfile(token, input, backendUrl);
      setProfile((previous) => upsertTenantInProfile(previous, response.tenant));
      return response.tenant.business_profile;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update tenant profile";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function updateTenantDomain(input: {
    tenant_id: string;
    website_url: string;
  }) {
    if (!token) {
      throw new Error("Not authenticated");
    }

    setLoading(true);
    setError("");

    try {
      const response = await platformUpdateTenantDomain(token, input, backendUrl);
      setProfile((previous) => upsertTenantInProfile(previous, response.tenant));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update tenant domain";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function getTenantSources(tenantId: string) {
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await platformGetTenantSources(token, tenantId, backendUrl);
    return response.sources;
  }

  async function saveTenantSources(tenantId: string, sources: PlatformSourcePayload[]) {
    if (!token) {
      throw new Error("Not authenticated");
    }

    setLoading(true);
    setError("");

    try {
      const response = await platformReplaceTenantSources(
        token,
        {
          tenant_id: tenantId,
          sources
        },
        backendUrl
      );

      setProfile((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          tenants: previous.tenants.map((tenant) =>
            tenant.tenant_id === tenantId
              ? {
                  ...tenant,
                  knowledge_base: response.knowledge_base
                }
              : tenant
          )
        };
      });

      return response.sources;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save tenant sources";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  const value: PlatformAuthContextValue = {
    token,
    profile,
    loading,
    error,
    selectedTenantId,
    selectedTenant,
    setError,
    selectTenant,
    login,
    signup,
    createWorkspace,
    logout,
    refresh,
    verifyDomain,
    runIngest,
    updateTenantProfile,
    updateTenantDomain,
    getTenantSources,
    saveTenantSources
  };

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth() {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error("usePlatformAuth must be used within PlatformAuthProvider");
  }
  return context;
}
