import { useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

export default function AccountPage() {
  const navigate = useNavigate();
  const { profile, logout } = usePlatformAuth();

  const initials = (profile?.user.full_name ?? "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AC";

  const createdAt = profile?.user.created_at
    ? new Date(profile.user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Workspace Access</p>
          <h2 className="app-h1">Account</h2>
          <p className="app-lead">Manage profile details, workspace access, and your active session.</p>
        </div>
      </div>

      {/* ── Profile card ─────────────────────────────────────────── */}
      <div className="app-card">
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div className="app-avatar">{initials}</div>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "1.5rem", fontWeight: 400, color: "#0a0a0f", margin: "0 0 3px" }}>
              {profile?.user.full_name || "N/A"}
            </p>
            <p style={{ fontSize: "0.85rem", color: "rgba(10,10,15,0.5)", margin: "0 0 4px" }}>{profile?.user.email || "N/A"}</p>
            <p style={{ fontSize: "0.75rem", color: "rgba(10,10,15,0.35)", margin: 0 }}>Member since {createdAt}</p>
          </div>
        </div>

        <div className="app-stat-grid" style={{ marginBottom: 0 }}>
          <div className="app-stat-card">
            <p className="stat-label">Name</p>
            <p className="stat-value" style={{ fontSize: "1rem" }}>{profile?.user.full_name || "N/A"}</p>
          </div>
          <div className="app-stat-card">
            <p className="stat-label">Email</p>
            <p className="stat-value" style={{ fontSize: "0.85rem", marginTop: "4px" }}>{profile?.user.email || "N/A"}</p>
          </div>
          <div className="app-stat-card teal">
            <p className="stat-label">Workspaces</p>
            <p className="stat-value">{profile?.tenants.length || 0}</p>
          </div>
          <div className="app-stat-card">
            <p className="stat-label">Status</p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2a8080", boxShadow: "0 0 0 3px rgba(26,92,92,0.15)", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "1.1rem", color: "#1a5c5c" }}>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-col: workspaces + session ────────────────────────── */}
      <div className="app-two-col">

        {/* Workspace access */}
        <div className="app-card">
          <p className="app-card-title">Workspace access</p>
          {(profile?.tenants ?? []).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(profile?.tenants ?? []).map((tenant) => {
                const verified = tenant.domain_verification?.status === "verified";
                return (
                  <div key={tenant.tenant_id} className="app-workspace-item">
                    <div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0a0a0f", margin: "0 0 2px" }}>
                        {tenant.name || tenant.tenant_id}
                      </p>
                      <p style={{ fontSize: "0.74rem", color: "rgba(10,10,15,0.4)", margin: 0 }}>{tenant.tenant_id}</p>
                    </div>
                    <span className={`app-status-badge ${verified ? "ready" : "pending"}`}>
                      {verified ? "Verified" : "Setup in progress"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="app-empty" style={{ padding: "28px 16px" }}>
              <div className="empty-icon">🏢</div>
              <p className="empty-title">No workspaces yet</p>
              <p className="empty-desc">Create your first workspace through the setup wizard.</p>
            </div>
          )}
        </div>

        {/* Session */}
        <div className="app-card">
          <p className="app-card-title">Session</p>
          <div className="app-note-list" style={{ marginBottom: "24px" }}>
            <div className="app-note">
              <strong>Secure workspace session</strong>
              <p>Use logout when switching operators or devices to keep tenant access protected.</p>
            </div>
            <div className="app-note">
              <strong>Session tokens</strong>
              <p>Your session is JWT-authenticated and scoped to your email address. Tokens expire automatically on inactivity.</p>
            </div>
          </div>

          <button
            className="app-btn-danger"
            type="button"
            onClick={() => { logout(); navigate("/platform/login"); }}
            style={{ width: "100%", justifyContent: "center", paddingTop: "11px", paddingBottom: "11px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>

      </div>
    </div>
  );
}
