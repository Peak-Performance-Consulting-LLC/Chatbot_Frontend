import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  platformInviteTeamMember,
  platformRemoveTeamMember,
  platformUpdateTeamMemberRole,
  platformWorkspacePresence,
  platformWorkspaceTeam
} from "@/lib/platformApi";
import { usePlatformAuth } from "@/platform/state/auth";
import type {
  PlatformPresenceEntry,
  PlatformWorkspaceInvitation,
  PlatformWorkspaceMember,
  WorkspaceMemberRole
} from "@/platform/types";

const ROLE_OPTIONS: WorkspaceMemberRole[] = ["agent", "admin", "viewer"];

function formatRelativeTs(input: string | null, nowMs = Date.now()) {
  if (!input) {
    return "Never";
  }
  const ts = new Date(input).getTime();
  if (!Number.isFinite(ts)) {
    return "Never";
  }
  const seconds = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDateTime(input: string) {
  const ts = new Date(input);
  if (Number.isNaN(ts.getTime())) {
    return input;
  }
  return ts.toLocaleString();
}

export default function TeamManagementPage() {
  const { token, profile, selectedTenantId, selectedTenant } = usePlatformAuth();
  const backendUrl = import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:3000";
  const [members, setMembers] = useState<PlatformWorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<PlatformWorkspaceInvitation[]>([]);
  const [presence, setPresence] = useState<PlatformPresenceEntry[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>("agent");
  const [pendingRoleByUserId, setPendingRoleByUserId] = useState<Record<string, WorkspaceMemberRole>>({});
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState("");
  const [removingUserId, setRemovingUserId] = useState("");
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const currentRole = selectedTenant?.workspace_role ?? "viewer";
  const canManageTeam = currentRole === "owner" || currentRole === "admin";
  const currentUserId = profile?.user.id ?? "";

  const presenceByUserId = useMemo(() => {
    const map = new Map<string, PlatformPresenceEntry>();
    for (const row of presence) {
      map.set(row.user_id, row);
    }
    return map;
  }, [presence]);

  async function loadData() {
    if (!token || !selectedTenantId) {
      setMembers([]);
      setInvitations([]);
      setPresence([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [teamResponse, presenceResponse] = await Promise.all([
        platformWorkspaceTeam(token, selectedTenantId, backendUrl),
        platformWorkspacePresence(token, selectedTenantId, backendUrl)
      ]);
      setMembers(teamResponse.members);
      setInvitations(teamResponse.invitations ?? []);
      setPresence(presenceResponse.presence);
      setPendingRoleByUserId(
        Object.fromEntries(
          teamResponse.members.map((member) => [member.user_id, member.role])
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }

  async function loadPresenceOnly() {
    if (!token || !selectedTenantId) {
      return;
    }
    try {
      const presenceResponse = await platformWorkspacePresence(token, selectedTenantId, backendUrl);
      setPresence(presenceResponse.presence);
    } catch {
      // Keep last known presence snapshot if refresh fails.
    }
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!token || !selectedTenantId || !inviteEmail.trim()) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await platformInviteTeamMember(
        token,
        {
          tenantId: selectedTenantId,
          email: inviteEmail.trim(),
          role: inviteRole
        },
        backendUrl
      );
      setInviteEmail("");
      setLastInviteUrl(response.invite_url);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleUpdate(member: PlatformWorkspaceMember) {
    const nextRole = pendingRoleByUserId[member.user_id] ?? member.role;
    if (!token || !selectedTenantId || nextRole === member.role) {
      return;
    }

    setUpdatingRoleUserId(member.user_id);
    setError("");
    try {
      await platformUpdateTeamMemberRole(
        token,
        {
          tenantId: selectedTenantId,
          userId: member.user_id,
          role: nextRole
        },
        backendUrl
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed");
    } finally {
      setUpdatingRoleUserId("");
    }
  }

  async function handleRemoveMember(member: PlatformWorkspaceMember) {
    if (!token || !selectedTenantId) {
      return;
    }
    const confirmed = window.confirm(
      `Remove ${member.user?.full_name || member.user?.email || "this member"} from the workspace?`
    );
    if (!confirmed) {
      return;
    }

    setRemovingUserId(member.user_id);
    setError("");
    try {
      await platformRemoveTeamMember(
        token,
        {
          tenantId: selectedTenantId,
          userId: member.user_id
        },
        backendUrl
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Member removal failed");
    } finally {
      setRemovingUserId("");
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTenantId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 10_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token || !selectedTenantId) {
      return;
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void loadPresenceOnly();
    }, 12_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTenantId]);

  return (
    <div className="space-y-6">
      <header className="app-page-header">
        <div>
          <span className="app-kicker">Workspace</span>
          <h1 className="app-h1">Team Management</h1>
          <p className="app-lead">Invite teammates with roles, track pending invites, and update access levels.</p>
        </div>
      </header>

      {error ? (
        <div className="app-callout danger">
          <span className="callout-icon">!</span>
          <div>
            <div className="callout-title">Action failed</div>
            <div className="callout-body">{error}</div>
          </div>
        </div>
      ) : null}

      {canManageTeam ? (
        <section className="app-card">
          <h2 className="app-card-title">Invite Team Member</h2>
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]" onSubmit={handleInvite}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              className="app-input"
              placeholder="agent@company.com"
              required
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as WorkspaceMemberRole)}
              className="app-input"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button type="submit" className="app-btn-primary" disabled={submitting || !selectedTenantId}>
              {submitting ? "Inviting..." : "Send Invite"}
            </button>
          </form>
          {lastInviteUrl ? (
            <div className="mt-3 rounded-xl border border-[#0a0a0f]/10 bg-[#faf8f4] px-3 py-2 text-xs text-[#0a0a0f]/65">
              Latest invite link: <span className="font-mono text-[11px]">{lastInviteUrl}</span>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="app-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="app-card-title !mb-0">Members</h2>
          <div className="flex items-center gap-3">
            <div className="text-xs text-[#0a0a0f]/45">Live status updates every ~12s</div>
            <button type="button" className="app-btn-secondary" disabled={loading} onClick={() => void loadData()}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-[#0a0a0f]/55">No members found for this workspace.</p>
          ) : null}
          {members.map((member) => {
            const memberPresence = member.user ? presenceByUserId.get(member.user.id) : null;
            const status = memberPresence?.effective_status ?? memberPresence?.status ?? "offline";
            const pendingRole = pendingRoleByUserId[member.user_id] ?? member.role;
            const canEditRole = canManageTeam && member.role !== "owner";
            const isUpdatingRole = updatingRoleUserId === member.user_id;
            const canRemoveMember =
              currentRole === "owner" &&
              member.role !== "owner" &&
              member.user_id !== currentUserId;
            const isRemovingMember = removingUserId === member.user_id;
            return (
              <div key={member.id} className="rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#0a0a0f]">
                      {member.user?.full_name || "Unknown user"}
                    </div>
                    <div className="text-sm text-[#0a0a0f]/55">{member.user?.email || "No email"}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-1 uppercase tracking-wide ${
                        status === "online"
                          ? "bg-[#1a5c5c]/12 text-[#1a5c5c]"
                          : status === "busy"
                            ? "bg-[#ffe8df] text-[#a53f22]"
                          : status === "away"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-[#0a0a0f]/8 text-[#0a0a0f]/60"
                      }`}
                    >
                      {status}
                    </span>
                    <span className="text-[#0a0a0f]/45">
                      {formatRelativeTs(memberPresence?.last_heartbeat_at ?? null, nowMs)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    className="app-input max-w-[220px]"
                    value={pendingRole}
                    disabled={!canEditRole || isUpdatingRole}
                    onChange={(event) =>
                      setPendingRoleByUserId((prev) => ({
                        ...prev,
                        [member.user_id]: event.target.value as WorkspaceMemberRole
                      }))
                    }
                  >
                    {[member.role, ...ROLE_OPTIONS.filter((role) => role !== member.role)].map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="app-btn-secondary"
                    disabled={!canEditRole || pendingRole === member.role || isUpdatingRole}
                    onClick={() => void handleRoleUpdate(member)}
                  >
                    {isUpdatingRole ? "Saving..." : "Update Role"}
                  </button>
                  {canRemoveMember ? (
                    <button
                      type="button"
                      className="app-btn-secondary border-red-200 text-red-600 hover:bg-red-50"
                      disabled={isRemovingMember || isUpdatingRole}
                      onClick={() => void handleRemoveMember(member)}
                    >
                      {isRemovingMember ? "Removing..." : "Remove Member"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {canManageTeam ? (
        <section className="app-card">
          <h2 className="app-card-title">Invitations</h2>
          <div className="space-y-2">
            {invitations.length === 0 ? (
              <p className="text-sm text-[#0a0a0f]/55">No invitations found.</p>
            ) : null}
            {invitations.map((invitation) => (
              <div key={invitation.id} className="rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-[#0a0a0f]">{invitation.email}</div>
                    <div className="text-xs text-[#0a0a0f]/50">
                      Role: {invitation.role} • Expires: {formatDateTime(invitation.expires_at)}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs uppercase tracking-wide ${
                      invitation.status === "pending"
                        ? "bg-[#1a5c5c]/12 text-[#1a5c5c]"
                        : invitation.status === "accepted"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-[#0a0a0f]/8 text-[#0a0a0f]/60"
                    }`}
                  >
                    {invitation.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
