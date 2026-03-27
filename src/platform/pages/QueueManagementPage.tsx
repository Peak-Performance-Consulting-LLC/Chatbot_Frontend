import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  platformAddQueueMember,
  platformCreateQueue,
  platformQueueMembers,
  platformQueues,
  platformUpdateQueue,
  platformWorkspaceTeam
} from "@/lib/platformApi";
import { usePlatformAuth } from "@/platform/state/auth";
import type {
  PlatformQueue,
  PlatformQueueMember,
  PlatformWorkspaceMember,
  QueueAfterHoursAction
} from "@/platform/types";

type QueueRoutingStrategy = "priority_least_active" | "round_robin";

export default function QueueManagementPage() {
  const { token, selectedTenantId } = usePlatformAuth();
  const backendUrl = import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:3000";
  const [queues, setQueues] = useState<PlatformQueue[]>([]);
  const [teamMembers, setTeamMembers] = useState<PlatformWorkspaceMember[]>([]);
  const [queueMembers, setQueueMembers] = useState<PlatformQueueMember[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState("");
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueueRoutingMode, setNewQueueRoutingMode] = useState<"manual_accept" | "auto_assign">("manual_accept");
  const [newQueueRoutingStrategy, setNewQueueRoutingStrategy] = useState<QueueRoutingStrategy>("priority_least_active");
  const [newQueueIsVipQueue, setNewQueueIsVipQueue] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [priority, setPriority] = useState(100);
  const [maxConcurrentChats, setMaxConcurrentChats] = useState(4);
  const [memberSkillsInput, setMemberSkillsInput] = useState("");
  const [memberHandlesVip, setMemberHandlesVip] = useState(true);
  const [settingsRoutingMode, setSettingsRoutingMode] = useState<"manual_accept" | "auto_assign">("manual_accept");
  const [settingsRoutingStrategy, setSettingsRoutingStrategy] = useState<QueueRoutingStrategy>("priority_least_active");
  const [settingsIsVipQueue, setSettingsIsVipQueue] = useState(false);
  const [settingsAfterHoursAction, setSettingsAfterHoursAction] = useState<QueueAfterHoursAction>("ai_only");
  const [settingsOverflowQueueId, setSettingsOverflowQueueId] = useState("");
  const [settingsSlaFirstResponseSeconds, setSettingsSlaFirstResponseSeconds] = useState(180);
  const [settingsSlaWarningSeconds, setSettingsSlaWarningSeconds] = useState(60);
  const [settingsOverflowAfterSeconds, setSettingsOverflowAfterSeconds] = useState(300);
  const [settingsBusinessHoursJson, setSettingsBusinessHoursJson] = useState(
    '{\n  "timezone": "UTC",\n  "days": {\n    "mon": { "enabled": true, "start": "09:00", "end": "18:00" },\n    "tue": { "enabled": true, "start": "09:00", "end": "18:00" },\n    "wed": { "enabled": true, "start": "09:00", "end": "18:00" },\n    "thu": { "enabled": true, "start": "09:00", "end": "18:00" },\n    "fri": { "enabled": true, "start": "09:00", "end": "18:00" },\n    "sat": { "enabled": false, "start": "09:00", "end": "18:00" },\n    "sun": { "enabled": false, "start": "09:00", "end": "18:00" }\n  }\n}'
  );
  const [loading, setLoading] = useState(false);
  const [submittingQueue, setSubmittingQueue] = useState(false);
  const [submittingMember, setSubmittingMember] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState("");

  const eligibleMembers = useMemo(
    () =>
      teamMembers.filter(
        (member) => member.is_active && member.role !== "viewer" && member.user_id
      ),
    [teamMembers]
  );
  const selectedQueue = useMemo(
    () => queues.find((queue) => queue.id === selectedQueueId) ?? null,
    [queues, selectedQueueId]
  );

  async function loadQueuesAndMembers() {
    if (!token || !selectedTenantId) {
      setQueues([]);
      setTeamMembers([]);
      setQueueMembers([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [queueResponse, teamResponse] = await Promise.all([
        platformQueues(token, selectedTenantId, backendUrl),
        platformWorkspaceTeam(token, selectedTenantId, backendUrl)
      ]);
      setQueues(queueResponse.queues);
      setTeamMembers(teamResponse.members);

      const fallbackQueueId = queueResponse.queues.some((queue) => queue.id === selectedQueueId)
        ? selectedQueueId
        : queueResponse.queues[0]?.id || "";
      setSelectedQueueId(fallbackQueueId);

      if (fallbackQueueId) {
        const membersResponse = await platformQueueMembers(
          token,
          { tenantId: selectedTenantId, queueId: fallbackQueueId },
          backendUrl
        );
        setQueueMembers(membersResponse.members);
      } else {
        setQueueMembers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queues");
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectedQueueMembers(queueId: string) {
    if (!token || !selectedTenantId || !queueId) {
      setQueueMembers([]);
      return;
    }
    setError("");
    try {
      const response = await platformQueueMembers(
        token,
        { tenantId: selectedTenantId, queueId },
        backendUrl
      );
      setQueueMembers(response.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue members");
    }
  }

  async function handleCreateQueue(event: FormEvent) {
    event.preventDefault();
    if (!token || !selectedTenantId || !newQueueName.trim()) {
      return;
    }

    setSubmittingQueue(true);
    setError("");
    try {
      const response = await platformCreateQueue(
        token,
        {
          tenantId: selectedTenantId,
          name: newQueueName.trim(),
          routingMode: newQueueRoutingMode,
          routingStrategy: newQueueRoutingStrategy,
          isVipQueue: newQueueIsVipQueue
        },
        backendUrl
      );
      setNewQueueName("");
      setNewQueueRoutingMode("manual_accept");
      setNewQueueRoutingStrategy("priority_least_active");
      setNewQueueIsVipQueue(false);
      setSelectedQueueId(response.queue.id);
      await loadQueuesAndMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create queue");
    } finally {
      setSubmittingQueue(false);
    }
  }

  async function handleAddQueueMember(event: FormEvent) {
    event.preventDefault();
    if (!token || !selectedTenantId || !selectedQueueId || !selectedUserId) {
      return;
    }

    setSubmittingMember(true);
    setError("");
    try {
      const skills = Array.from(
        new Set(
          memberSkillsInput
            .split(",")
            .map((skill) => skill.trim().toLowerCase())
            .filter(Boolean)
        )
      );

      await platformAddQueueMember(
        token,
        {
          tenantId: selectedTenantId,
          queueId: selectedQueueId,
          userId: selectedUserId,
          priority,
          maxConcurrentChats,
          skills,
          handlesVip: memberHandlesVip
        },
        backendUrl
      );
      setSelectedUserId("");
      setMemberSkillsInput("");
      setMemberHandlesVip(true);
      await loadSelectedQueueMembers(selectedQueueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add queue member");
    } finally {
      setSubmittingMember(false);
    }
  }

  async function handleSaveQueueSettings(event: FormEvent) {
    event.preventDefault();
    if (!token || !selectedTenantId || !selectedQueueId || !selectedQueue) {
      return;
    }

    let parsedBusinessHours: Record<string, unknown> = {};
    try {
      parsedBusinessHours = settingsBusinessHoursJson.trim()
        ? (JSON.parse(settingsBusinessHoursJson) as Record<string, unknown>)
        : {};
    } catch {
      setError("Business hours JSON is invalid");
      return;
    }

    setSavingSettings(true);
    setError("");
    try {
      const businessHoursUnchanged =
        JSON.stringify(parsedBusinessHours) === JSON.stringify(selectedQueue.business_hours ?? {});
      const advancedSettingsChanged =
        settingsAfterHoursAction !== (selectedQueue.after_hours_action ?? "ai_only") ||
        settingsOverflowQueueId !== (selectedQueue.overflow_queue_id ?? "") ||
        settingsSlaFirstResponseSeconds !== (selectedQueue.sla_first_response_seconds ?? 180) ||
        settingsSlaWarningSeconds !== (selectedQueue.sla_warning_seconds ?? 60) ||
        settingsOverflowAfterSeconds !== (selectedQueue.overflow_after_seconds ?? 300) ||
        !businessHoursUnchanged;

      const updatePayload: Parameters<typeof platformUpdateQueue>[1] = {
        tenantId: selectedTenantId,
        queueId: selectedQueueId,
        routingMode: settingsRoutingMode,
        routingStrategy: settingsRoutingStrategy,
        isVipQueue: settingsIsVipQueue
      };

      if (advancedSettingsChanged) {
        updatePayload.afterHoursAction = settingsAfterHoursAction;
        updatePayload.overflowQueueId = settingsOverflowQueueId || null;
        updatePayload.slaFirstResponseSeconds = settingsSlaFirstResponseSeconds;
        updatePayload.slaWarningSeconds = settingsSlaWarningSeconds;
        updatePayload.overflowAfterSeconds = settingsOverflowAfterSeconds;
        updatePayload.businessHours = parsedBusinessHours;
      }

      const response = await platformUpdateQueue(
        token,
        updatePayload,
        backendUrl
      );

      setQueues((prev) =>
        prev.map((queue) => (queue.id === response.queue.id ? response.queue : queue))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save queue settings");
    } finally {
      setSavingSettings(false);
    }
  }

  useEffect(() => {
    void loadQueuesAndMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTenantId]);

  useEffect(() => {
    if (!selectedQueueId) {
      setQueueMembers([]);
      return;
    }
    void loadSelectedQueueMembers(selectedQueueId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueueId]);

  useEffect(() => {
    if (!selectedQueue) {
      return;
    }

    setSettingsRoutingMode(selectedQueue.routing_mode);
    setSettingsRoutingStrategy(selectedQueue.routing_strategy);
    setSettingsIsVipQueue(selectedQueue.is_vip_queue);
    setSettingsAfterHoursAction(selectedQueue.after_hours_action ?? "ai_only");
    setSettingsOverflowQueueId(selectedQueue.overflow_queue_id ?? "");
    setSettingsSlaFirstResponseSeconds(selectedQueue.sla_first_response_seconds ?? 180);
    setSettingsSlaWarningSeconds(selectedQueue.sla_warning_seconds ?? 60);
    setSettingsOverflowAfterSeconds(selectedQueue.overflow_after_seconds ?? 300);
    setSettingsBusinessHoursJson(JSON.stringify(selectedQueue.business_hours ?? {}, null, 2));
  }, [selectedQueue]);

  return (
    <div className="space-y-6">
      <header className="app-page-header">
        <div>
          <span className="app-kicker">Routing</span>
          <h1 className="app-h1">Queue Management</h1>
          <p className="app-lead">Create queues, configure round-robin or least-active routing, and manage VIP/skill-based assignment.</p>
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

      <section className="app-card">
        <h2 className="app-card-title">Create Queue</h2>
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_220px_auto]" onSubmit={handleCreateQueue}>
          <input
            type="text"
            className="app-input"
            value={newQueueName}
            onChange={(event) => setNewQueueName(event.target.value)}
            placeholder="General Support"
            required
          />
          <select
            className="app-input"
            value={newQueueRoutingMode}
            onChange={(event) => setNewQueueRoutingMode(event.target.value as "manual_accept" | "auto_assign")}
          >
            <option value="manual_accept">manual_accept</option>
            <option value="auto_assign">auto_assign</option>
          </select>
          <select
            className="app-input"
            value={newQueueRoutingStrategy}
            onChange={(event) => setNewQueueRoutingStrategy(event.target.value as QueueRoutingStrategy)}
          >
            <option value="priority_least_active">priority_least_active</option>
            <option value="round_robin">round_robin</option>
          </select>
          <button type="submit" className="app-btn-primary" disabled={submittingQueue || !selectedTenantId}>
            {submittingQueue ? "Creating..." : "Create Queue"}
          </button>
          <label className="text-xs text-[#0a0a0f]/65 inline-flex items-center gap-2 md:col-span-4">
            <input
              type="checkbox"
              checked={newQueueIsVipQueue}
              onChange={(event) => setNewQueueIsVipQueue(event.target.checked)}
            />
            VIP priority queue
          </label>
        </form>
      </section>

      <section className="app-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="app-card-title !mb-0">Queues</h2>
          <button type="button" className="app-btn-secondary" onClick={() => void loadQueuesAndMembers()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2">
            {queues.length === 0 ? (
              <p className="text-sm text-[#0a0a0f]/55">No queues yet.</p>
            ) : null}
            {queues.map((queue) => (
              <button
                key={queue.id}
                type="button"
                onClick={() => setSelectedQueueId(queue.id)}
                className={`w-full text-left rounded-xl border px-3 py-3 ${
                  selectedQueueId === queue.id
                    ? "border-[#1a5c5c]/35 bg-[#1a5c5c]/8"
                    : "border-[#0a0a0f]/10 bg-white hover:border-[#0a0a0f]/20"
                }`}
              >
                <div className="font-semibold text-[#0a0a0f]">{queue.name}</div>
                <div className="text-xs text-[#0a0a0f]/45 mt-1">
                  {queue.routing_mode} • {queue.routing_strategy}
                  {queue.is_vip_queue ? " • VIP" : ""}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {!selectedQueueId ? (
              <p className="text-sm text-[#0a0a0f]/55">Select a queue to manage agents.</p>
            ) : (
              <>
                <form className="rounded-xl border border-[#0a0a0f]/10 bg-[#faf8f4] p-4 space-y-3" onSubmit={handleSaveQueueSettings}>
                  <div className="text-sm font-semibold text-[#0a0a0f]">Queue Settings (Phase 5)</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs text-[#0a0a0f]/65 space-y-1">
                      <span>Routing mode</span>
                      <select
                        className="app-input"
                        value={settingsRoutingMode}
                        onChange={(event) => setSettingsRoutingMode(event.target.value as "manual_accept" | "auto_assign")}
                      >
                        <option value="manual_accept">manual_accept</option>
                        <option value="auto_assign">auto_assign</option>
                      </select>
                    </label>
                    <label className="text-xs text-[#0a0a0f]/65 space-y-1">
                      <span>Routing strategy</span>
                      <select
                        className="app-input"
                        value={settingsRoutingStrategy}
                        onChange={(event) => setSettingsRoutingStrategy(event.target.value as QueueRoutingStrategy)}
                      >
                        <option value="priority_least_active">priority_least_active</option>
                        <option value="round_robin">round_robin</option>
                      </select>
                    </label>
                    <label className="text-xs text-[#0a0a0f]/65 space-y-1">
                      <span>After-hours action</span>
                      <select
                        className="app-input"
                        value={settingsAfterHoursAction}
                        onChange={(event) => setSettingsAfterHoursAction(event.target.value as QueueAfterHoursAction)}
                      >
                        <option value="ai_only">ai_only</option>
                        <option value="collect_info">collect_info</option>
                        <option value="overflow">overflow</option>
                      </select>
                    </label>
                    <label className="text-xs text-[#0a0a0f]/65 inline-flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        checked={settingsIsVipQueue}
                        onChange={(event) => setSettingsIsVipQueue(event.target.checked)}
                      />
                      <span>VIP priority queue</span>
                    </label>
                    <label className="text-xs text-[#0a0a0f]/65 space-y-1">
                      <span>Overflow queue</span>
                      <select
                        className="app-input"
                        value={settingsOverflowQueueId}
                        onChange={(event) => setSettingsOverflowQueueId(event.target.value)}
                      >
                        <option value="">None</option>
                        {queues
                          .filter((queue) => queue.id !== selectedQueueId)
                          .map((queue) => (
                            <option key={queue.id} value={queue.id}>
                              {queue.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="text-xs text-[#0a0a0f]/65 space-y-1">
                      <span>SLA first response (seconds)</span>
                      <input
                        type="number"
                        min={0}
                        max={86400}
                        className="app-input"
                        value={settingsSlaFirstResponseSeconds}
                        onChange={(event) => setSettingsSlaFirstResponseSeconds(Number(event.target.value))}
                      />
                    </label>
                    <label className="text-xs text-[#0a0a0f]/65 space-y-1">
                      <span>SLA warning (seconds before breach)</span>
                      <input
                        type="number"
                        min={0}
                        max={86400}
                        className="app-input"
                        value={settingsSlaWarningSeconds}
                        onChange={(event) => setSettingsSlaWarningSeconds(Number(event.target.value))}
                      />
                    </label>
                    <label className="text-xs text-[#0a0a0f]/65 space-y-1">
                      <span>Overflow after wait (seconds)</span>
                      <input
                        type="number"
                        min={0}
                        max={172800}
                        className="app-input"
                        value={settingsOverflowAfterSeconds}
                        onChange={(event) => setSettingsOverflowAfterSeconds(Number(event.target.value))}
                      />
                    </label>
                  </div>
                  <label className="block text-xs text-[#0a0a0f]/65 space-y-1">
                    <span>Business hours JSON</span>
                    <textarea
                      className="app-textarea font-mono text-xs"
                      rows={10}
                      value={settingsBusinessHoursJson}
                      onChange={(event) => setSettingsBusinessHoursJson(event.target.value)}
                    />
                  </label>
                  <div className="flex justify-end">
                    <button type="submit" className="app-btn-primary" disabled={savingSettings}>
                      {savingSettings ? "Saving..." : "Save Queue Settings"}
                    </button>
                  </div>
                </form>

                <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_100px_140px_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_100px_140px_240px_140px_auto]" onSubmit={handleAddQueueMember}>
                  <select
                    className="app-input"
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    required
                  >
                    <option value="">Select agent</option>
                    {eligibleMembers.map((member) => (
                      <option key={member.id} value={member.user_id}>
                        {member.user?.full_name || member.user?.email || member.user_id}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={10_000}
                    className="app-input"
                    value={priority}
                    onChange={(event) => setPriority(Number(event.target.value))}
                    placeholder="Priority"
                  />
                  <input
                    type="number"
                    min={1}
                    max={200}
                    className="app-input"
                    value={maxConcurrentChats}
                    onChange={(event) => setMaxConcurrentChats(Number(event.target.value))}
                    placeholder="Max chats"
                  />
                  <input
                    type="text"
                    className="app-input"
                    value={memberSkillsInput}
                    onChange={(event) => setMemberSkillsInput(event.target.value)}
                    placeholder="Skills (comma separated)"
                  />
                  <label className="text-xs text-[#0a0a0f]/65 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={memberHandlesVip}
                      onChange={(event) => setMemberHandlesVip(event.target.checked)}
                    />
                    Handles VIP
                  </label>
                  <button type="submit" className="app-btn-primary" disabled={submittingMember}>
                    {submittingMember ? "Adding..." : "Add Agent"}
                  </button>
                </form>

                <div className="space-y-2">
                  {queueMembers.length === 0 ? (
                    <p className="text-sm text-[#0a0a0f]/55">No agents in this queue yet.</p>
                  ) : null}
                  {queueMembers.map((queueMember) => (
                    <div key={queueMember.id} className="rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[#0a0a0f]">
                            {queueMember.workspace_member?.platform_user?.full_name || "Unknown"}
                          </div>
                          <div className="text-sm text-[#0a0a0f]/55">
                            {queueMember.workspace_member?.platform_user?.email || "No email"}
                          </div>
                        </div>
                        <div className="text-xs text-[#0a0a0f]/55">
                          Priority: {queueMember.priority} • Capacity: {queueMember.max_concurrent_chats}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-[#faf8f4] px-2 py-1 text-[#0a0a0f]/65">
                          VIP: {queueMember.handles_vip ? "Yes" : "No"}
                        </span>
                        <span className="rounded-full bg-[#faf8f4] px-2 py-1 text-[#0a0a0f]/65">
                          Skills: {queueMember.skills.length > 0 ? queueMember.skills.join(", ") : "Any"}
                        </span>
                        <span className="rounded-full bg-[#faf8f4] px-2 py-1 text-[#0a0a0f]/65">
                          Last assigned:{" "}
                          {queueMember.last_assigned_at
                            ? new Date(queueMember.last_assigned_at).toLocaleString()
                            : "Never"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
