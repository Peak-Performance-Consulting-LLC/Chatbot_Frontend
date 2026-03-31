import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
  platformAgentTyping,
  platformQueues,
  platformWorkspaceTeam
} from "@/lib/platformApi";
import { usePlatformAuth } from "@/platform/state/auth";
import type {
  AgentPresenceStatus,
  PlatformQueue,
  PlatformWorkspaceMember,
  WorkspaceMemberRole
} from "@/platform/types";
import type { ChatMessage, ChatThread } from "@/types";

const WAITING_WARNING_SECONDS = 2 * 60;
const WAITING_HIGH_SECONDS = 5 * 60;
const WAITING_CRITICAL_SECONDS = 15 * 60;
const ARRIVAL_ALERT_TTL_MS = 7000;
const VISITOR_TYPING_STALE_MS = 8000;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseClient =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

type InboxMessage = ChatMessage & {
  _optimistic?: boolean;
  _failed?: boolean;
};

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

function toRelativeAgeLabel(input: string | null | undefined) {
  if (!input) {
    return "";
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const deltaMs = Date.now() - date.getTime();
  if (deltaMs < 0) {
    return "just now";
  }
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m waiting`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h waiting`;
  const days = Math.floor(hours / 24);
  return `${days}d waiting`;
}

function toWaitingAgeSeconds(conversation: ChatThread): number | null {
  if (typeof conversation.waiting_age_seconds === "number") {
    return conversation.waiting_age_seconds;
  }
  const source = conversation.last_external_message_at ?? conversation.last_message_at;
  if (!source) return null;
  const ts = new Date(source).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 1000));
}

function getWaitingUrgency(conversation: ChatThread): "normal" | "warning" | "high" | "critical" | null {
  if (!isConversationWaiting(conversation)) {
    return null;
  }
  if (conversation.waiting_urgency) {
    return conversation.waiting_urgency;
  }
  const ageSeconds = toWaitingAgeSeconds(conversation);
  if (ageSeconds === null || ageSeconds < WAITING_WARNING_SECONDS) {
    return "normal";
  }
  if (ageSeconds < WAITING_HIGH_SECONDS) {
    return "warning";
  }
  if (ageSeconds < WAITING_CRITICAL_SECONDS) {
    return "high";
  }
  return "critical";
}

function getVisitorStateLabel(conversation: ChatThread) {
  const state = conversation.visitor_state ?? "away";
  if (state === "typing") return "Typing";
  if (state === "active") return "Active";
  if (state === "idle") return "Idle";
  return "Away";
}

function getVisitorStateTone(conversation: ChatThread) {
  const state = conversation.visitor_state ?? "away";
  if (state === "typing") return "border-[#2563eb]/30 bg-[#e8f1ff] text-[#1d4ed8]";
  if (state === "active") return "border-[#1a5c5c]/25 bg-[#e9f6f3] text-[#1a5c5c]";
  if (state === "idle") return "border-amber-300/60 bg-amber-100 text-amber-700";
  return "border-[#0a0a0f]/20 bg-[#f1f1f3] text-[#5a5a68]";
}

function getWaitingUrgencyTone(urgency: "normal" | "warning" | "high" | "critical" | null) {
  if (urgency === "critical") return "border-[#b91c1c]/35 bg-[#ffe3e3] text-[#991b1b]";
  if (urgency === "high") return "border-[#c84c2a]/30 bg-[#ffe8df] text-[#a53f22]";
  if (urgency === "warning") return "border-amber-300/60 bg-amber-100 text-amber-700";
  return "border-[#1a5c5c]/25 bg-[#e9f6f3] text-[#1a5c5c]";
}

function isConversationWaiting(conversation: ChatThread) {
  if (typeof conversation.awaiting_agent_reply === "boolean") {
    return conversation.awaiting_agent_reply;
  }
  return conversation.last_external_sender_type === "visitor" || conversation.conversation_mode === "handoff_pending";
}

function getConversationModeLabel(conversation: ChatThread) {
  if (conversation.conversation_mode === "handoff_pending") return "Waiting";
  if (conversation.conversation_mode === "agent_active") return "Live";
  if (conversation.conversation_mode === "copilot") return "Copilot";
  if (conversation.conversation_mode === "returned_to_ai") return "AI";
  if (conversation.conversation_mode === "closed") return "Closed";
  return "AI";
}

function getConversationDisplayName(conversation: ChatThread) {
  return conversation.visitor_name?.trim() || conversation.title || "Conversation";
}

function isConversationEnded(conversation: ChatThread | null | undefined) {
  if (!conversation) {
    return false;
  }
  return (
    conversation.conversation_mode === "closed" ||
    conversation.conversation_status === "closed" ||
    conversation.conversation_status === "archived"
  );
}

function canReplyToConversation(conversation: ChatThread | null | undefined) {
  if (!conversation) {
    return false;
  }
  return !isConversationEnded(conversation);
}

function toDayLabel(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function sortMessages(messages: ChatMessage[]): InboxMessage[] {
  return [...messages].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return aTime - bTime;
  });
}

function dedupeConversations(conversations: ChatThread[]) {
  const byId = new Map<string, ChatThread>();
  for (const conversation of conversations) {
    if (!conversation?.id) continue;
    byId.set(conversation.id, conversation);
  }
  return [...byId.values()];
}

export default function AgentInboxPage() {
  const { token, profile, selectedTenantId, selectedTenant } = usePlatformAuth();
  const backendUrl = import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:3000";
  const currentAgentId = profile?.user.id ?? "";
  const workspaceRole: WorkspaceMemberRole = selectedTenant?.workspace_role ?? "viewer";
  const canManageConversation = workspaceRole === "owner" || workspaceRole === "agent";

  const [conversations, setConversations] = useState<ChatThread[]>([]);
  const [selectedConversationSnapshot, setSelectedConversationSnapshot] = useState<ChatThread | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [highWaitingCount, setHighWaitingCount] = useState(0);
  const [criticalWaitingCount, setCriticalWaitingCount] = useState(0);
  const [arrivalAlerts, setArrivalAlerts] = useState<Array<{
    id: string;
    chatId: string;
    label: string;
    createdAt: string;
  }>>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
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
  const visitorTypingTimeoutRef = useRef<number | null>(null);
  const waitingStateRef = useRef<Map<string, boolean>>(new Map());
  const hasInboxSnapshotRef = useRef(false);
  const arrivalAudioContextRef = useRef<AudioContext | null>(null);
  const threadViewportRef = useRef<HTMLDivElement | null>(null);
  const keepThreadPinnedRef = useRef(true);
  const inboxReloadTimerRef = useRef<number | null>(null);
  const inboxReloadQueuedRef = useRef(false);
  const loadingInboxRef = useRef(false);
  const loadingMessagesRef = useRef(false);
  const typingStateSentRef = useRef<boolean | null>(null);

  const selectedConversation = useMemo(
    () =>
      conversations.find((item) => item.id === selectedConversationId) ??
      (selectedConversationSnapshot?.id === selectedConversationId ? selectedConversationSnapshot : null),
    [conversations, selectedConversationId, selectedConversationSnapshot]
  );
  const selectedConversationEnded = isConversationEnded(selectedConversation);

  function playArrivalTone() {
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) {
        return;
      }
      const audioContext = arrivalAudioContextRef.current ?? new AudioCtor();
      arrivalAudioContextRef.current = audioContext;
      if (audioContext.state === "suspended") {
        void audioContext.resume().catch(() => undefined);
      }

      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.22);
    } catch {
      // Ignore browser autoplay/audio constraints; visual alerts still render.
    }
  }

  function scrollThreadToBottom(behavior: ScrollBehavior = "auto") {
    const viewport = threadViewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior
    });
  }

  function onThreadScroll() {
    const viewport = threadViewportRef.current;
    if (!viewport) {
      return;
    }
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    keepThreadPinnedRef.current = distanceFromBottom < 64;
  }

  function scheduleInboxReload(delayMs = 120) {
    if (inboxReloadTimerRef.current) {
      window.clearTimeout(inboxReloadTimerRef.current);
      inboxReloadTimerRef.current = null;
    }
    inboxReloadTimerRef.current = window.setTimeout(() => {
      inboxReloadTimerRef.current = null;
      void loadInbox();
    }, delayMs);
  }

  async function loadInbox() {
    if (!token) return;
    if (loadingInboxRef.current) {
      inboxReloadQueuedRef.current = true;
      return;
    }
    loadingInboxRef.current = true;
    setLoadingInbox(true);
    setError("");
    try {
      const response = await platformAgentInbox(token, backendUrl, selectedTenantId ?? undefined);
      const merged = dedupeConversations(
        response.conversations?.length
          ? response.conversations
          : [...(response.my_active ?? []), ...(response.queue_unassigned ?? [])]
      );

      const computedWaiting = merged.filter((conversation) => isConversationWaiting(conversation)).length;
      const computedAnswered = Math.max(0, merged.length - computedWaiting);
      const computedHighWaiting = merged.filter((conversation) => getWaitingUrgency(conversation) === "high").length;
      const computedCriticalWaiting = merged.filter((conversation) => getWaitingUrgency(conversation) === "critical").length;
      const nextWaitingMap = new Map<string, boolean>();
      for (const conversation of merged) {
        nextWaitingMap.set(conversation.id, isConversationWaiting(conversation));
      }

      if (hasInboxSnapshotRef.current) {
        const newlyWaiting = merged.filter((conversation) => {
          const isWaitingNow = nextWaitingMap.get(conversation.id) ?? false;
          const wasWaiting = waitingStateRef.current.get(conversation.id) ?? false;
          return isWaitingNow && !wasWaiting;
        });

        if (newlyWaiting.length > 0) {
          playArrivalTone();
          const nextAlerts = newlyWaiting.slice(0, 4).map((conversation) => {
            const alertId = `arrival-${conversation.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            return {
              id: alertId,
              chatId: conversation.id,
              label: `${getConversationDisplayName(conversation)} needs a reply`,
              createdAt: new Date().toISOString()
            };
          });
          setArrivalAlerts((prev) => [...nextAlerts, ...prev].slice(0, 8));
          nextAlerts.forEach((alert) => {
            window.setTimeout(() => {
              setArrivalAlerts((prev) => prev.filter((item) => item.id !== alert.id));
            }, ARRIVAL_ALERT_TTL_MS);
          });
        }
      }
      waitingStateRef.current = nextWaitingMap;
      hasInboxSnapshotRef.current = true;

      setConversations(merged);
      setWaitingCount(
        typeof response.waiting_count === "number" ? response.waiting_count : computedWaiting
      );
      setAnsweredCount(
        typeof response.answered_count === "number" ? response.answered_count : computedAnswered
      );
      setHighWaitingCount(
        typeof response.high_waiting_count === "number" ? response.high_waiting_count : computedHighWaiting
      );
      setCriticalWaitingCount(
        typeof response.critical_waiting_count === "number" ? response.critical_waiting_count : computedCriticalWaiting
      );

      const selectedFromInbox = selectedConversationId
        ? merged.find((conversation) => conversation.id === selectedConversationId) ?? null
        : null;
      if (selectedFromInbox) {
        setSelectedConversationSnapshot(selectedFromInbox);
      }
      if (!selectedConversationId && merged[0]?.id) {
        setSelectedConversationId(merged[0].id);
        setSelectedConversationSnapshot(merged[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      loadingInboxRef.current = false;
      setLoadingInbox(false);
      if (inboxReloadQueuedRef.current) {
        inboxReloadQueuedRef.current = false;
        void loadInbox();
      }
    }
  }

  async function loadConversationMessages(conversationId: string) {
    if (!token || !conversationId) return;
    if (loadingMessagesRef.current) {
      return;
    }
    loadingMessagesRef.current = true;
    setLoadingMessages(true);
    setError("");
    try {
      const response = await platformAgentConversationMessages(token, conversationId, backendUrl);
      setMessages(sortMessages(response.messages));
      if (response.conversation) {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  conversation_mode: response.conversation?.conversation_mode,
                  conversation_status: response.conversation?.conversation_status,
                  closed_at: response.conversation?.closed_at
                }
              : conversation
          )
        );
        setSelectedConversationSnapshot((prev) =>
          prev && prev.id === conversationId
            ? {
                ...prev,
                conversation_mode: response.conversation?.conversation_mode,
                conversation_status: response.conversation?.conversation_status,
                closed_at: response.conversation?.closed_at
              }
            : prev
        );
      }
      requestAnimationFrame(() => scrollThreadToBottom("auto"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation messages");
    } finally {
      loadingMessagesRef.current = false;
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
      await loadInbox();
      await loadConversationMessages(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join conversation");
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
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMessage: InboxMessage = {
      id: optimisticId,
      chat_id: selectedConversationId,
      role: "assistant",
      content,
      metadata: null,
      sender_type: "agent",
      sender_id: profile?.user.id ?? null,
      created_at: new Date().toISOString(),
      _optimistic: true
    };

    setSubmittingReply(true);
    setError("");
    keepThreadPinnedRef.current = true;
    setMessages((prev) => [...prev, optimisticMessage]);
    requestAnimationFrame(() => scrollThreadToBottom("smooth"));
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
        if (prev.some((message) => message.id === response.message.id && !message._optimistic)) {
          return prev.filter((message) => message.id !== optimisticId);
        }
        return prev.map((message) =>
          message.id === optimisticId
            ? {
                ...response.message
              }
            : message
        );
      });
      await platformAgentTyping(token, selectedConversationId, false, backendUrl).catch(() => undefined);
      await loadInbox();
    } catch (err) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === optimisticId
            ? {
                ...message,
                _optimistic: false,
                _failed: true
              }
            : message
        )
      );
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSubmittingReply(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (submittingReply || !replyText.trim()) {
      return;
    }
    void handleSendReply();
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
    waitingStateRef.current = new Map();
    hasInboxSnapshotRef.current = false;
    setArrivalAlerts([]);
  }, [selectedTenantId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    keepThreadPinnedRef.current = true;
    typingStateSentRef.current = null;
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
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (inboxReloadTimerRef.current) {
        window.clearTimeout(inboxReloadTimerRef.current);
        inboxReloadTimerRef.current = null;
      }
      if (!arrivalAudioContextRef.current) {
        if (visitorTypingTimeoutRef.current) {
          window.clearTimeout(visitorTypingTimeoutRef.current);
          visitorTypingTimeoutRef.current = null;
        }
        return;
      }
      void arrivalAudioContextRef.current.close().catch(() => undefined);
      arrivalAudioContextRef.current = null;
      if (visitorTypingTimeoutRef.current) {
        window.clearTimeout(visitorTypingTimeoutRef.current);
        visitorTypingTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (keepThreadPinnedRef.current) {
      requestAnimationFrame(() => scrollThreadToBottom("auto"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, visitorTyping]);

  useEffect(() => {
    if (!token || !selectedConversationId) return;
    const isLiveMode =
      selectedConversation?.conversation_mode === "agent_active" ||
      selectedConversation?.conversation_mode === "copilot";

    if (!isLiveMode) {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingStateSentRef.current === true) {
        typingStateSentRef.current = false;
        void platformAgentTyping(token, selectedConversationId, false, backendUrl).catch(() => undefined);
      }
      return;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const isTyping = replyText.trim().length > 0;
    if (typingStateSentRef.current !== isTyping) {
      typingStateSentRef.current = isTyping;
      void platformAgentTyping(token, selectedConversationId, isTyping, backendUrl).catch(() => undefined);
    }

    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        typingStateSentRef.current = false;
        void platformAgentTyping(token, selectedConversationId, false, backendUrl).catch(() => undefined);
      }, 2500);
    }
  }, [replyText, token, selectedConversationId, selectedConversation?.conversation_mode, backendUrl]);

  useEffect(() => {
    if (!supabaseClient || !selectedTenantId || !currentAgentId) return;

    const workspaceChannel = supabaseClient.channel(`workspace:${selectedTenantId}`);
    workspaceChannel.on("broadcast", { event: "inbox_update" }, () => {
      scheduleInboxReload(120);
    });
    workspaceChannel.subscribe();

    const agentChannel = supabaseClient.channel(`agent:${currentAgentId}`);
    agentChannel.on("broadcast", { event: "assignment" }, () => {
      scheduleInboxReload(90);
    });
    agentChannel.on("broadcast", { event: "inbox_update" }, () => {
      scheduleInboxReload(120);
    });
    agentChannel.subscribe();

    return () => {
      if (inboxReloadTimerRef.current) {
        window.clearTimeout(inboxReloadTimerRef.current);
        inboxReloadTimerRef.current = null;
      }
      supabaseClient.removeChannel(workspaceChannel);
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
        const withoutOptimisticMatch = prev.filter(
          (item) => !(item._optimistic && item.sender_type === "agent" && item.content.trim() === message.content.trim())
        );
        return sortMessages([...withoutOptimisticMatch, message]);
      });
      scheduleInboxReload(100);
    });

    channel.on("broadcast", { event: "mode_change" }, (payload) => {
      const data = payload.payload as {
        chat_id?: string;
        mode?: ChatThread["conversation_mode"];
        agent_id?: string;
        closed_at?: string | null;
      };
      if (!data?.chat_id || !data.mode) return;
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === data.chat_id
            ? {
                ...conversation,
                conversation_mode: data.mode,
                assigned_agent_id: data.agent_id ?? conversation.assigned_agent_id,
                conversation_status: data.mode === "closed" ? "closed" : conversation.conversation_status,
                closed_at:
                  data.mode === "closed"
                    ? data.closed_at ?? new Date().toISOString()
                    : conversation.closed_at
              }
            : conversation
        )
      );
      setSelectedConversationSnapshot((prev) =>
        prev && prev.id === data.chat_id
          ? {
              ...prev,
              conversation_mode: data.mode,
              conversation_status: data.mode === "closed" ? "closed" : prev.conversation_status,
              closed_at: data.mode === "closed" ? data.closed_at ?? new Date().toISOString() : prev.closed_at,
              assigned_agent_id: data.agent_id ?? prev.assigned_agent_id
            }
            : prev
      );
      scheduleInboxReload(100);
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
        const active = Boolean(data.is_typing);
        setVisitorTyping(active);
        if (visitorTypingTimeoutRef.current) {
          window.clearTimeout(visitorTypingTimeoutRef.current);
          visitorTypingTimeoutRef.current = null;
        }
        if (active) {
          visitorTypingTimeoutRef.current = window.setTimeout(() => {
            setVisitorTyping(false);
            visitorTypingTimeoutRef.current = null;
          }, VISITOR_TYPING_STALE_MS);
        }
      }
    });

    channel.subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
      setVisitorTyping(false);
      if (visitorTypingTimeoutRef.current) {
        window.clearTimeout(visitorTypingTimeoutRef.current);
        visitorTypingTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useEffect(() => {
    if (!token || supabaseClient) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void loadInbox();
      if (selectedConversationId) {
        void loadConversationMessages(selectedConversationId);
      }
    }, 45000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedConversationId, selectedTenantId]);

  return (
    <div className="space-y-6">
      <header className="app-page-header">
        <div>
          <span className="app-kicker">Agent</span>
          <h1 className="app-h1">Inbox</h1>
          <p className="app-lead">Shared inbox for owner and agents. Join any waiting chat and respond immediately.</p>
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

      {arrivalAlerts.length > 0 ? (
        <div className="app-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#0a0a0f]/60">New waiting chats</div>
          <div className="mt-2 space-y-2">
            {arrivalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-lg border border-amber-300/55 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                <div className="font-semibold">{alert.label}</div>
                <div className="text-xs text-amber-700/90">{toDateLabel(alert.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {waitingCount > 0 ? (
        <div className="app-callout warning">
          <span className="callout-icon">!</span>
          <div>
            <div className="callout-title">Users waiting for reply</div>
            <div className="callout-body">
              {waitingCount} conversation(s) currently waiting for agent response.
              {criticalWaitingCount > 0 || highWaitingCount > 0
                ? ` Critical: ${criticalWaitingCount} · High: ${highWaitingCount}`
                : ""}
            </div>
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

      <div className="agent-inbox-grid grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="app-card agent-inbox-list-pane">
          <div className="flex items-center justify-between mb-3">
            <h2 className="app-card-title !mb-0">Conversations</h2>
            <button type="button" className="app-btn-secondary" onClick={() => void loadInbox()} disabled={loadingInbox}>
              {loadingInbox ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mb-3 text-xs text-[#0a0a0f]/55">
            Waiting: <strong>{waitingCount}</strong> · Answered: <strong>{answeredCount}</strong> · High: <strong>{highWaitingCount}</strong> · Critical: <strong>{criticalWaitingCount}</strong>
          </div>

          <div className="space-y-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-[#0a0a0f]/55">No conversations in shared inbox.</p>
            ) : null}
            {conversations.map((conversation) => {
              const waiting = isConversationWaiting(conversation);
              const waitingUrgency = getWaitingUrgency(conversation);
              const waitingSince = waiting
                ? toRelativeAgeLabel(conversation.last_external_message_at ?? conversation.last_message_at)
                : "";

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    setSelectedConversationSnapshot(conversation);
                  }}
                  className={`agent-inbox-row w-full text-left rounded-xl border px-3 py-3 transition ${
                    selectedConversationId === conversation.id
                      ? "border-[#1a5c5c]/35 bg-[#1a5c5c]/8"
                      : "border-[#0a0a0f]/10 bg-white hover:border-[#0a0a0f]/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="truncate text-sm text-[#0a0a0f]">{getConversationDisplayName(conversation)}</strong>
                    <span
                      className={`rounded-full px-2 py-[1px] text-[10px] font-semibold ${
                        waiting
                          ? getWaitingUrgencyTone(waitingUrgency)
                          : "border border-[#1a5c5c]/25 bg-[#e9f6f3] text-[#1a5c5c]"
                      }`}
                    >
                      {waiting ? "Waiting" : "Answered"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#0a0a0f]/50">
                    <span>{getConversationModeLabel(conversation)}</span>
                    <span className={`rounded-full border px-2 py-[1px] text-[10px] font-semibold ${getVisitorStateTone(conversation)}`}>
                      {getVisitorStateLabel(conversation)}
                    </span>
                    {conversation.visitor_email ? <span className="truncate">{conversation.visitor_email}</span> : null}
                    {conversation.visitor_phone ? <span>{conversation.visitor_phone}</span> : null}
                    {conversation.visitor_contact_captured ? (
                      <span className="rounded-full border border-[#1a5c5c]/25 bg-[#1a5c5c]/10 px-2 py-[1px] text-[10px] font-semibold text-[#1a5c5c]">
                        Contact
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[#0a0a0f]/45">
                    <span>{toDateLabel(conversation.last_message_at)}</span>
                    {waiting && waitingSince ? (
                      <span
                        className={`font-semibold ${
                          waitingUrgency === "critical"
                            ? "text-[#991b1b]"
                            : waitingUrgency === "high"
                              ? "text-[#a53f22]"
                              : waitingUrgency === "warning"
                                ? "text-amber-700"
                                : "text-[#1a5c5c]"
                        }`}
                      >
                        {waitingSince}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="app-card agent-inbox-thread-pane">
          {!selectedConversation ? (
            <p className="text-sm text-[#0a0a0f]/55">Select a conversation to view details.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="app-card-title !mb-1">{getConversationDisplayName(selectedConversation)}</h2>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-[#0a0a0f]/55">
                    <span>Mode: {selectedConversation.conversation_mode ?? "ai_only"}</span>
                    {selectedConversationEnded ? (
                      <span className="rounded-full border border-[#991b1b]/30 bg-[#fee2e2] px-2 py-[1px] text-[10px] font-semibold uppercase tracking-wide text-[#991b1b]">
                        Ended
                      </span>
                    ) : null}
                  </p>
                  {selectedConversationEnded ? (
                    <p className="text-xs text-[#991b1b]/85">
                      Ended at {toDateLabel(selectedConversation.closed_at ?? selectedConversation.updated_at)}
                    </p>
                  ) : null}
                  <p className="text-xs text-[#0a0a0f]/45">
                    {selectedConversation.visitor_email || "No email"} · {selectedConversation.visitor_phone || "No phone"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedConversation.conversation_mode === "handoff_pending" ? (
                    <button
                      type="button"
                      className="app-btn-primary"
                      disabled={runningAction || !canManageConversation}
                      onClick={() => void handleAccept(selectedConversation.id)}
                    >
                      {runningAction ? "Joining..." : "Join"}
                    </button>
                  ) : null}
                  {selectedConversation.conversation_mode === "agent_active" ? (
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
                    selectedConversation.conversation_mode === "copilot") ? (
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

              {canManageConversation && !selectedConversationEnded ? (
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

              <div className="rounded-2xl border border-[#0a0a0f]/10 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#0a0a0f]/8 bg-[#faf8f4] px-4 py-2.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0a0a0f]/55">
                    Conversation Thread
                  </div>
                  <div className="text-xs text-[#0a0a0f]/55">
                    {visitorTyping ? (
                      <span className="rounded-full border border-[#2563eb]/30 bg-[#ecf3ff] px-2 py-0.5 text-[#1d4ed8]">
                        Visitor typing...
                      </span>
                    ) : (
                      <span>{messages.length} messages</span>
                    )}
                  </div>
                </div>

                <div
                  ref={threadViewportRef}
                  onScroll={onThreadScroll}
                  className="agent-thread h-[460px] overflow-y-auto bg-[linear-gradient(180deg,#faf8f4_0%,#ffffff_40%,#f8fbfb_100%)] px-4 py-4"
                >
                  {loadingMessages ? <p className="text-sm text-[#0a0a0f]/55">Loading messages...</p> : null}
                  {!loadingMessages && messages.length === 0 ? (
                    <p className="text-sm text-[#0a0a0f]/55">No messages yet.</p>
                  ) : null}

                  {!loadingMessages
                    ? (() => {
                        let lastDayLabel = "";
                        return messages.map((message) => {
                          const dayLabel = toDayLabel(message.created_at);
                          const showDayLabel = dayLabel !== "" && dayLabel !== lastDayLabel;
                          if (showDayLabel) {
                            lastDayLabel = dayLabel;
                          }

                          const isSystem = message.sender_type === "system" || message.role === "system";
                          const isVisitor = message.sender_type === "visitor";
                          const isInternal = Boolean(message.is_internal);
                          const isOwnAgentMessage =
                            message.sender_type === "agent" &&
                            (message.sender_id ? message.sender_id === currentAgentId : true);

                          const senderLabel = isSystem
                            ? "System"
                            : isVisitor
                              ? "Visitor"
                              : isInternal
                                ? "Internal Note"
                                : isOwnAgentMessage
                                  ? "You"
                                  : "Agent";

                          return (
                            <Fragment key={message.id}>
                              {showDayLabel ? (
                                <div className="mb-3 flex items-center gap-2">
                                  <div className="h-px flex-1 bg-[#0a0a0f]/10" />
                                  <span className="rounded-full border border-[#0a0a0f]/10 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0a0a0f]/50">
                                    {dayLabel}
                                  </span>
                                  <div className="h-px flex-1 bg-[#0a0a0f]/10" />
                                </div>
                              ) : null}

                              {isSystem ? (
                                <div className="mb-3 flex justify-center">
                                  <div className="max-w-[92%] rounded-2xl border border-[#0a0a0f]/12 bg-[#f7f7f8] px-3 py-2 text-xs text-[#0a0a0f]/65">
                                    <div className="mb-0.5 flex items-center justify-between gap-3">
                                      <span className="font-semibold uppercase tracking-wide text-[#0a0a0f]/45">
                                        System
                                      </span>
                                      <span className="text-[10px] text-[#0a0a0f]/40">
                                        {toDateLabel(message.created_at)}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className={`mb-3 flex ${isVisitor ? "justify-start" : "justify-end"}`}>
                                  <div
                                    className={`max-w-[82%] rounded-2xl border px-3 py-2 shadow-[0_8px_18px_rgba(10,10,15,0.04)] ${
                                      isVisitor
                                        ? "border-[#0a0a0f]/10 bg-white"
                                        : isInternal
                                          ? "border-amber-300/45 bg-amber-50"
                                          : "border-[#1a5c5c]/20 bg-[#e8f6f2]"
                                    }`}
                                  >
                                    <div className="mb-1 flex items-center justify-between gap-3">
                                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0a0a0f]/50">
                                        {senderLabel}
                                      </span>
                                      <span className="text-[10px] text-[#0a0a0f]/40">
                                        {toDateLabel(message.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-[#0a0a0f]/85 whitespace-pre-wrap">
                                      {message.content}
                                    </p>
                                    {message._optimistic ? (
                                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#1a5c5c]/65">
                                        Sending...
                                      </p>
                                    ) : null}
                                    {message._failed ? (
                                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#b45309]">
                                        Delivery failed
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              )}
                            </Fragment>
                          );
                        });
                      })()
                    : null}

                  {visitorTyping ? (
                    <div className="mb-1 flex justify-start">
                      <div className="rounded-2xl border border-[#0a0a0f]/10 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(10,10,15,0.04)]">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#0a0a0f]/50">
                          Visitor
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#64748b] animate-bounce" />
                          <span
                            className="h-2 w-2 rounded-full bg-[#64748b] animate-bounce"
                            style={{ animationDelay: "120ms" }}
                          />
                          <span
                            className="h-2 w-2 rounded-full bg-[#64748b] animate-bounce"
                            style={{ animationDelay: "240ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {(selectedConversation.conversation_mode === "agent_active" ||
                selectedConversation.conversation_mode === "copilot") &&
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

              <div className="space-y-2 sticky bottom-0 bg-[#fffdf9] pt-2">
                <div className="flex items-center justify-between text-[11px] text-[#0a0a0f]/55">
                  <span>Realtime reply box</span>
                  <span>Press Enter to send · Shift+Enter for newline</span>
                </div>
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  className="app-textarea"
                  placeholder="Type your reply..."
                  rows={3}
                  disabled={
                    !canManageConversation ||
                    submittingReply ||
                    !canReplyToConversation(selectedConversation)
                  }
                />
                <div className="flex justify-between items-center">
                  <div className="text-xs text-[#0a0a0f]/45">
                    {selectedConversation.conversation_mode === "agent_active" ||
                    selectedConversation.conversation_mode === "copilot"
                      ? "Live mode active"
                      : "First reply will switch this chat to live agent mode"}
                  </div>
                  <button
                    type="button"
                    className="app-btn-primary"
                    onClick={() => void handleSendReply()}
                    disabled={
                      !canManageConversation ||
                      submittingReply ||
                      !replyText.trim() ||
                      !canReplyToConversation(selectedConversation)
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
