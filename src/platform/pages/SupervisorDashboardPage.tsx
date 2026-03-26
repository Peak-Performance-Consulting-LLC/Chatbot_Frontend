import { useEffect, useMemo, useState } from "react";
import {
  platformQueues,
  platformSupervisorAgentLoad,
  platformSupervisorConversations,
  platformSupervisorForceCloseConversation,
  platformSupervisorReassignConversation,
  platformWorkspaceTeam
} from "@/lib/platformApi";
import { usePlatformAuth } from "@/platform/state/auth";
import type { PlatformQueue, PlatformWorkspaceMember, SupervisorAgentLoad } from "@/platform/types";
import type { ChatThread } from "@/types";

function toDateLabel(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getSlaLabel(conversation: ChatThread) {
  if (conversation.first_agent_response_at) {
    return "Responded";
  }
  if (conversation.sla_breached) {
    return "Breached";
  }
  if (!conversation.sla_first_response_due_at) {
    return "N/A";
  }

  const due = new Date(conversation.sla_first_response_due_at).getTime();
  if (Number.isNaN(due)) {
    return "N/A";
  }

  const diffSeconds = Math.floor((due - Date.now()) / 1000);
  if (diffSeconds <= 0) {
    return "Breached";
  }
  if (diffSeconds <= 60) {
    return `Due in ${diffSeconds}s`;
  }
  return `Due in ${Math.ceil(diffSeconds / 60)}m`;
}

export default function SupervisorDashboardPage() {
  const { token, selectedTenantId } = usePlatformAuth();
  const backendUrl = import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:3000";

  const [conversations, setConversations] = useState<ChatThread[]>([]);
  const [agentLoad, setAgentLoad] = useState<SupervisorAgentLoad[]>([]);
  const [queues, setQueues] = useState<PlatformQueue[]>([]);
  const [team, setTeam] = useState<PlatformWorkspaceMember[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [targetAgentUserId, setTargetAgentUserId] = useState("");
  const [targetQueueId, setTargetQueueId] = useState("");
  const [loading, setLoading] = useState(false);
  const [runningAction, setRunningAction] = useState(false);
  const [error, setError] = useState("");

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const queueLoadSummary = useMemo(() => {
    const summary = new Map<string, { active: number; capacity: number }>();
    for (const row of agentLoad) {
      const current = summary.get(row.queue_id) ?? { active: 0, capacity: 0 };
      summary.set(row.queue_id, {
        active: current.active + row.active_chats,
        capacity: current.capacity + row.max_concurrent_chats
      });
    }
    return summary;
  }, [agentLoad]);

  async function loadDashboard() {
    if (!token || !selectedTenantId) {
      setConversations([]);
      setAgentLoad([]);
      setQueues([]);
      setTeam([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [conversationRes, agentLoadRes, queuesRes, teamRes] = await Promise.all([
        platformSupervisorConversations(token, selectedTenantId, { includeClosed: false }, backendUrl),
        platformSupervisorAgentLoad(token, selectedTenantId, backendUrl),
        platformQueues(token, selectedTenantId, backendUrl),
        platformWorkspaceTeam(token, selectedTenantId, backendUrl)
      ]);

      setConversations(conversationRes.conversations ?? []);
      setAgentLoad(agentLoadRes.agents ?? []);
      setQueues(queuesRes.queues ?? []);
      setTeam(teamRes.members ?? []);

      if (!selectedConversationId && conversationRes.conversations[0]?.id) {
        setSelectedConversationId(conversationRes.conversations[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supervisor dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleReassign() {
    if (!token || !selectedConversationId || !targetAgentUserId) {
      return;
    }

    setRunningAction(true);
    setError("");
    try {
      await platformSupervisorReassignConversation(
        token,
        {
          conversationId: selectedConversationId,
          targetAgentUserId,
          targetQueueId: targetQueueId || undefined
        },
        backendUrl
      );
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign conversation");
    } finally {
      setRunningAction(false);
    }
  }

  async function handleForceClose() {
    if (!token || !selectedConversationId) {
      return;
    }

    setRunningAction(true);
    setError("");
    try {
      await platformSupervisorForceCloseConversation(token, selectedConversationId, backendUrl);
      await loadDashboard();
      setSelectedConversationId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to force-close conversation");
    } finally {
      setRunningAction(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTenantId]);

  useEffect(() => {
    setTargetAgentUserId("");
    setTargetQueueId(selectedConversation?.queue_id ?? "");
  }, [selectedConversation?.id, selectedConversation?.queue_id]);

  return (
    <div className="space-y-6">
      <header className="app-page-header">
        <div>
          <span className="app-kicker">Supervisor</span>
          <h1 className="app-h1">Supervisor Dashboard</h1>
          <p className="app-lead">Monitor SLA, team load, and take reassign/force-close actions.</p>
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

      <section className="app-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="app-card-title !mb-0">Agent Load</h2>
          <button type="button" className="app-btn-secondary" onClick={() => void loadDashboard()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {queues.map((queue) => {
            const summary = queueLoadSummary.get(queue.id) ?? { active: 0, capacity: 0 };
            return (
              <div key={queue.id} className="rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3">
                <div className="font-semibold text-[#0a0a0f]">{queue.name}</div>
                <div className="text-xs text-[#0a0a0f]/55 mt-1">Load {summary.active} / {summary.capacity || 0}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="app-card">
          <h2 className="app-card-title">Queue Conversations</h2>
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {conversations.length === 0 ? (
              <p className="text-sm text-[#0a0a0f]/55">No conversations in supervisor queues.</p>
            ) : null}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                  selectedConversationId === conversation.id
                    ? "border-[#1a5c5c]/35 bg-[#1a5c5c]/8"
                    : "border-[#0a0a0f]/10 bg-white hover:border-[#0a0a0f]/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm text-[#0a0a0f]">{conversation.title || "Conversation"}</strong>
                  <span className="text-[11px] text-[#0a0a0f]/55">{getSlaLabel(conversation)}</span>
                </div>
                <div className="mt-1 text-xs text-[#0a0a0f]/45">{toDateLabel(conversation.last_message_at)}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="app-card">
          {!selectedConversation ? (
            <p className="text-sm text-[#0a0a0f]/55">Select a conversation to take action.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="app-card-title !mb-1">{selectedConversation.title || "Conversation"}</h2>
                <p className="text-sm text-[#0a0a0f]/55">SLA: {getSlaLabel(selectedConversation)}</p>
                <p className="text-xs text-[#0a0a0f]/45 mt-1">
                  Due: {toDateLabel(selectedConversation.sla_first_response_due_at)}
                </p>
              </div>

              <div className="rounded-xl border border-[#0a0a0f]/10 bg-[#faf8f4] p-3 space-y-3">
                <div className="text-sm font-semibold text-[#0a0a0f]">Reassign Conversation</div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <select
                    className="app-input"
                    value={targetAgentUserId}
                    onChange={(event) => setTargetAgentUserId(event.target.value)}
                  >
                    <option value="">Select agent</option>
                    {team
                      .filter((member) => member.is_active && member.role !== "viewer")
                      .map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.user?.full_name || member.user?.email || member.user_id}
                        </option>
                      ))}
                  </select>
                  <select
                    className="app-input"
                    value={targetQueueId}
                    onChange={(event) => setTargetQueueId(event.target.value)}
                  >
                    <option value="">Keep current queue</option>
                    {queues.map((queue) => (
                      <option key={queue.id} value={queue.id}>
                        {queue.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="app-btn-primary"
                    disabled={runningAction || !targetAgentUserId}
                    onClick={() => void handleReassign()}
                  >
                    {runningAction ? "Updating..." : "Reassign"}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="app-btn-secondary"
                  disabled={runningAction}
                  onClick={() => void handleForceClose()}
                >
                  {runningAction ? "Closing..." : "Force Close"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
