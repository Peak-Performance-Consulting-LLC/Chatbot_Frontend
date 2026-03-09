export type PlatformService = "flights" | "hotels" | "cars" | "cruises";

export type TenantBusinessProfile = {
  business_type: string;
  supported_services: PlatformService[];
  support_phone: string | null;
  support_email: string | null;
  support_cta_label: string;
  business_description: string | null;
};

export type PlatformWidgetConfig = {
  tenant_id: string;
  widget_host_url: string;
  backend_url: string;
  embed_url: string;
  script_snippet: string;
  react_snippet: string;
};

export type PlatformSource = {
  id: string;
  tenant_id: string;
  source_type: "sitemap" | "url" | "faq" | "doc_text";
  source_value: string;
  created_at: string;
};

export type PlatformTenant = {
  tenant_id: string;
  name: string | null;
  allowed_domains: string[];
  business_profile: TenantBusinessProfile;
  domain_verification: {
    status: "pending" | "verified";
    txt_name: string;
    txt_value: string;
    verified_at: string | null;
  } | null;
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
