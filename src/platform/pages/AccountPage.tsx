import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/platform/components/UserAvatar";
import { usePlatformAuth } from "@/platform/state/auth";
import type { PlatformAuthProvider } from "@/platform/types";

const providerLabelMap: Record<PlatformAuthProvider, string> = {
  password: "Password",
  google: "Google",
  facebook: "Facebook"
};

export default function AccountPage() {
  const navigate = useNavigate();
  const { profile, logout, updateUserProfile, loading, error, setError } = usePlatformAuth();

  /* ── edit profile state ─────────────────────────── */
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(profile?.user.full_name ?? "");
  const [email, setEmail] = useState(profile?.user.email ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(profile?.user.avatar_url ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [localError, setLocalError] = useState("");

  const createdAt = profile?.user.created_at
    ? new Date(profile.user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : "N/A";
  const hasPassword = profile?.user.has_password ?? false;
  const authProviders = profile?.user.auth_providers ?? [];
  const authProviderLabels = useMemo(
    () => authProviders.map((provider) => providerLabelMap[provider] ?? provider),
    [authProviders]
  );

  function openEdit() {
    setFullName(profile?.user.full_name ?? "");
    setEmail(profile?.user.email ?? "");
    setProfileImageUrl(profile?.user.avatar_url ?? "");
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setSaveStatus("");
    setLocalError("");
    setError("");
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setSaveStatus("");
    setLocalError("");
    setError("");
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");
    setError("");
    setSaveStatus("");

    if (newPw && newPw !== confirmPw) {
      setLocalError("New passwords do not match.");
      return;
    }

    const payload: Parameters<typeof updateUserProfile>[0] = {};
    if (fullName.trim() !== (profile?.user.full_name ?? "")) payload.full_name = fullName;
    if (email.trim() !== (profile?.user.email ?? "")) payload.email = email;
    if (profileImageUrl.trim() !== (profile?.user.avatar_url ?? "")) {
      payload.avatar_url = profileImageUrl.trim() ? profileImageUrl.trim() : null;
    }
    if (newPw) {
      if (currentPw.trim()) {
        payload.current_password = currentPw;
      }
      payload.new_password = newPw;
    }

    if (Object.keys(payload).length === 0) {
      setLocalError("No changes to save.");
      return;
    }

    try {
      await updateUserProfile(payload);
      setSaveStatus("Profile updated successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setEditMode(false);
    } catch {
      // error shown via context
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Workspace Access</p>
          <h2 className="app-h1">Account</h2>
          <p className="app-lead">Manage your profile image, sign-in methods, workspace access, and active session.</p>
        </div>
        {!editMode && (
          <button className="app-btn-secondary" type="button" onClick={openEdit} style={{ gap: "6px" }}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      <div className="app-card">
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px", flexWrap: "wrap" }}>
          <UserAvatar
            name={profile?.user.full_name}
            avatarUrl={profile?.user.avatar_url}
            className="app-avatar"
            imageClassName="app-avatar-image"
            fallbackClassName="app-avatar-fallback"
          />
          <div>
            <p
              style={{
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: "1.5rem",
                fontWeight: 400,
                color: "#0a0a0f",
                margin: "0 0 3px"
              }}
            >
              {profile?.user.full_name || "N/A"}
            </p>
            <p style={{ fontSize: "0.85rem", color: "rgba(10,10,15,0.5)", margin: "0 0 4px" }}>{profile?.user.email || "N/A"}</p>
            <p style={{ fontSize: "0.75rem", color: "rgba(10,10,15,0.35)", margin: 0 }}>Member since {createdAt}</p>
            {authProviderLabels.length > 0 ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                {authProviderLabels.map((provider) => (
                  <span
                    key={provider}
                    style={{
                      borderRadius: "999px",
                      background: "rgba(10,10,15,0.05)",
                      border: "1px solid rgba(10,10,15,0.08)",
                      padding: "4px 10px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "rgba(10,10,15,0.65)"
                    }}
                  >
                    {provider}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="app-stat-grid" style={{ marginBottom: 0 }}>
          <div className="app-stat-card">
            <p className="stat-label">Email</p>
            <p className="stat-value" style={{ fontSize: "0.85rem", marginTop: "4px" }}>{profile?.user.email || "N/A"}</p>
          </div>
          <div className="app-stat-card">
            <p className="stat-label">Sign-in methods</p>
            <p className="stat-value" style={{ fontSize: "1rem" }}>
              {authProviderLabels.join(", ") || "Password"}
            </p>
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

      {saveStatus && <p className="app-success">{saveStatus}</p>}

      {editMode && (
        <div className="app-card">
          <p className="app-card-title">Edit profile</p>
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="app-stat-grid" style={{ marginBottom: 0 }}>
              <div className="app-form-group" style={{ marginBottom: 0 }}>
                <span>Full name</span>
                <input
                  className="app-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="app-form-group" style={{ marginBottom: 0 }}>
                <span>Email</span>
                <input
                  className="app-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="app-form-group" style={{ marginBottom: 0 }}>
              <span>Profile image URL</span>
              <input
                className="app-input"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
              <p style={{ fontSize: "0.78rem", color: "rgba(10,10,15,0.45)", margin: "8px 0 0" }}>
                Leave this blank to fall back to your Google or Facebook photo, or your initials if none is linked.
              </p>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(10,10,15,0.08)", margin: 0 }} />
            <p style={{ fontSize: "0.82rem", color: "rgba(10,10,15,0.45)", margin: "0 0 -8px" }}>
              {hasPassword
                ? "Change password — leave blank to keep your current password"
                : "Set a password to allow direct email login in addition to Google or Facebook sign-in."}
            </p>

            <div className="app-stat-grid" style={{ marginBottom: 0 }}>
              <div className="app-form-group" style={{ marginBottom: 0 }}>
                <span>Current password</span>
                <input
                  className="app-input"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder={hasPassword ? "Required to change password" : "Not required for your first password"}
                />
              </div>
              <div className="app-form-group" style={{ marginBottom: 0 }}>
                <span>New password</span>
                <input
                  className="app-input"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min 8 characters"
                />
              </div>
              <div className="app-form-group" style={{ marginBottom: 0 }}>
                <span>Confirm new password</span>
                <input
                  className="app-input"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            {(localError || error) && <p className="app-error">{localError || error}</p>}

            <div className="app-action-row" style={{ marginTop: "4px" }}>
              <button className="app-btn-primary" type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save changes"}
              </button>
              <button className="app-btn-secondary" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="app-two-col">
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

        <div className="app-card">
          <p className="app-card-title">Session</p>
          <div className="app-note-list" style={{ marginBottom: "24px" }}>
            <div className="app-note">
              <strong>Secure workspace session</strong>
              <p>Use logout when switching operators or devices to keep tenant access protected.</p>
            </div>
            <div className="app-note">
              <strong>Connected sign-in methods</strong>
              <p>
                {authProviderLabels.length > 0
                  ? `You can access this workspace with ${authProviderLabels.join(", ")}.`
                  : "You can access this workspace with your saved password."}
              </p>
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
