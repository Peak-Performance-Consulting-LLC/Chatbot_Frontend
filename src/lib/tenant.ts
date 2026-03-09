const TENANT_BY_HOST: Record<string, string> = {
  "sitea.com": "vacationvista",
  "www.sitea.com": "vacationvista",
  "siteb.com": "brandB",
  "www.siteb.com": "brandB"
};

export function resolveTenantId(explicitTenantId?: string): string {
  if (explicitTenantId && explicitTenantId.trim()) {
    return explicitTenantId.trim();
  }

  const envTenant = import.meta.env.VITE_TENANT_ID;
  if (envTenant && envTenant.trim()) {
    return envTenant.trim();
  }

  const host = window.location.host.toLowerCase();
  return TENANT_BY_HOST[host] ?? "vacationvista";
}
