import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { appNavItems } from "@/platform/layout/nav";
import { usePlatformAuth } from "@/platform/state/auth";

export default function PlatformShell() {
  const navigate = useNavigate();
  const { profile, selectedTenant, selectedTenantId, selectTenant, logout, loading } = usePlatformAuth();

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="platform-brand">
          <div className="brand-logo">AC</div>
          <div>
            <strong>AeroConcierge</strong>
            <p>Platform Console</p>
          </div>
        </div>

        <nav className="platform-nav">
          {appNavItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) => `platform-nav-item ${isActive ? "active" : ""}`}
            >
              <span className="platform-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="platform-logout"
          onClick={() => {
            logout();
            navigate("/platform/login");
          }}
        >
          Logout
        </button>
      </aside>

      <section className="platform-content-wrap">
        <header className="platform-topbar">
          <div>
            <h1>{selectedTenant?.name || "Workspace"}</h1>
            <p>{selectedTenant?.tenant_id || "Create your first workspace to continue"}</p>
          </div>

          <div className="platform-topbar-actions">
            {profile?.tenants?.length ? (
              <select
                value={selectedTenantId || ""}
                onChange={(event) => selectTenant(event.target.value)}
                disabled={!profile?.tenants?.length || loading}
              >
                {(profile?.tenants ?? []).map((tenant) => (
                  <option key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.name || tenant.tenant_id}
                  </option>
                ))}
              </select>
            ) : (
              <span className="topbar-empty-state">No workspace yet</span>
            )}
          </div>
        </header>

        <main className="platform-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
