import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  platformAgentAcceptConversation,
  platformAgentCopilot,
  platformAgentConversationMessages,
  platformAgentHeartbeat,
  platformAgentInbox,
  platformAgentReplyConversation,
  platformAgentReturnToAI,
  platformAgentTransferConversation,
  platformQueues,
  platformWorkspaceTeam,
  platformAgentTyping
} from "@/lib/platformApi";
import { usePlatformAuth } from "@/platform/state/auth";
import type {
  AgentPresenceStatus,
  PlatformQueue,
  PlatformWorkspaceMember,
  WorkspaceMemberRole
} from "@/platform/types";
import type { ChatMessage, ChatThread } from "@/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseClient =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

type InboxTab = "my_active" | "queue_unassigned";

function toDateLabel(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getConversationLabel(conversation: ChatThread) {
  if (conversation.conversation_mode === "handoff_pending") return "Waiting";
  if (conversation.conversation_mode === "agent_active") return "Live";
  if (conversation.conversation_mode === "copilot") return "Copilot";
  if (conversation.conversation_mode === "returned_to_ai") return "AI";
  if (conversation.conversation_mode === "closed") return "Closed";
  return "AI";
}

export default function AgentInboxPage() {
  const { token, profile, selectedTenantId, selectedTenant } = usePlatformAuth();
  const backendUrl = import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:3000";
  const currentAgentId = profile?.user.id ?? "";
  const workspaceRole: WorkspaceMemberRole = selectedTenant?.workspace_role ?? "viewer";
  const canManageConversation = workspaceRole !== "viewer";
  const [tab, setTab] = useState<InboxTab>("my_active");
  const [myActive, setMyActive] = useState<ChatThread[]>([]);
  const [queueUnassigned, setQueueUnassigned] = useState<ChatThread[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [copilotDraft, setCopilotDraft] = useState("");
  const [runningCopilot, setRunningCopilot] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [runningAction, setRunningAction] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferTargetQueueId, setTransferTargetQueueId] = useState("");
  const [transferTargetAgentId, setTransferTargetAgentId] = useState("");
  const [presenceStatus, setPresenceStatus] = useState<AgentPresenceStatus>("online");
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [queueOptions, setQueueOptions] = useState<PlatformQueue[]>([]);
  const [teamOptions, setTeamOptions] = useState<PlatformWorkspaceMember[]>([]);
  const [error, setError] = useState("");
  const typingTimeoutRef = useRef<number | null>(null);

  const conversations = tab === "my_active" ? myActive : queueUnassigned;
  const selectedConversation = useMemo(
    () => [...myActive, ...queueUnassigned].find((item) => item.id === selectedConversationId) ?? null,
    [myActive, queueUnassigned, selectedConversationId]
  );

  async function loadInbox() {
    if (!token) return;
    setLoadingInbox(true);
    setError("");
    try {
      const response = await platformAgentInbox(token, backendUrl, selectedTenantId ?? undefined);
      setMyActive(response.my_active ?? []);
      setQueueUnassigned(response.queue_unassigned ?? []);

      const allConversations = [...(response.my_active ?? []), ...(response.queue_unassigned ?? [])];
      if (!selectedConversationId && allConversations[0]?.id) {
        setSelectedConversationId(allConversations[0].id);
      } else if (selectedConversationId && !allConversations.some((c) => c.id === selectedConversationId)) {
        setSelectedConversationId(allConversations[0]?.id ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      setLoadingInbox(false);
    }
  }

  async function loadConversationMessages(conversationId: string) {
    if (!token || !conversationId) return;
    setLoadingMessages(true);
    setError("");
    try {
      const response = await platformAgentConversationMessages(token, conversationId, backendUrl);
      setMessages(response.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation messages");
    } finally {
      setLoadingMessages(false);
    }
  }

  async function loadTransferTargets() {
    if (!token || !selectedTenantId) {
      setQueueOptions([]);
      setTeamOptions([]);
      return;
    }

    try {
      const [queueResponse, teamResponse] = await Promise.all([
        platformQueues(token, selectedTenantId, backendUrl),
        platformWorkspaceTeam(token, selectedTenantId, backendUrl)
      ]);
      setQueueOptions(queueResponse.queues ?? []);
      setTeamOptions(teamResponse.members ?? []);
    } catch {
      // Keep existing options if this refresh fails.
    }
  }

  async function sendHeartbeat(status: AgentPresenceStatus) {
    if (!token || !selectedTenantId) return;
    try {
      await platformAgentHeartbeat(
        token,
        {
          tenantId: selectedTenantId,
          status
        },
        backendUrl
      );
    } catch {
      // Ignore heartbeat failures in UI loop.
    }
  }

  async function handleAccept(conversationId: string) {
    if (!token) return;
    setRunningAction(true);
    setError("");
    try {
      await platformAgentAcceptConversation(token, conversationId, backendUrl);
      setTab("my_active");
      await loadInbox();
      await loadConversationMessages(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept conversation");
    } finally {
      setRunningAction(false);
    }
  }

  async function handleReturnToAI(conversationId: string) {
    if (!token) return;
    setRunningAction(true);
    setError("");
    try {
      await platformAgentReturnToAI(token, conversationId, backendUrl);
      await loadInbox();
      await loadConversationMessages(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to return conversation to AI");
    } finally {
      setRunningAction(false);
    }
  }

  async function handleCopilotToggle(conversationId: string, enable: boolean) {
    if (!token) return;
    setRunningCopilot(true);
    setError("");
    try {
      await platformAgentCopilot(
        token,
        {
          conversationId,
          action: enable ? "enable" : "disable"
        },
        backendUrl
      );
      if (!enable) {
        setCopilotDraft("");
      }
      await loadInbox();
      await loadConversationMessages(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update copilot mode");
    } finally {
      setRunningCopilot(false);
    }
  }

  async function handleGenerateCopilotDraft() {
    if (!token || !selectedConversationId) return;
    setRunningCopilot(true);
    setError("");
    try {
      const response = await platformAgentCopilot(
        token,
        {
          conversationId: selectedConversationId,
          action: "draft",
          prompt: copilotPrompt.trim() || undefined
        },
        backendUrl
      );
      const draftText = response.draft?.draft ?? "";
      setCopilotDraft(draftText);
      if (draftText) {
        setReplyText(draftText);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate copilot draft");
    } finally {
      setRunningCopilot(false);
    }
  }

  async function handleSendReply() {
    if (!token || !selectedConversationId || !replyText.trim()) return;
    const content = replyText.trim();
    setSubmittingReply(true);
    setError("");
    try {
      const response = await platformAgentReplyConversation(
        token,
        {
          conversationId: selectedConversationId,
          content
        },
        backendUrl
      );
      setReplyText("");
      setMessages((prev) => {
        if (prev.some((message) => message.id === response.message.id)) {
          return prev;
        }
        return [...prev, response.message];
      });
      await platformAgentTyping(token, selectedConversationId, false, backendUrl).catch(() => undefined);
      await loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleTransferToQueue() {
    if (!token || !selectedConversationId || !transferTargetQueueId) {
      return;
    }

    setTransferring(true);
    setError("");
    try {
      await platformAgentTransferConversation(
        token,
        {
          conversationId: selectedConversationId,
          targetQueueId: transferTargetQueueId
        },
        backendUrl
      );
      await loadInbox();
      await loadConversationMessages(selectedConversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer conversation");
    } finally {
      setTransferring(false);
    }
  }

  async function handleTransferToAgent() {
    if (!token || !selectedConversationId || !transferTargetAgentId) {
      return;
    }

    setTransferring(true);
    setError("");
    try {
      await platformAgentTransferConversation(
        token,
        {
          conversationId: selectedConversationId,
          targetAgentUserId: transferTargetAgentId,
          targetQueueId: transferTargetQueueId || undefined
        },
        backendUrl
      );
      await loadInbox();
      await loadConversationMessages(selectedConversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer conversation");
    } finally {
      setTransferring(false);
    }
  }

  useEffect(() => {
    void loadInbox();
    void loadTransferTargets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTenantId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    void loadConversationMessages(selectedConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, token]);

  useEffect(() => {
    setTransferTargetAgentId("");
    setTransferTargetQueueId(selectedConversation?.queue_id ?? "");
    setCopilotPrompt("");
    setCopilotDraft("");
  }, [selectedConversation?.id, selectedConversation?.queue_id]);

  useEffect(() => {
    void sendHeartbeat(presenceStatus);

    if (!token || !selectedTenantId || presenceStatus === "offline") {
      return;
    }

    const interval = window.setInterval(() => {
      void sendHeartbeat(presenceStatus);
    }, 25_000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTenantId, presenceStatus]);

  useEffect(() => {
    if (!token || !selectedConversationId) return;
    if (!selectedConversation || selectedConversation.assigned_agent_id !== currentAgentId) return;
    if (selectedConversation.conversation_mode !== "agent_active") return;

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const isTyping = replyText.trim().length > 0;
    void platformAgentTyping(token, selectedConversationId, isTyping, backendUrl).catch(() => undefined);

    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        void platformAgentTyping(token, selectedConversationId, false, backendUrl).catch(() => undefined);
      }, 2500);
    }
  }, [replyText, token, selectedConversationId, selectedConversation, currentAgentId, backendUrl]);

  useEffect(() => {
    if (!supabaseClient || !selectedTenantId || !currentAgentId) return;

    const queueChannel = supabaseClient.channel(`queue:${selectedTenantId}`);
    queueChannel.on("broadcast", { event: "new_conversation" }, () => {
      void loadInbox();
    });
    queueChannel.subscribe();

    const agentChannel = supabaseClient.channel(`agent:${currentAgentId}`);
    agentChannel.on("broadcast", { event: "assignment" }, () => {
      void loadInbox();
    });
    agentChannel.on("broadcast", { event: "inbox_update" }, () => {
      void loadInbox();
    });
    agentChannel.subscribe();

    return () => {
      supabaseClient.removeChannel(queueChannel);
      supabaseClient.removeChannel(agentChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, currentAgentId]);

  useEffect(() => {
    if (!supabaseClient || !selectedConversationId) return;

    const channel = supabaseClient.channel(`conversation:${selectedConversationId}`);
    channel.on("broadcast", { event: "new_message" }, (payload) => {
      const message = payload.payload as ChatMessage;
      if (!message?.id || message.chat_id !== selectedConversationId) return;
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, message];
      });
      void loadInbox();
    });

    channel.on("broadcast", { event: "mode_change" }, (payload) => {
      const data = payload.payload as { chat_id?: string; mode?: ChatThread["conversation_mode"] };
      if (!data?.chat_id || !data.mode) return;
      setMyActive((prev) =>
        prev.map((conversation) =>
          conversation.id === data.chat_id
            ? { ...conversation, conversation_mode: data.mode }
            : conversation
        )
      );
      setQueueUnassigned((prev) =>
        prev.map((conversation) =>
          conversation.id === data.chat_id
            ? { ...conversation, conversation_mode: data.mode }
            : conversation
        )
      );
      void loadInbox();
    });

    channel.on("broadcast", { event: "typing" }, (payload) => {
      const data = payload.payload as {
        chat_id?: string;
        actor?: "agent" | "visitor";
        user_id?: string;
        is_typing?: boolean;
      };
      if (data.chat_id !== selectedConversationId) return;
      if (data.actor === "visitor") {
        setVisitorTyping(Boolean(data.is_typing));
      }
    });

    channel.subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
      setVisitorTyping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  return (
    <div className="space-y-6">
      <header className="app-page-header">
        <div>
          <span className="app-kicker">Agent</span>
          <h1 className="app-h1">Inbox</h1>
          <p className="app-lead">Accept queue handoffs, respond in realtime, and return conversations to AI.</p>
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

      <div className="app-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[#0a0a0f]/65">Presence</div>
          <select
            className="app-input max-w-[180px]"
            value={presenceStatus}
            onChange={(event) => setPresenceStatus(event.target.value as AgentPresenceStatus)}
          >
            <option value="online">Online</option>
            <option value="away">Away</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="app-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="app-card-title !mb-0">Conversations</h2>
            <button type="button" className="app-btn-secondary" onClick={() => void loadInbox()} disabled={loadingInbox}>
              {loadingInbox ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={tab === "my_active" ? "app-btn-primary" : "app-btn-secondary"}
              onClick={() => setTab("my_active")}
            >
              My Active ({myActive.length})
            </button>
            <button
              type="button"
              className={tab === "queue_unassigned" ? "app-btn-primary" : "app-btn-secondary"}
              onClick={() => setTab("queue_unassigned")}
            >
              Queue ({queueUnassigned.length})
            </button>
          </div>

          <div className="space-y-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-[#0a0a0f]/55">No conversations in this tab.</p>
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
                <div className="flex items-center justify-between gap-3">
                  <strong className="truncate text-sm text-[#0a0a0f]">{conversation.title || "Conversation"}</strong>
                  <span className="text-xs text-[#0a0a0f]/55">{getConversationLabel(conversation)}</span>
                </div>
                <div className="mt-1 text-xs text-[#0a0a0f]/45">{toDateLabel(conversation.last_message_at)}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="app-card">
          {!selectedConversation ? (
            <p className="text-sm text-[#0a0a0f]/55">Select a conversation to view details.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="app-card-title !mb-1">{selectedConversation.title || "Conversation"}</h2>
                  <p className="text-sm text-[#0a0a0f]/55">Mode: {selectedConversation.conversation_mode ?? "ai_only"}</p>
                </div>
                <div className="flex gap-2">
                  {selectedConversation.conversation_mode === "handoff_pending" ? (
                    <button
                      type="button"
                      className="app-btn-primary"
                      disabled={runningAction || !canManageConversation}
                      onClick={() => void handleAccept(selectedConversation.id)}
                    >
                      {runningAction ? "Accepting..." : "Accept"}
                    </button>
                  ) : null}
                  {selectedConversation.conversation_mode === "agent_active" &&
                  selectedConversation.assigned_agent_id === currentAgentId ? (
                    <button
                      type="button"
                      className="app-btn-secondary"
                      disabled={runningAction || !canManageConversation}
                      onClick={() => void handleReturnToAI(selectedConversation.id)}
                    >
                      {runningAction ? "Updating..." : "Return to AI"}
                    </button>
                  ) : null}
                  {(selectedConversation.conversation_mode === "agent_active" ||
                    selectedConversation.conversation_mode === "copilot") &&
                  selectedConversation.assigned_agent_id === currentAgentId ? (
                    <button
                      type="button"
                      className="app-btn-secondary"
                      disabled={runningCopilot || !canManageConversation}
                      onClick={() =>
                        void handleCopilotToggle(
                          selectedConversation.id,
                          selectedConversation.conversation_mode !== "copilot"
                        )
                      }
                    >
                      {runningCopilot
                        ? "Updating..."
                        : selectedConversation.conversation_mode === "copilot"
                          ? "Disable Copilot"
                          : "Enable Copilot"}
                    </button>
                  ) : null}
                </div>
              </div>

              {canManageConversation ? (
                <div className="rounded-xl border border-[#0a0a0f]/10 bg-[#faf8f4] p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#0a0a0f]/55">
                    Transfer
                  </div>
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                    <select
                      className="app-input"
                      value={transferTargetQueueId}
                      onChange={(event) => setTransferTargetQueueId(event.target.value)}
                    >
                      <option value="">Select queue (optional)</option>
                      {queueOptions.map((queue) => (
                        <option key={queue.id} value={queue.id}>
                          {queue.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="app-input"
                      value={transferTargetAgentId}
                      onChange={(event) => setTransferTargetAgentId(event.target.value)}
                    >
                      <option value="">Select agent</option>
                      {teamOptions
                        .filter((member) => member.is_active && member.role !== "viewer")
                        .map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.user?.full_name || member.user?.email || member.user_id}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      className="app-btn-secondary"
                      disabled={transferring || !transferTargetQueueId}
                      onClick={() => void handleTransferToQueue()}
                    >
                      {transferring ? "Transferring..." : "To Queue"}
                    </button>
                    <button
                      type="button"
                      className="app-btn-primary"
                      disabled={transferring || !transferTargetAgentId}
                      onClick={() => void handleTransferToAgent()}
                    >
                      {transferring ? "Transferring..." : "To Agent"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-[#0a0a0f]/10 bg-[#faf8f4] p-3 h-[420px] overflow-y-auto space-y-3">
                {loadingMessages ? <p className="text-sm text-[#0a0a0f]/55">Loading messages...</p> : null}
                {!loadingMessages && messages.length === 0 ? (
                  <p className="text-sm text-[#0a0a0f]/55">No messages yet.</p>
                ) : null}
                {messages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-[#0a0a0f]/8 bg-white px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs uppercase tracking-wide text-[#0a0a0f]/45">
                        {message.sender_type ?? message.role}
                        {message.is_internal ? " • internal" : ""}
                      </span>
                      <span className="text-xs text-[#0a0a0f]/40">{toDateLabel(message.created_at)}</span>
                    </div>
                    <p className="text-sm text-[#0a0a0f]/80 whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
                {visitorTyping ? (
                  <div className="text-xs text-[#0a0a0f]/55">Visitor is typing...</div>
                ) : null}
              </div>

              {(selectedConversation.conversation_mode === "agent_active" ||
                selectedConversation.conversation_mode === "copilot") &&
              selectedConversation.assigned_agent_id === currentAgentId &&
              canManageConversation ? (
                <div className="rounded-xl border border-[#0a0a0f]/10 bg-[#faf8f4] p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#0a0a0f]/55">
                    Copilot Draft
                  </div>
                  <input
                    type="text"
                    className="app-input"
                    value={copilotPrompt}
                    onChange={(event) => setCopilotPrompt(event.target.value)}
                    placeholder="Optional guidance for draft tone or objective"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="app-btn-secondary"
                      disabled={runningCopilot}
                      onClick={() => void handleGenerateCopilotDraft()}
                    >
                      {runningCopilot ? "Generating..." : "Generate Draft"}
                    </button>
                  </div>
                  {copilotDraft ? (
                    <div className="rounded-lg border border-[#0a0a0f]/10 bg-white px-3 py-2 text-sm text-[#0a0a0f]/80 whitespace-pre-wrap">
                      {copilotDraft}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  className="app-textarea"
                  placeholder="Type your reply..."
                  rows={4}
                  disabled={
                    !canManageConversation ||
                    submittingReply ||
                    (selectedConversation.conversation_mode !== "agent_active" &&
                      selectedConversation.conversation_mode !== "copilot")
                  }
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="app-btn-primary"
                    onClick={() => void handleSendReply()}
                    disabled={
                      !canManageConversation ||
                      submittingReply ||
                      !replyText.trim() ||
                      (selectedConversation.conversation_mode !== "agent_active" &&
                        selectedConversation.conversation_mode !== "copilot")
                    }
                  >
                    {submittingReply ? "Sending..." : "Send reply"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
