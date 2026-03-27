import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  platformExportConversationsCsv,
  platformExportConversationsJson,
  platformGetWorkspaceRetention,
  platformUpdateWorkspaceRetention
} from "@/lib/platformApi";
import UserAvatar from "@/platform/components/UserAvatar";
import { useTrialCountdown } from "@/platform/subscription";
import { usePlatformAuth } from "@/platform/state/auth";
import type {
  PlatformAuthProvider,
  PlatformSubscriptionPlan,
  WorkspaceMemberRole
} from "@/platform/types";

const providerLabelMap: Record<PlatformAuthProvider, string> = {
  password: "Password",
  google: "Google",
  facebook: "Facebook"
};

const roleLabelMap: Record<WorkspaceMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  supervisor: "Supervisor",
  agent: "Agent",
  viewer: "Viewer"
};

const rightsByRole: Record<
  WorkspaceMemberRole,
  Array<{ label: string; enabled: boolean }>
> = {
  owner: [
    { label: "Account and profile management", enabled: true },
    { label: "Conversation export", enabled: true },
    { label: "Retention policy updates", enabled: true },
    { label: "Queue and team administration", enabled: true },
    { label: "Supervisor controls", enabled: true }
  ],
  admin: [
    { label: "Account and profile management", enabled: true },
    { label: "Conversation export", enabled: true },
    { label: "Retention policy updates", enabled: true },
    { label: "Queue and team administration", enabled: true },
    { label: "Supervisor controls", enabled: true }
  ],
  supervisor: [
    { label: "Account and profile management", enabled: true },
    { label: "Conversation export", enabled: true },
    { label: "Retention policy updates", enabled: false },
    { label: "Queue administration", enabled: true },
    { label: "Supervisor controls", enabled: true }
  ],
  agent: [
    { label: "Account and profile management", enabled: true },
    { label: "Conversation export", enabled: true },
    { label: "Retention policy updates", enabled: false },
    { label: "Queue and team administration", enabled: false },
    { label: "Supervisor controls", enabled: false }
  ],
  viewer: [
    { label: "Account and profile management", enabled: true },
    { label: "Conversation export", enabled: true },
    { label: "Retention policy updates", enabled: false },
    { label: "Queue and team administration", enabled: false },
    { label: "Supervisor controls", enabled: false }
  ]
};

export default function AccountPage() {
  const navigate = useNavigate();
  const { profile, token, selectedTenant, logout, updateUserProfile, loading, error, setError } = usePlatformAuth();

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
  const [retentionDays, setRetentionDays] = useState(selectedTenant?.retention?.conversation_retention_days ?? 365);
  const [retentionGraceDays, setRetentionGraceDays] = useState(selectedTenant?.retention?.retention_purge_grace_days ?? 30);
  const [allowExport, setAllowExport] = useState(selectedTenant?.retention?.allow_conversation_export ?? true);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionStatus, setRetentionStatus] = useState("");
  const [exportLoading, setExportLoading] = useState<"" | "json" | "csv">("");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportIncludeMessages, setExportIncludeMessages] = useState(true);
  const [exportIncludeEvents, setExportIncludeEvents] = useState(true);

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
  const subscription = profile?.subscription;
  const trialCountdown = useTrialCountdown(subscription?.trial_ends_at);
  const currentRole = selectedTenant?.workspace_role ?? null;
  const canManageRetention =
    currentRole === "owner" || currentRole === "admin";
  const canExportConversations = Boolean(currentRole);
  const currentRights = currentRole ? rightsByRole[currentRole] : [];

  function formatPlanName(plan: PlatformSubscriptionPlan | undefined) {
    switch (plan) {
      case "starter":
        return "Starter";
      case "growth":
        return "Growth";
      case "enterprise":
        return "Enterprise";
      case "trial":
        return "Trial";
      default:
        return "N/A";
    }
  }

  function formatStatusLabel(status: string | undefined) {
    if (!status) {
      return "N/A";
    }
    if (status === "past_due") {
      return "Past due";
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function formatDate(input: string | null | undefined) {
    if (!input) {
      return "N/A";
    }

    const value = new Date(input);
    if (!Number.isFinite(value.getTime())) {
      return "N/A";
    }

    return value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  useEffect(() => {
    if (!token || !selectedTenant?.tenant_id) {
      return;
    }

    let disposed = false;
    setRetentionLoading(true);
    setRetentionStatus("");

    platformGetWorkspaceRetention(token, selectedTenant.tenant_id)
      .then((response) => {
        if (disposed) {
          return;
        }
        setRetentionDays(response.retention.conversation_retention_days);
        setRetentionGraceDays(response.retention.retention_purge_grace_days);
        setAllowExport(response.retention.allow_conversation_export);
      })
      .catch((err) => {
        if (!disposed) {
          setRetentionStatus(err instanceof Error ? err.message : "Failed to load retention settings");
        }
      })
      .finally(() => {
        if (!disposed) {
          setRetentionLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [selectedTenant?.tenant_id, token]);

  function downloadBlob(blob: Blob, filename: string) {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
  }

  async function handleSaveRetentionSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !selectedTenant?.tenant_id) {
      return;
    }

    setRetentionSaving(true);
    setRetentionStatus("");
    try {
      const response = await platformUpdateWorkspaceRetention(
        token,
        {
          tenantId: selectedTenant.tenant_id,
          conversationRetentionDays: retentionDays,
          retentionPurgeGraceDays: retentionGraceDays,
          allowConversationExport: allowExport
        }
      );
      setRetentionDays(response.retention.conversation_retention_days);
      setRetentionGraceDays(response.retention.retention_purge_grace_days);
      setAllowExport(response.retention.allow_conversation_export);
      setRetentionStatus("Retention policy updated.");
    } catch (err) {
      setRetentionStatus(err instanceof Error ? err.message : "Failed to update retention policy");
    } finally {
      setRetentionSaving(false);
    }
  }

  async function handleExport(format: "json" | "csv") {
    if (!token || !selectedTenant?.tenant_id) {
      return;
    }

    const startAt = exportStartDate ? `${exportStartDate}T00:00:00.000Z` : undefined;
    const endAt = exportEndDate ? `${exportEndDate}T23:59:59.999Z` : undefined;
    setExportLoading(format);
    setRetentionStatus("");

    try {
      if (format === "json") {
        const payload = await platformExportConversationsJson(token, {
          tenantId: selectedTenant.tenant_id,
          startAt,
          endAt,
          includeMessages: exportIncludeMessages,
          includeEvents: exportIncludeEvents
        });
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json;charset=utf-8"
        });
        downloadBlob(
          blob,
          `conversation_export_${selectedTenant.tenant_id}_${new Date().toISOString().slice(0, 10)}.json`
        );
      } else {
        const blob = await platformExportConversationsCsv(token, {
          tenantId: selectedTenant.tenant_id,
          startAt,
          endAt,
          includeMessages: exportIncludeMessages,
          includeEvents: exportIncludeEvents
        });
        downloadBlob(
          blob,
          `conversation_export_${selectedTenant.tenant_id}_${new Date().toISOString().slice(0, 10)}.csv`
        );
      }
      setRetentionStatus(`Conversation export (${format.toUpperCase()}) completed.`);
    } catch (err) {
      setRetentionStatus(err instanceof Error ? err.message : "Failed to export conversations");
    } finally {
      setExportLoading("");
    }
  }

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
            <p className="stat-label">Workspace role</p>
            <p className="stat-value" style={{ fontSize: "1rem", marginTop: "4px" }}>
              {currentRole ? roleLabelMap[currentRole] : "No workspace selected"}
            </p>
          </div>
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
            <p className="stat-label">Current plan</p>
            <p className="stat-value" style={{ fontSize: "1.15rem" }}>
              {formatPlanName(subscription?.plan)}
            </p>
            <p className="stat-desc">
              {subscription?.plan === "trial"
                ? trialCountdown.expired
                  ? "Trial expired. Upgrade required."
                  : `${trialCountdown.compact} remaining`
                : "Managed through Stripe billing."}
            </p>
          </div>
          <div className="app-stat-card">
            <p className="stat-label">Billing status</p>
            <p className="stat-value" style={{ fontSize: "1rem" }}>
              {formatStatusLabel(subscription?.status)}
            </p>
            <p className="stat-desc">
              {subscription?.plan === "trial"
                ? `Ends ${formatDate(subscription?.trial_ends_at)}`
                : subscription?.cancel_at_period_end
                  ? `Cancels ${formatDate(subscription?.current_period_end)}`
                  : `Period ends ${formatDate(subscription?.current_period_end)}`}
            </p>
          </div>
        </div>
      </div>

      {saveStatus && <p className="app-success">{saveStatus}</p>}

      {subscription?.plan === "trial" ? (
        <div className="app-callout warning">
          <div>
            <div className="callout-title">
              {trialCountdown.expired ? "Trial expired" : "Upgrade before your trial ends"}
            </div>
            <div className="callout-body">
              {trialCountdown.expired
                ? "Move to Starter or Growth to restore full paid access."
                : `You have ${trialCountdown.compact} left on Trial, including ${subscription.max_messages_mo.toLocaleString()} visitor messages this month. Upgrade through Stripe Checkout to keep access uninterrupted.`}
            </div>
          </div>
          <Link className="app-btn-secondary" to="/platform/app/pricing">
            Upgrade plan
          </Link>
        </div>
      ) : null}

      {selectedTenant && currentRole ? (
        <div className="app-card">
          <p className="app-card-title">Role and workspace rights</p>
          <p style={{ fontSize: "0.82rem", color: "rgba(10,10,15,0.5)", marginTop: "-8px" }}>
            Workspace: <strong>{selectedTenant.name || selectedTenant.tenant_id}</strong> · Role:{" "}
            <strong>{roleLabelMap[currentRole]}</strong>
          </p>

          <div className="app-stat-grid" style={{ marginTop: "16px", marginBottom: 0 }}>
            {currentRights.map((right) => (
              <div key={right.label} className="app-stat-card" style={{ paddingTop: "18px", paddingBottom: "18px" }}>
                <p className="stat-label">{right.label}</p>
                <p
                  className="stat-value"
                  style={{
                    fontSize: "0.92rem",
                    marginTop: "6px",
                    color: right.enabled ? "#1a5c5c" : "rgba(10,10,15,0.45)"
                  }}
                >
                  {right.enabled ? "Allowed" : "Restricted"}
                </p>
              </div>
            ))}
          </div>

          <div className="app-note-list" style={{ marginTop: "18px" }}>
            <div className="app-note">
              <strong>Account page access</strong>
              <p>Agents, supervisors, admins, and owners can access this page to manage their own profile and workspace visibility.</p>
            </div>
            <div className="app-note">
              <strong>Workspace governance</strong>
              <p>Retention policy changes stay restricted to owner/admin roles. Export remains available to operator roles that can view conversations.</p>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTenant ? (
        <div className="app-card">
          <p className="app-card-title">Workspace Governance</p>
          <p style={{ fontSize: "0.82rem", color: "rgba(10,10,15,0.5)", marginTop: "-8px" }}>
            Workspace: <strong>{selectedTenant.name || selectedTenant.tenant_id}</strong>
          </p>
          <form
            onSubmit={handleSaveRetentionSettings}
            style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "14px" }}
          >
            <div className="app-stat-grid" style={{ marginBottom: 0 }}>
              <label className="app-form-group" style={{ marginBottom: 0 }}>
                <span>Retention days</span>
                <input
                  type="number"
                  min={30}
                  max={3650}
                  className="app-input"
                  value={retentionDays}
                  onChange={(event) => setRetentionDays(Number(event.target.value))}
                  disabled={retentionLoading || !canManageRetention}
                />
              </label>
              <label className="app-form-group" style={{ marginBottom: 0 }}>
                <span>Purge grace days</span>
                <input
                  type="number"
                  min={0}
                  max={3650}
                  className="app-input"
                  value={retentionGraceDays}
                  onChange={(event) => setRetentionGraceDays(Number(event.target.value))}
                  disabled={retentionLoading || !canManageRetention}
                />
              </label>
              <div
                className="app-form-group"
                style={{ marginBottom: 0, justifyContent: "center", alignItems: "flex-start", gap: "8px" }}
              >
                <span>Allow export</span>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
                  <input
                    type="checkbox"
                    checked={allowExport}
                    onChange={(event) => setAllowExport(event.target.checked)}
                    disabled={retentionLoading || !canManageRetention}
                  />
                  Enable conversation export
                </label>
              </div>
            </div>

            {canManageRetention ? (
              <div className="app-action-row" style={{ marginTop: 0 }}>
                <button className="app-btn-primary" type="submit" disabled={retentionSaving || retentionLoading}>
                  {retentionSaving ? "Saving…" : "Save Retention Policy"}
                </button>
              </div>
            ) : (
              <p style={{ fontSize: "0.78rem", color: "rgba(10,10,15,0.45)", margin: 0 }}>
                Retention policy can be edited by owner/admin roles.
              </p>
            )}
          </form>

          <div style={{ marginTop: "18px", borderTop: "1px solid rgba(10,10,15,0.08)", paddingTop: "16px" }}>
            <p style={{ fontSize: "0.84rem", fontWeight: 600, margin: "0 0 8px", color: "#0a0a0f" }}>
              Conversation Export
            </p>
            <div className="app-stat-grid" style={{ marginBottom: "10px" }}>
              <label className="app-form-group" style={{ marginBottom: 0 }}>
                <span>Start date</span>
                <input
                  type="date"
                  className="app-input"
                  value={exportStartDate}
                  onChange={(event) => setExportStartDate(event.target.value)}
                />
              </label>
              <label className="app-form-group" style={{ marginBottom: 0 }}>
                <span>End date</span>
                <input
                  type="date"
                  className="app-input"
                  value={exportEndDate}
                  onChange={(event) => setExportEndDate(event.target.value)}
                />
              </label>
              <div className="app-form-group" style={{ marginBottom: 0 }}>
                <span>Payload options</span>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "8px" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                    <input
                      type="checkbox"
                      checked={exportIncludeMessages}
                      onChange={(event) => setExportIncludeMessages(event.target.checked)}
                    />
                    Include messages
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                    <input
                      type="checkbox"
                      checked={exportIncludeEvents}
                      onChange={(event) => setExportIncludeEvents(event.target.checked)}
                    />
                    Include events
                  </label>
                </div>
              </div>
            </div>

            <div className="app-action-row" style={{ marginTop: 0 }}>
              <button
                className="app-btn-secondary"
                type="button"
                disabled={exportLoading !== "" || !canExportConversations}
                onClick={() => void handleExport("json")}
              >
                {exportLoading === "json" ? "Exporting JSON…" : "Export JSON"}
              </button>
              <button
                className="app-btn-secondary"
                type="button"
                disabled={exportLoading !== "" || !canExportConversations}
                onClick={() => void handleExport("csv")}
              >
                {exportLoading === "csv" ? "Exporting CSV…" : "Export CSV"}
              </button>
            </div>
            {!canExportConversations ? (
              <p style={{ fontSize: "0.78rem", color: "rgba(10,10,15,0.45)", margin: "10px 0 0" }}>
                Conversation export requires workspace conversation visibility.
              </p>
            ) : null}
          </div>

          {retentionStatus ? <p className="app-success" style={{ marginTop: "12px" }}>{retentionStatus}</p> : null}
        </div>
      ) : null}

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
                const tenantRole = tenant.workspace_role ?? "viewer";
                return (
                  <div key={tenant.tenant_id} className="app-workspace-item">
                    <div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0a0a0f", margin: "0 0 2px" }}>
                        {tenant.name || tenant.tenant_id}
                      </p>
                      <p style={{ fontSize: "0.74rem", color: "rgba(10,10,15,0.4)", margin: 0 }}>
                        {tenant.tenant_id} · {roleLabelMap[tenantRole]}
                      </p>
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
