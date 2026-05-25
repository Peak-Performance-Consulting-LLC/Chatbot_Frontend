import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createChat,
  deleteChat,
  getWidgetConfig,
  getConversationCsat,
  HandoffRequestError,
  listChats,
  listMessages,
  publishVisitorTyping,
  renameChat,
  requestHandoff,
  resolveBaseUrl,
  searchPlaceSuggestions,
  submitConversationCsat,
  submitVisitorContact,
  streamChat,
  type WidgetConfig
} from "@/lib/api";
import { subscribeToBackendEvents } from "@/lib/backendEvents";
import { getOrCreateDeviceId } from "@/lib/device";
import { resolveTenantId } from "@/lib/tenant";
import { getWidgetSurfaceTokens } from "@/lib/widgetTheme";
import { createClient } from "@supabase/supabase-js";
import type { ChatMessage, ChatThread, ConversationMode, MessageMetadata } from "@/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

type ChatWidgetProps = {
  tenantId?: string;
  backendUrl?: string;
  embedded?: boolean;
  layoutVariant?: ChatWidgetLayoutVariant;
  portalToken?: string;
  supportPhoneOverride?: string | null;
  supportCtaLabelOverride?: string | null;
  headerCtaLabelOverride?: string | null;
  headerCtaNoticeOverride?: string | null;
  appearanceOverride?: Partial<ChatWidgetAppearance>;
};

type FlightUi = NonNullable<MessageMetadata["flight_ui"]>;
type ServiceUi = NonNullable<MessageMetadata["service_ui"]>;
type ContactCapture = NonNullable<MessageMetadata["contact_capture"]>;
type CallCta = NonNullable<MessageMetadata["call_cta"]>;
type HeaderCtaConfig = {
  label: string;
  notice: string;
};
type LiveSupportAvailability = "online" | "busy" | "away" | "offline";
type ActiveAgent = {
  id: string;
  name: string;
  avatarUrl?: string | null;
} | null;
type ChatWidgetLayoutVariant = "default" | "platform";
type ChatWidgetAppearance = {
  primaryColor: string;
  userBubbleColor: string;
  botBubbleColor: string;
  fontFamily: string;
  widgetPosition: "left" | "right";
  launcherStyle: "rounded" | "pill" | "square" | "minimal";
  themeStyle: "standard" | "glass" | "clay" | "dark" | "minimal";
  bgPattern: "none" | "dots" | "grid" | "waves";
  launcherIcon: "chat" | "sparkle" | "headset" | "zap" | "heart";
  windowWidth: number;
  windowHeight: number;
  borderRadius: number;
  botName: string;
  welcomeMessage: string;
  botAvatarUrl?: string | null;
  quickReplies: string[];
  notifEnabled: boolean;
  notifText: string;
  notifAnimation: "bounce" | "pulse" | "slide";
  notifChips: string[];
  csatEnabled: boolean;
  csatPrompt: string;
};

const defaultAppearance: ChatWidgetAppearance = {
  primaryColor: "#006d77",
  userBubbleColor: "#006d77",
  botBubbleColor: "#edf6f9",
  fontFamily: "Manrope",
  widgetPosition: "right",
  launcherStyle: "rounded",
  themeStyle: "standard",
  bgPattern: "none",
  launcherIcon: "chat",
  windowWidth: 440,
  windowHeight: 760,
  borderRadius: 18,
  botName: "AeroConcierge",
  welcomeMessage: "Welcome. How can I help today?",
  botAvatarUrl: null,
  quickReplies: ["How does this work?", "Pricing plans", "Get support"],
  notifEnabled: true,
  notifText: "👋 Need help?",
  notifAnimation: "bounce",
  notifChips: ["I have a question", "Tell me more"],
  csatEnabled: true,
  csatPrompt: "Rate this conversation"
};

const defaultHeaderCtaConfig: HeaderCtaConfig = {
  label: "",
  notice: "Hi! I am your AI assistant. Ask me anything about your trip."
};
const poweredByBrand = "PPConsultings";
const CONTACT_CAPTURE_STORAGE_PREFIX = "aeroconcierge_contact_captured";
const HANDOFF_CONTACT_CAPTURE_PROMPT =
  "Please share your name, email, and phone before we connect you to a live agent.";
const AGENT_TYPING_WINDOW_MS = 8000;
const AGENT_TYPING_POLL_MS = 1200;
const VISITOR_TYPING_KEEPALIVE_MS = 1200;

function normalizeAppearance(
  input?: Partial<ChatWidgetAppearance> | null,
  layoutVariant: ChatWidgetLayoutVariant = "default"
): ChatWidgetAppearance {
  const limits = layoutVariant === "platform"
    ? { minWidth: 760, maxWidth: 1120, minHeight: 620, maxHeight: 860 }
    : { minWidth: 360, maxWidth: 560, minHeight: 560, maxHeight: 860 };

  return {
    primaryColor: input?.primaryColor?.trim() || defaultAppearance.primaryColor,
    userBubbleColor: input?.userBubbleColor?.trim() || input?.primaryColor?.trim() || defaultAppearance.userBubbleColor,
    botBubbleColor: input?.botBubbleColor?.trim() || defaultAppearance.botBubbleColor,
    fontFamily: input?.fontFamily?.trim() || defaultAppearance.fontFamily,
    widgetPosition: input?.widgetPosition === "left" ? "left" : "right",
    launcherStyle:
      input?.launcherStyle === "pill" || input?.launcherStyle === "square" || input?.launcherStyle === "minimal"
        ? input.launcherStyle
        : defaultAppearance.launcherStyle,
    themeStyle:
      input?.themeStyle === "glass" || input?.themeStyle === "clay" || input?.themeStyle === "dark" || input?.themeStyle === "minimal"
        ? input.themeStyle
        : defaultAppearance.themeStyle,
    bgPattern:
      input?.bgPattern === "dots" || input?.bgPattern === "grid" || input?.bgPattern === "waves"
        ? input.bgPattern
        : defaultAppearance.bgPattern,
    launcherIcon:
      input?.launcherIcon === "sparkle" || input?.launcherIcon === "headset" || input?.launcherIcon === "zap" || input?.launcherIcon === "heart"
        ? input.launcherIcon
        : defaultAppearance.launcherIcon,
    windowWidth:
      typeof input?.windowWidth === "number"
        ? Math.min(limits.maxWidth, Math.max(limits.minWidth, Math.round(input.windowWidth)))
        : defaultAppearance.windowWidth,
    windowHeight:
      typeof input?.windowHeight === "number"
        ? Math.min(limits.maxHeight, Math.max(limits.minHeight, Math.round(input.windowHeight)))
        : defaultAppearance.windowHeight,
    borderRadius:
      typeof input?.borderRadius === "number" ? Math.min(36, Math.max(8, Math.round(input.borderRadius))) : defaultAppearance.borderRadius,
    botName: input?.botName?.trim() || defaultAppearance.botName,
    welcomeMessage: input?.welcomeMessage?.trim() || defaultAppearance.welcomeMessage,
    botAvatarUrl: input?.botAvatarUrl?.trim() || defaultAppearance.botAvatarUrl,
    quickReplies:
      Array.isArray(input?.quickReplies)
        ? Array.from(new Set(input.quickReplies.map((reply) => reply.trim()).filter(Boolean))).slice(0, 6)
        : defaultAppearance.quickReplies,
    notifEnabled: input?.notifEnabled ?? defaultAppearance.notifEnabled,
    notifText: input?.notifText?.trim() || defaultAppearance.notifText,
    notifAnimation:
      input?.notifAnimation === "pulse" || input?.notifAnimation === "slide"
        ? input.notifAnimation
        : defaultAppearance.notifAnimation,
    notifChips:
      Array.isArray(input?.notifChips)
        ? Array.from(new Set(input.notifChips.map((chip) => chip.trim()).filter(Boolean))).slice(0, 4)
        : defaultAppearance.notifChips,
    csatEnabled: input?.csatEnabled ?? defaultAppearance.csatEnabled,
    csatPrompt: input?.csatPrompt?.trim() || defaultAppearance.csatPrompt
  };
}

function normalizeHeaderCtaConfig(input?: Partial<HeaderCtaConfig> | null): HeaderCtaConfig {
  const rawLabel = input?.label?.trim();
  return {
    label: rawLabel && rawLabel.toLowerCase() !== "new" ? rawLabel : defaultHeaderCtaConfig.label,
    notice: input?.notice?.trim() || defaultHeaderCtaConfig.notice
  };
}

function darkenHex(input: string) {
  const normalized = input.replace("#", "");
  if (!/^([a-fA-F0-9]{6})$/.test(normalized)) {
    return "#00454b";
  }
  const channels = normalized.match(/.{1,2}/g)?.map((value) => Math.max(0, Math.min(255, parseInt(value, 16) - 24))) ?? [0, 69, 75];
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function normalizeMessageText(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function generateClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseMessageTs(input: string) {
  const ts = Date.parse(input);
  return Number.isFinite(ts) ? ts : 0;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeLiveSupportAvailability(input: string | null | undefined): LiveSupportAvailability {
  return input === "busy" || input === "away" || input === "offline" ? input : "online";
}

function getLiveSupportLabel(availability: LiveSupportAvailability) {
  if (availability === "busy") return "Live team busy";
  if (availability === "away") return "Live team away";
  if (availability === "offline") return "Live team offline";
  return "Live team online";
}

function messagesAreEquivalent(localMessage: ChatMessage, syncedMessage: ChatMessage) {
  if (localMessage.chat_id !== syncedMessage.chat_id || localMessage.role !== syncedMessage.role) {
    return false;
  }

  const localContent = normalizeMessageText(localMessage.content);
  const syncedContent = normalizeMessageText(syncedMessage.content);
  if (!localContent || !syncedContent || localContent !== syncedContent) {
    return false;
  }

  return Math.abs(parseMessageTs(localMessage.created_at) - parseMessageTs(syncedMessage.created_at)) < 5 * 60 * 1000;
}

function mergeSyncedMessages(chatId: string, syncedMessages: ChatMessage[], localMessages: ChatMessage[]) {
  const merged = [...syncedMessages];
  const pendingLocalMessages = localMessages.filter(
    (message) => message.chat_id === chatId && normalizeMessageText(message.content)
  );

  for (const localMessage of pendingLocalMessages) {
    if (!merged.some((syncedMessage) => messagesAreEquivalent(localMessage, syncedMessage))) {
      merged.push(localMessage);
    }
  }

  return merged.sort((a, b) => parseMessageTs(a.created_at) - parseMessageTs(b.created_at));
}

function syncedMessagesAreComplete(chatId: string, syncedMessages: ChatMessage[], localMessages: ChatMessage[]) {
  const pendingLocalMessages = localMessages.filter(
    (message) => message.chat_id === chatId && normalizeMessageText(message.content)
  );
  return pendingLocalMessages.every((localMessage) =>
    syncedMessages.some((syncedMessage) => messagesAreEquivalent(localMessage, syncedMessage))
  );
}

function parseWidgetConfigFromQuery(): {
  appearance: Partial<ChatWidgetAppearance>;
  supportPhone?: string;
  supportCtaLabel?: string;
  headerCtaLabel?: string;
  headerCtaNotice?: string;
} {
  const params = new URLSearchParams(window.location.search);
  const width = Number(params.get("window_width"));
  const height = Number(params.get("window_height"));
  const radius = Number(params.get("border_radius"));
  return {
    appearance: {
      primaryColor: params.get("primary_color") || undefined,
      userBubbleColor: params.get("user_bubble_color") || undefined,
      botBubbleColor: params.get("bot_bubble_color") || undefined,
      fontFamily: params.get("font_family") || undefined,
      widgetPosition: params.get("widget_position") === "left" ? "left" : "right",
      launcherStyle:
        params.get("launcher_style") === "pill" ||
          params.get("launcher_style") === "square" ||
          params.get("launcher_style") === "minimal"
          ? (params.get("launcher_style") as ChatWidgetAppearance["launcherStyle"])
          : undefined,
      themeStyle:
        params.get("theme_style") === "glass" ||
          params.get("theme_style") === "clay" ||
          params.get("theme_style") === "dark" ||
          params.get("theme_style") === "minimal"
          ? (params.get("theme_style") as ChatWidgetAppearance["themeStyle"])
          : undefined,
      bgPattern:
        params.get("bg_pattern") === "dots" ||
          params.get("bg_pattern") === "grid" ||
          params.get("bg_pattern") === "waves"
          ? (params.get("bg_pattern") as ChatWidgetAppearance["bgPattern"])
          : undefined,
      launcherIcon:
        params.get("launcher_icon") === "sparkle" ||
          params.get("launcher_icon") === "headset" ||
          params.get("launcher_icon") === "zap" ||
          params.get("launcher_icon") === "heart"
          ? (params.get("launcher_icon") as ChatWidgetAppearance["launcherIcon"])
          : undefined,
      windowWidth: Number.isFinite(width) ? width : undefined,
      windowHeight: Number.isFinite(height) ? height : undefined,
      borderRadius: Number.isFinite(radius) ? radius : undefined,
      botName: params.get("bot_name") || undefined,
      welcomeMessage: params.get("welcome_message") || undefined,
      botAvatarUrl: params.get("avatar_url") || undefined,
      quickReplies: params.getAll("quick_reply"),
      notifEnabled: params.get("notif_enabled") === "0" ? false : undefined,
      notifText: params.get("notif_text") || undefined,
      notifAnimation:
        params.get("notif_animation") === "pulse" || params.get("notif_animation") === "slide"
          ? (params.get("notif_animation") as ChatWidgetAppearance["notifAnimation"])
          : undefined,
      notifChips: params.getAll("notif_chip")
    },
    supportPhone: params.get("support_phone") || undefined,
    supportCtaLabel: params.get("support_cta_label") || undefined,
    headerCtaLabel: params.get("header_cta_label") || undefined,
    headerCtaNotice: params.get("header_cta_notice") || undefined
  };
}

function resolveEmbeddedSiteHost() {
  if (!document.referrer) return undefined;
  try { return new URL(document.referrer).host; } catch { return undefined; }
}

function sanitizePhoneNumber(value: string) {
  return value.replace(/[^+\d]/g, "");
}

function buildContactCaptureStorageKey(tenantId: string, deviceId: string) {
  return `${CONTACT_CAPTURE_STORAGE_PREFIX}:${tenantId}:${deviceId}`;
}

function normalizeVisitorPhoneInput(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

function validateVisitorContactInput(input: {
  fullName: string;
  email: string;
  phone: string;
}) {
  const errors: { fullName?: string; email?: string; phone?: string } = {};

  const name = input.fullName.trim();
  if (!name) {
    errors.fullName = "Name is required";
  } else if (name.length < 2 || name.length > 80) {
    errors.fullName = "Name must be between 2 and 80 characters";
  } else if (!/^(?=.{2,80}$)[\p{L}][\p{L}\p{M}\s'.-]*$/u.test(name)) {
    errors.fullName = "Enter a valid name";
  }

  const email = input.email.trim();
  if (!email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email";
  }

  const phone = input.phone.trim();
  if (!phone) {
    errors.phone = "Phone is required";
  } else if (!/^[+\d\s().-]+$/.test(phone)) {
    errors.phone = "Enter a valid phone number";
  } else {
    const digits = phone.replace(/\D/g, "").length;
    if (digits < 7 || digits > 15) {
      errors.phone = "Phone must include 7 to 15 digits";
    }
  }

  return errors;
}

function buildCallCtaOverride(number?: string | null, label?: string | null): CallCta | null {
  const trimmedNumber = number?.trim();
  if (!trimmedNumber) return null;
  return {
    number: trimmedNumber,
    tel: `tel:${sanitizePhoneNumber(trimmedNumber)}`,
    label: label?.trim() || "Connect with a specialist"
  };
}

function resolveCallCta(messageCta?: MessageMetadata["call_cta"] | null, overrideCta?: CallCta | null): CallCta | null {
  return overrideCta ?? messageCta ?? null;
}

function getRenderableMessageContent(message: ChatMessage) {
  const content = message.content.trim();
  if (message.role !== "assistant" || !message.metadata?.flight_deals?.length) return content;
  return "Here are the best live fares I found. Compare the cards below, or tell me what you want to change.";
}

function LauncherIconGlyph({ icon }: { icon: ChatWidgetAppearance["launcherIcon"] }) {
  if (icon === "sparkle") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      </svg>
    );
  }
  if (icon === "headset") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 13a8 8 0 0 1 16 0" />
        <rect x="3" y="12" width="4" height="7" rx="2" />
        <rect x="17" y="12" width="4" height="7" rx="2" />
        <path d="M21 18a3 3 0 0 1-3 3h-2" />
      </svg>
    );
  }
  if (icon === "zap") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </svg>
    );
  }
  if (icon === "heart") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 20-1.45-1.32C5.4 14.03 2 10.94 2 7.15 2 4.06 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.06 22 7.15c0 3.79-3.4 6.88-8.55 11.54L12 20Z" />
      </svg>
    );
  }
  return <IconChat />;
}

function formatDealDateTime(value?: string) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatStops(stops?: number) {
  if (typeof stops !== "number") return "Stops not listed";
  if (stops === 0) return "Non-stop";
  return `${stops} stop${stops > 1 ? "s" : ""}`;
}

function formatCabin(cabin?: string) {
  if (!cabin) return "Cabin not listed";
  return cabin.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatThreadTime(iso: string) {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleString([], { hour: "2-digit", minute: "2-digit" });
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function IconChat() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.35 1.78.68 2.61a2 2 0 0 1-.45 2.11L8.1 9.91a16 16 0 0 0 6 6l1.47-1.24a2 2 0 0 1 2.11-.45c.83.33 1.71.56 2.61.68A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// ── Typing indicator ────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="message-row assistant">
      <div className="typing-indicator">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

// ── Flight Deals ────────────────────────────────────────────────────────────────
function FlightDeals({ metadata, callCtaOverride }: { metadata: MessageMetadata; callCtaOverride?: CallCta | null }) {
  if (!metadata.flight_deals || metadata.flight_deals.length === 0) return null;
  const callCta = resolveCallCta(metadata.call_cta, callCtaOverride);
  const ctaLabel = callCta ? callCta.label : "Book now";
  const ctaHref = callCta?.tel ?? "#";
  return (
    <div className="deal-grid">
      {metadata.flight_deals.map((deal) => (
        <article key={deal.id} className="deal-card">
          {/* Airline + price row */}
          <div className="deal-head">
            <div className="deal-airline">
              {deal.airline_logo
                ? <img src={deal.airline_logo} alt={deal.airline} className="deal-logo" />
                : <div className="deal-logo-fallback">{(deal.airline ?? "").slice(0, 2).toUpperCase()}</div>}
              <div className="deal-airline-info">
                <h4>{deal.airline}</h4>
                <p className="deal-route">{deal.origin} → {deal.destination}</p>
              </div>
            </div>
            <div className="deal-price-wrap">
              <p className="deal-price">{deal.total_price}</p>
            </div>
          </div>
          <a href={ctaHref} className="deal-card-cta">{ctaLabel}</a>
        </article>
      ))}
    </div>
  );
}


// ── Quick Replies ───────────────────────────────────────────────────────────────
function QuickReplies({ quickReplies, disabled, onSelect, className }: { quickReplies: string[]; disabled: boolean; onSelect: (v: string) => void; className?: string }) {
  if (quickReplies.length === 0) return null;
  return (
    <div className={className ?? "quick-replies"}>
      {quickReplies.map((reply) => (
        <button key={reply} type="button" disabled={disabled} onClick={() => onSelect(reply)}>{reply}</button>
      ))}
    </div>
  );
}

// ── Service Request Summary ─────────────────────────────────────────────────────
function ServiceRequestSummary({ metadata }: { metadata: MessageMetadata }) {
  if (!metadata.service_request) return null;
  const entries = Object.entries(metadata.service_request.payload ?? {});
  if (entries.length === 0) return null;
  return (
    <div className="service-summary">
      <h4>{metadata.service_request.service.toUpperCase()} request</h4>
      <ul>
        {entries.map(([key, value]) => (
          <li key={key}><span>{key.replace(/_/g, " ")}</span><strong>{String(value)}</strong></li>
        ))}
      </ul>
    </div>
  );
}

// ── Guided Flight Input ─────────────────────────────────────────────────────────
function GuidedFlightInput({
  flightUi, disabled, onSubmit, tenantId, backendUrl, authToken, siteHost
}: {
  flightUi: FlightUi; disabled: boolean; onSubmit: (v: string) => void;
  tenantId: string; backendUrl?: string; authToken?: string; siteHost?: string;
}) {
  const [airportText, setAirportText] = useState("");
  const [dateText, setDateText] = useState("");
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [infants, setInfants] = useState<number>(0);
  const [tripTypeValue, setTripTypeValue] = useState("one-way");
  const [cabinValue, setCabinValue] = useState("Economy");
  const [selectedAirportCode, setSelectedAirportCode] = useState("");
  const [liveAirportSuggestions, setLiveAirportSuggestions] = useState<Array<{ code: string; label: string }>>([]);
  const [isAirportMenuOpen, setIsAirportMenuOpen] = useState(false);

  useEffect(() => {
    setAirportText(""); setDateText("");
    setAdults(flightUi.state?.passengers?.adults ?? 1);
    setChildren(flightUi.state?.passengers?.children ?? 0);
    setInfants(flightUi.state?.passengers?.infants ?? 0);
    setTripTypeValue(flightUi.state?.trip_type ?? "one-way");
    setCabinValue(flightUi.state?.cabin_class ? formatCabin(flightUi.state.cabin_class) : "Economy");
    setSelectedAirportCode(""); setLiveAirportSuggestions([]); setIsAirportMenuOpen(false);
  }, [flightUi.next_slot, flightUi.state?.passengers?.adults, flightUi.state?.passengers?.children, flightUi.state?.passengers?.infants]);

  useEffect(() => {
    if (flightUi.next_slot !== "origin" && flightUi.next_slot !== "destination") return;
    const query = airportText.trim();
    if (query.length < 2) { setLiveAirportSuggestions([]); return; }
    let isCancelled = false;
    const timer = window.setTimeout(() => {
      searchPlaceSuggestions({ tenantId, query, backendUrl, authToken, siteHost })
        .then((s) => { if (!isCancelled) setLiveAirportSuggestions(s); })
        .catch(() => { if (!isCancelled) setLiveAirportSuggestions([]); });
    }, 220);
    return () => { isCancelled = true; window.clearTimeout(timer); };
  }, [airportText, flightUi.next_slot, tenantId, backendUrl, authToken, siteHost]);

  const airportOptions = useMemo(() => {
    const merged = [...liveAirportSuggestions, ...(flightUi.airport_suggestions ?? [])];
    const map = new Map<string, { code: string; label: string }>();
    for (const item of merged) {
      const code = item.code?.trim().toUpperCase();
      if (!code || map.has(code)) continue;
      map.set(code, { code, label: item.label });
    }
    return Array.from(map.values()).slice(0, 8);
  }, [liveAirportSuggestions, flightUi.airport_suggestions]);

  useEffect(() => {
    if (flightUi.next_slot !== "origin" && flightUi.next_slot !== "destination") return;
    setSelectedAirportCode((cur) => {
      if (cur && airportOptions.some((o) => o.code === cur)) return cur;
      return airportOptions[0]?.code ?? "";
    });
  }, [airportOptions, flightUi.next_slot]);

  const selectedAirportSuggestion = useMemo(
    () => airportOptions.find((option) => option.code === selectedAirportCode) ?? null,
    [airportOptions, selectedAirportCode]
  );

  function submitAirportValue(value?: string) {
    const nextValue = value?.trim();
    if (!nextValue) return;
    setIsAirportMenuOpen(false);
    onSubmit(nextValue);
  }

  function resolveTypedAirportValue() {
    const typedValue = airportText.trim();
    if (!typedValue) return "";
    if (!selectedAirportSuggestion) return typedValue;
    const normalizedTypedValue = typedValue.toLowerCase();
    if (
      normalizedTypedValue === selectedAirportSuggestion.code.toLowerCase() ||
      normalizedTypedValue === selectedAirportSuggestion.label.toLowerCase()
    ) {
      return selectedAirportSuggestion.code;
    }
    return typedValue;
  }

  function handleAirportInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!airportOptions.length) {
      if (event.key === "Enter" && airportText.trim()) {
        event.preventDefault();
        submitAirportValue(airportText);
      }
      return;
    }

    const currentIndex = airportOptions.findIndex((option) => option.code === selectedAirportCode);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsAirportMenuOpen(true);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % airportOptions.length : 0;
      setSelectedAirportCode(airportOptions[nextIndex]?.code ?? "");
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsAirportMenuOpen(true);
      const nextIndex = currentIndex >= 0 ? (currentIndex - 1 + airportOptions.length) % airportOptions.length : airportOptions.length - 1;
      setSelectedAirportCode(airportOptions[nextIndex]?.code ?? "");
      return;
    }

    if (event.key === "Escape") {
      setIsAirportMenuOpen(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      submitAirportValue(resolveTypedAirportValue());
    }
  }

  if (flightUi.phase !== "collecting" || !flightUi.next_slot) return null;

  if (flightUi.next_slot === "trip_type") {
    return (
      <div className="guided-input">
        <p>Trip type</p>
        <div className="guided-inline">
          <select value={tripTypeValue} onChange={(e) => setTripTypeValue(e.target.value)}>
            <option value="one-way">One-way</option>
            <option value="round-trip">Round-trip</option>
          </select>
          <button type="button" disabled={disabled} onClick={() => onSubmit(tripTypeValue)}>Use trip type</button>
        </div>
      </div>
    );
  }

  if (flightUi.next_slot === "cabin_class") {
    return (
      <div className="guided-input">
        <p>Cabin class</p>
        <div className="guided-inline">
          <select value={cabinValue} onChange={(e) => setCabinValue(e.target.value)}>
            <option value="Economy">Economy</option>
            <option value="Premium Economy">Premium Economy</option>
            <option value="Business">Business</option>
            <option value="First">First</option>
          </select>
          <button type="button" disabled={disabled} onClick={() => onSubmit(cabinValue)}>Use cabin</button>
        </div>
      </div>
    );
  }

  if (flightUi.next_slot === "depart_date" || flightUi.next_slot === "return_date") {
    return (
      <div className="guided-input">
        <p>{flightUi.next_slot === "depart_date" ? "Departure date" : "Return date"}</p>
        <small className="guided-help">Use the calendar picker to send the exact date in one click.</small>
        <div className="guided-inline">
          <input type="date" value={dateText} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDateText(e.target.value)} />
          <button type="button" disabled={disabled || !dateText} onClick={() => onSubmit(dateText)}>Use date</button>
        </div>
      </div>
    );
  }

  if (flightUi.next_slot === "passengers") {
    return (
      <div className="guided-input guided-input-compact">
        <p>Passengers</p>
        <div className="passenger-inline-grid">
          <label>Adults
            <select value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((v) => <option key={`a-${v}`} value={v}>{v}</option>)}
            </select>
          </label>
          <label>Children
            <select value={children} onChange={(e) => setChildren(Number(e.target.value))}>
              {Array.from({ length: 7 }, (_, i) => i).map((v) => <option key={`c-${v}`} value={v}>{v}</option>)}
            </select>
          </label>
          <label>Infants
            <select value={infants} onChange={(e) => setInfants(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => i).map((v) => <option key={`i-${v}`} value={v}>{v}</option>)}
            </select>
          </label>
        </div>
        <button type="button" className="guided-submit guided-submit-compact" disabled={disabled}
          onClick={() => onSubmit(`${adults} adults, ${children} children, ${infants} infants`)}>
          Apply passengers
        </button>
      </div>
    );
  }

  if (flightUi.next_slot === "origin" || flightUi.next_slot === "destination") {
    return (
      <div className="guided-input guided-input-compact">
        <p>{flightUi.next_slot === "origin" ? "Departure airport" : "Destination airport"}</p>
        <div className="guided-inline guided-inline-top">
          <div className="guided-combobox">
            <input
              value={airportText}
              onFocus={() => setIsAirportMenuOpen(true)}
              onBlur={() => window.setTimeout(() => setIsAirportMenuOpen(false), 120)}
              onChange={(event) => {
                setAirportText(event.target.value);
                setSelectedAirportCode("");
                setIsAirportMenuOpen(true);
              }}
              onKeyDown={handleAirportInputKeyDown}
              placeholder="Search city or airport"
            />
            {isAirportMenuOpen && airportOptions.length > 0 ? (
              <div className="guided-suggestion-list" role="listbox" aria-label="Airport suggestions">
                {airportOptions.map((airport) => (
                  <button
                    key={`${flightUi.next_slot}-${airport.code}`}
                    type="button"
                    className={`guided-suggestion-item${selectedAirportCode === airport.code ? " active" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => submitAirportValue(airport.code)}
                  >
                    <strong>{airport.code}</strong>
                    <span>{airport.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="guided-submit guided-submit-compact"
            disabled={disabled || !airportText.trim()}
            onClick={() => submitAirportValue(resolveTypedAirportValue())}
          >
            Apply
          </button>
        </div>
      </div>
    );
  }
  return null;
}

// ── Guided Service Input ────────────────────────────────────────────────────────
function GuidedServiceInput({ serviceUi, disabled, onSubmit }: { serviceUi: ServiceUi; disabled: boolean; onSubmit: (v: string) => void }) {
  const [dateText, setDateText] = useState("");
  const [numberText, setNumberText] = useState(1);
  const [textValue, setTextValue] = useState("");
  useEffect(() => {
    setDateText(""); setNumberText(Math.max(1, serviceUi.next_slot_min ?? 1)); setTextValue("");
  }, [serviceUi.next_slot, serviceUi.next_slot_min]);

  if (serviceUi.phase !== "collecting" || !serviceUi.next_slot) return null;
  const slotLabel = serviceUi.next_slot.replace(/_/g, " ");

  if (serviceUi.next_slot_type === "option") {
    return (
      <div className="guided-input">
        <p>Select {slotLabel}</p>
        <div className="chip-row">
          {(serviceUi.options ?? []).map((o) => (
            <button key={o} type="button" disabled={disabled} onClick={() => onSubmit(o)}>{o}</button>
          ))}
        </div>
      </div>
    );
  }
  if (serviceUi.next_slot_type === "date") {
    return (
      <div className="guided-input">
        <p>{slotLabel}</p>
        <div className="guided-inline">
          <input type="date" value={dateText} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDateText(e.target.value)} />
          <button type="button" disabled={disabled || !dateText} onClick={() => onSubmit(dateText)}>Use date</button>
        </div>
      </div>
    );
  }
  if (serviceUi.next_slot_type === "number") {
    const min = Math.max(1, serviceUi.next_slot_min ?? 1);
    const max = Math.max(min, serviceUi.next_slot_max ?? 12);
    return (
      <div className="guided-input">
        <p>{slotLabel}</p>
        <div className="guided-inline">
          <select value={numberText} onChange={(e) => setNumberText(Number(e.target.value))}>
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
              <option key={`${serviceUi.next_slot}-${v}`} value={v}>{v}</option>
            ))}
          </select>
          <button type="button" disabled={disabled} onClick={() => onSubmit(String(numberText))}>Use value</button>
        </div>
      </div>
    );
  }
  return (
    <div className="guided-input">
      <p>{slotLabel}</p>
      <div className="guided-inline">
        <input value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder={`Enter ${slotLabel}`} />
        <button type="button" disabled={disabled || !textValue.trim()} onClick={() => onSubmit(textValue.trim())}>Use value</button>
      </div>
    </div>
  );
}

function ContactCaptureForm(input: {
  capture: ContactCapture;
  values: { fullName: string; email: string; phone: string };
  errors: { fullName?: string; email?: string; phone?: string };
  disabled: boolean;
  submitting: boolean;
  successMessage: string | null;
  onChange: (field: "fullName" | "email" | "phone", value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const { capture, values, errors, disabled, submitting, successMessage, onChange, onSubmit } = input;

  return (
    <form
      className="guided-input"
      onSubmit={onSubmit}
      style={{ border: "1px solid rgba(10,10,15,0.12)", borderRadius: 12, padding: 14, background: "#fff" }}
    >
      <p style={{ marginBottom: 6 }}>{capture.prompt}</p>
      <div className="guided-inline" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div>
          <input
            value={values.fullName}
            onChange={(event) => onChange("fullName", event.target.value)}
            placeholder="Full name"
            disabled={disabled || submitting}
          />
          {errors.fullName ? <small className="error-text">{errors.fullName}</small> : null}
        </div>
        <div>
          <input
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder="Email"
            type="email"
            disabled={disabled || submitting}
          />
          {errors.email ? <small className="error-text">{errors.email}</small> : null}
        </div>
        <div>
          <input
            value={values.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            placeholder="Phone"
            type="tel"
            disabled={disabled || submitting}
          />
          {errors.phone ? <small className="error-text">{errors.phone}</small> : null}
        </div>
        <button type="submit" disabled={disabled || submitting}>
          {submitting ? "Saving..." : "Continue chat"}
        </button>
        {successMessage ? <small style={{ color: "#1a5c5c", fontWeight: 600 }}>{successMessage}</small> : null}
      </div>
    </form>
  );
}

// ── Message Bubble ──────────────────────────────────────────────────────────────
function MessageBubble({ message, callCtaOverride, appearance }: {
  message: ChatMessage; callCtaOverride?: CallCta | null;
  appearance: ChatWidgetAppearance;
}) {
  const isUser = message.role === "user";
  const renderableContent = getRenderableMessageContent(message);
  const hasFlightDeals = Boolean(message.metadata?.flight_deals?.length);
  const shouldRenderMarkdown = Boolean(renderableContent) && !hasFlightDeals;

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className="message-row-inner">
        {!isUser && (
          <div className="message-avatar-small">
            {appearance.botAvatarUrl
              ? <img src={appearance.botAvatarUrl} alt={appearance.botName} />
              : appearance.botName.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
          <button
            className="copy-btn"
            type="button"
            onClick={() => navigator.clipboard.writeText(renderableContent || message.content.trim())}
            title="Copy"
          >
            Copy
          </button>

          {hasFlightDeals ? <p className="deal-summary-text">{renderableContent}</p> : null}
          {shouldRenderMarkdown ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{renderableContent}</ReactMarkdown> : null}
          {message.metadata ? <FlightDeals metadata={message.metadata} callCtaOverride={callCtaOverride} /> : null}
          {message.metadata ? <ServiceRequestSummary metadata={message.metadata} /> : null}
        </div>
      </div>

      <span className="message-timestamp">{formatMessageTime(message.created_at)}</span>
    </div>
  );
}

// ── Thread Item ────────────────────────────────────────────────────────────────
function ThreadItem({
  thread, isActive, onOpen, onRename, onDelete
}: {
  thread: ChatThread; isActive: boolean;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(thread.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  function startRename() {
    setRenameValue(thread.title);
    setRenaming(true);
    setTimeout(() => renameInputRef.current?.select(), 30);
  }

  function submitRename() {
    const t = renameValue.trim();
    if (t && t !== thread.title) onRename(t);
    setRenaming(false);
  }

  return (
    <li className={isActive ? "active" : ""}>
      <div className="thread-item-row">
        {renaming ? (
          <input
            ref={renameInputRef}
            className="thread-rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <button type="button" className="thread-main-btn" onClick={onOpen}>
            <span>{thread.title}</span>
            <small>{formatThreadTime(thread.last_message_at)}</small>
          </button>
        )}

        {!renaming && !confirmDelete ? (
          <div className="thread-row-actions">
            <button type="button" onClick={startRename}>Rename</button>
            <button type="button" className="danger" onClick={() => setConfirmDelete(true)}>Delete</button>
          </div>
        ) : null}

        {confirmDelete ? (
          <div className="thread-delete-confirm">
            <span>Delete?</span>
            <button type="button" className="confirm-yes" onClick={() => { setConfirmDelete(false); onDelete(); }}>Yes</button>
            <button type="button" className="confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

// ── Main ChatWidget ─────────────────────────────────────────────────────────────
export function ChatWidget({
  tenantId: tenantIdProp,
  backendUrl,
  embedded = false,
  layoutVariant = "default",
  portalToken,
  supportPhoneOverride,
  supportCtaLabelOverride,
  headerCtaLabelOverride,
  headerCtaNoticeOverride,
  appearanceOverride
}: ChatWidgetProps) {
  const isPublicEmbed = embedded && !portalToken;
  const [isOpen, setIsOpen] = useState(embedded && Boolean(portalToken));
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileThreadsOpen, setIsMobileThreadsOpen] = useState(false);
  const [shellWidth, setShellWidth] = useState<number | null>(null);
  const [pendingLauncherReply, setPendingLauncherReply] = useState<string | null>(null);
  const [runtimeWidgetConfig, setRuntimeWidgetConfig] = useState<WidgetConfig | null>(null);
  const [contactValues, setContactValues] = useState({ fullName: "", email: "", phone: "" });
  const [contactErrors, setContactErrors] = useState<{ fullName?: string; email?: string; phone?: string }>({});
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccessMessage, setContactSuccessMessage] = useState<string | null>(null);
  const [hasCapturedContact, setHasCapturedContact] = useState(false);
  const [showHandoffContactCapture, setShowHandoffContactCapture] = useState(false);
  const [conversationMode, setConversationMode] = useState<ConversationMode>("ai_only");
  const [isRequestingHandoff, setIsRequestingHandoff] = useState(false);
  const [activeAgent, setActiveAgent] = useState<ActiveAgent>(null);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [agentTypingUserId, setAgentTypingUserId] = useState<string | null>(null);
  const [csatRating, setCsatRating] = useState(0);
  const [csatFeedback, setCsatFeedback] = useState("");
  const [csatSubmitted, setCsatSubmitted] = useState<{ rating: number; feedback: string | null } | null>(null);
  const [isLoadingCsat, setIsLoadingCsat] = useState(false);
  const [isSubmittingCsat, setIsSubmittingCsat] = useState(false);
  const [csatError, setCsatError] = useState<string | null>(null);

  const shellRef = useRef<HTMLElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const streamedAssistantIdRef = useRef<string | null>(null);
  const streamedAssistantTextRef = useRef("");
  const streamFlushTimerRef = useRef<number | null>(null);
  const visitorTypingDebounceRef = useRef<number | null>(null);
  const visitorTypingStopRef = useRef<number | null>(null);
  const agentTypingStopRef = useRef<number | null>(null);
  const visitorTypingStateRef = useRef(false);
  const widgetQueryConfig = useMemo(() => parseWidgetConfigFromQuery(), []);

  const tenantId = useMemo(() => resolveTenantId(tenantIdProp), [tenantIdProp]);
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const siteHost = useMemo(
    () => (portalToken ? undefined : embedded ? resolveEmbeddedSiteHost() : window.location.host),
    [embedded, portalToken]
  );
  const runtimeAppearance = runtimeWidgetConfig?.appearance;
  const liveSupportAvailability = useMemo(
    () => normalizeLiveSupportAvailability(runtimeWidgetConfig?.live_support?.availability),
    [runtimeWidgetConfig?.live_support?.availability]
  );
  const tenantCallCtaOverride = useMemo(
    () =>
      buildCallCtaOverride(
        supportPhoneOverride ?? runtimeWidgetConfig?.supportPhone ?? widgetQueryConfig.supportPhone,
        supportCtaLabelOverride ?? runtimeWidgetConfig?.supportCtaLabel ?? widgetQueryConfig.supportCtaLabel
      ),
    [supportPhoneOverride, runtimeWidgetConfig, supportCtaLabelOverride, widgetQueryConfig]
  );
  const headerCtaConfig = useMemo(
    () =>
      normalizeHeaderCtaConfig({
        label: headerCtaLabelOverride ?? runtimeWidgetConfig?.headerCtaLabel ?? widgetQueryConfig.headerCtaLabel,
        notice: headerCtaNoticeOverride ?? runtimeWidgetConfig?.headerCtaNotice ?? widgetQueryConfig.headerCtaNotice
      }),
    [headerCtaLabelOverride, headerCtaNoticeOverride, runtimeWidgetConfig, widgetQueryConfig]
  );
  const appearance = useMemo(
    () => normalizeAppearance({ ...widgetQueryConfig.appearance, ...runtimeAppearance, ...appearanceOverride }, layoutVariant),
    [appearanceOverride, layoutVariant, runtimeAppearance, widgetQueryConfig]
  );
  const publicEmbedWidth = isPublicEmbed ? Math.max(appearance.windowWidth, 520) : appearance.windowWidth;
  const publicEmbedHeight = isPublicEmbed ? Math.max(appearance.windowHeight, 820) : appearance.windowHeight;
  const surfaceTokens = useMemo(
    () =>
      getWidgetSurfaceTokens({
        primaryColor: appearance.primaryColor,
        botBubbleColor: appearance.botBubbleColor,
        themeStyle: appearance.themeStyle
      }),
    [appearance.botBubbleColor, appearance.primaryColor, appearance.themeStyle]
  );
  const shellStyle = useMemo(
    () => {
      return {
        "--brand": appearance.primaryColor,
        "--brand-strong": darkenHex(appearance.primaryColor),
        "--user-bubble": appearance.userBubbleColor,
        "--assistant-bubble": appearance.botBubbleColor,
        "--assistant-bubble-border": surfaceTokens.assistantBubbleBorder,
        "--assistant-bubble-shadow": surfaceTokens.assistantBubbleShadow,
        "--widget-shell-bg": surfaceTokens.shellBg,
        "--widget-panel-bg": surfaceTokens.panelBg,
        "--widget-thread-bg": surfaceTokens.threadBg,
        "--widget-header-bg": surfaceTokens.headerBg,
        "--widget-header-ink": surfaceTokens.headerInk,
        "--widget-header-muted": surfaceTokens.headerMuted,
        "--widget-header-badge-bg": surfaceTokens.headerBadgeBg,
        "--widget-header-badge-color": surfaceTokens.headerBadgeColor,
        "--widget-header-action-bg": surfaceTokens.headerActionBg,
        "--widget-header-action-border": surfaceTokens.headerActionBorder,
        "--widget-header-action-color": surfaceTokens.headerActionColor,
        "--widget-header-action-hover-bg": surfaceTokens.headerActionHoverBg,
        "--widget-header-action-hover-border": surfaceTokens.headerActionHoverBorder,
        "--widget-header-avatar-bg": surfaceTokens.headerAvatarBg,
        "--widget-header-avatar-color": surfaceTokens.headerAvatarColor,
        "--widget-launcher-bg": surfaceTokens.headerBg,
        "--widget-launcher-color": surfaceTokens.headerInk,
        "--widget-launcher-icon-bg": surfaceTokens.headerActionBg,
        "--widget-launcher-icon-border": surfaceTokens.headerActionBorder,
        "--widget-composer-bg": surfaceTokens.composerBg,
        "--widget-input-bg": surfaceTokens.inputBg,
        "--widget-peek-bg": surfaceTokens.peekBg,
        "--widget-peek-border": surfaceTokens.peekBorder,
        "--widget-peek-pill-bg": surfaceTokens.peekPillBg,
        "--widget-peek-pill-color": surfaceTokens.peekPillColor,
        "--widget-line": surfaceTokens.line,
        "--ink": surfaceTokens.ink,
        "--muted": surfaceTokens.muted,
        "--widget-width": `${publicEmbedWidth}px`,
        "--widget-height": `${publicEmbedHeight}px`,
        "--widget-radius": `${appearance.borderRadius}px`,
        fontFamily: appearance.fontFamily
      } as CSSProperties;
    },
    [appearance, publicEmbedHeight, publicEmbedWidth, surfaceTokens]
  );

  const latestAssistantMeta = useMemo(() => {
    for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
      const m = messages[idx];
      if (m?.role === "assistant" && m.metadata) return m.metadata;
    }
    return null;
  }, [messages]);

  const quickReplies = latestAssistantMeta?.quick_replies ?? [];
  const visibleQuickReplies = messages.length === 0 ? appearance.quickReplies : quickReplies;
  const flightUi = latestAssistantMeta?.flight_ui ?? null;
  const serviceUi = latestAssistantMeta?.service_ui ?? null;
  const contactCapture = latestAssistantMeta?.contact_capture ?? null;
  const isContactCaptureRequired = Boolean(contactCapture?.required && !hasCapturedContact);
  const effectiveContactCapture: ContactCapture | null =
    contactCapture ??
    (showHandoffContactCapture
      ? {
          required: true,
          prompt: HANDOFF_CONTACT_CAPTURE_PROMPT,
          fields: ["name", "email", "phone"]
        }
      : null);
  const shouldShowContactCaptureForm = Boolean(
    effectiveContactCapture && ((isContactCaptureRequired && !hasCapturedContact) || showHandoffContactCapture)
  );
  const isInteractionLocked =
    isSending ||
    isSubmittingContact ||
    shouldShowContactCaptureForm ||
    conversationMode === "closed";
  const isLiveConversationMode =
    conversationMode === "handoff_pending" ||
    conversationMode === "agent_active" ||
    conversationMode === "copilot";
  const showAiTypingIndicator = isSending && !isLiveConversationMode;
  const showAgentTypingIndicator = isLiveConversationMode && isAgentTyping && agentTypingUserId !== deviceId;
  const callCta = tenantCallCtaOverride ?? latestAssistantMeta?.call_cta ?? null;
  const effectiveShellWidth = shellWidth ?? Math.min(window.innerWidth, publicEmbedWidth);
  const isCompactLayout = effectiveShellWidth < 720;
  const isPristinePublicEmbed =
    isPublicEmbed &&
    isOpen &&
    isCompactLayout &&
    messages.length === 0 &&
    !isLoadingMessages &&
    !isSending &&
    !isContactCaptureRequired &&
    !flightUi &&
    !serviceUi;
  const shouldShowNotificationCard = isPublicEmbed && !isOpen && appearance.notifEnabled;
  const publicEmbedMode = isPublicEmbed
    ? (isOpen ? (isPristinePublicEmbed ? "open-compact" : "open") : shouldShowNotificationCard ? "peek" : "launcher")
    : null;
  const shouldRenderShell = embedded ? (!isPublicEmbed || isOpen) : isOpen;
  const teaserReplies = useMemo(() => {
    const configuredNotifChips = appearance.notifChips.filter(Boolean).slice(0, 4);
    if (configuredNotifChips.length > 0) {
      return configuredNotifChips;
    }

    const fromAssistant = quickReplies.filter(Boolean).slice(0, 4);
    if (fromAssistant.length > 0) {
      return fromAssistant;
    }

    const defaults = [
      "Find flight deals",
      "Change dates",
      callCta?.label || "Talk to support"
    ];
    return Array.from(new Set(defaults)).slice(0, 4);
  }, [appearance.notifChips, quickReplies, callCta]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const key = buildContactCaptureStorageKey(tenantId, deviceId);
    const captured = window.localStorage.getItem(key) === "1";
    setHasCapturedContact(captured);
    if (captured) {
      setShowHandoffContactCapture(false);
    }
  }, [tenantId, deviceId]);

  function flushStreamedAssistantText() {
    const assistantMessageId = streamedAssistantIdRef.current;
    const pendingText = streamedAssistantTextRef.current;

    if (!assistantMessageId || !pendingText) {
      return;
    }

    streamedAssistantTextRef.current = "";
    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantMessageId
          ? { ...message, content: `${message.content}${pendingText}` }
          : message
      )
    );
  }

  function scheduleStreamFlush() {
    if (streamFlushTimerRef.current !== null) {
      return;
    }

    streamFlushTimerRef.current = window.setTimeout(() => {
      streamFlushTimerRef.current = null;
      flushStreamedAssistantText();
    }, 32);
  }

  function resetStreamBuffer() {
    if (streamFlushTimerRef.current !== null) {
      window.clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }

    streamedAssistantIdRef.current = null;
    streamedAssistantTextRef.current = "";
  }

  function clearVisitorTypingTimers() {
    if (visitorTypingDebounceRef.current !== null) {
      window.clearInterval(visitorTypingDebounceRef.current);
      visitorTypingDebounceRef.current = null;
    }
    if (visitorTypingStopRef.current !== null) {
      window.clearTimeout(visitorTypingStopRef.current);
      visitorTypingStopRef.current = null;
    }
  }

  function clearAgentTypingTimer() {
    if (agentTypingStopRef.current !== null) {
      window.clearTimeout(agentTypingStopRef.current);
      agentTypingStopRef.current = null;
    }
  }

  function clearAgentTypingState() {
    setIsAgentTyping(false);
    setAgentTypingUserId(null);
    clearAgentTypingTimer();
  }

  function canPublishVisitorTyping(chatId: string | null, mode: ConversationMode) {
    return Boolean(
      chatId &&
        isUuid(chatId) &&
        (mode === "agent_active" || mode === "handoff_pending" || mode === "copilot")
    );
  }

  async function emitVisitorTypingState(
    nextValue: boolean,
    chatIdOverride?: string | null,
    options?: { force?: boolean }
  ) {
    const chatId = chatIdOverride ?? activeChatId;
    if (!canPublishVisitorTyping(chatId, conversationMode)) {
      return;
    }

    if (!options?.force && visitorTypingStateRef.current === nextValue) {
      return;
    }

    visitorTypingStateRef.current = nextValue;
    await publishVisitorTyping({
      chatId: chatId!,
      tenantId,
      deviceId,
      isTyping: nextValue,
      backendUrl,
      authToken: portalToken,
      siteHost
    }).catch(() => undefined);
  }

  function startVisitorTypingKeepalive(chatId: string) {
    if (visitorTypingDebounceRef.current !== null) {
      window.clearInterval(visitorTypingDebounceRef.current);
      visitorTypingDebounceRef.current = null;
    }
    visitorTypingDebounceRef.current = window.setInterval(() => {
      void emitVisitorTypingState(true, chatId, { force: true });
    }, VISITOR_TYPING_KEEPALIVE_MS);
  }

  function scheduleVisitorTyping(inputValue: string) {
    if (!canPublishVisitorTyping(activeChatId, conversationMode)) {
      return;
    }

    clearVisitorTypingTimers();
    const isTyping = inputValue.trim().length > 0;
    if (!isTyping) {
      void emitVisitorTypingState(false);
      return;
    }

    void emitVisitorTypingState(true, activeChatId, { force: true });
    startVisitorTypingKeepalive(activeChatId!);
  }

  function handleComposerInputChange(value: string) {
    setInput(value);
    scheduleVisitorTyping(value);
  }

  useEffect(() => {
    if (embedded && portalToken) setIsOpen(true);
  }, [embedded, portalToken]);

  useEffect(
    () => () => {
      resetStreamBuffer();
      clearVisitorTypingTimers();
      clearAgentTypingTimer();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    return () => {
      if (!activeChatId || !isUuid(activeChatId) || !visitorTypingStateRef.current) {
        return;
      }
      visitorTypingStateRef.current = false;
      void publishVisitorTyping({
        chatId: activeChatId,
        tenantId,
        deviceId,
        isTyping: false,
        backendUrl,
        authToken: portalToken,
        siteHost
      }).catch(() => undefined);
    };
  }, [activeChatId, backendUrl, deviceId, portalToken, siteHost, tenantId]);

  useEffect(() => {
    if (!tenantId || portalToken) {
      setRuntimeWidgetConfig(null);
      return;
    }

    let cancelled = false;

    getWidgetConfig({ tenantId, backendUrl, authToken: portalToken, siteHost })
      .then((config) => {
        if (!cancelled) {
          setRuntimeWidgetConfig(config);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimeWidgetConfig(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [backendUrl, portalToken, siteHost, tenantId]);

  useEffect(() => {
    if (!isPublicEmbed) return;
    document.body.classList.add("chat-widget-embedded");
    document.documentElement.classList.add("chat-widget-embedded");
    return () => {
      document.body.classList.remove("chat-widget-embedded");
      document.documentElement.classList.remove("chat-widget-embedded");
    };
  }, [isPublicEmbed]);

  useEffect(() => {
    if (!shouldRenderShell) {
      setShellWidth(null);
      return;
    }

    const shell = shellRef.current;
    if (!shell) return;

    const updateWidth = () => {
      setShellWidth(shell.getBoundingClientRect().width || null);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(shell);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [shouldRenderShell, appearance.windowWidth]);

  useEffect(() => {
    if (!isCompactLayout && isMobileThreadsOpen) {
      setIsMobileThreadsOpen(false);
    }
  }, [isCompactLayout, isMobileThreadsOpen]);

  useEffect(() => {
    if (!isPublicEmbed || window.parent === window) return;
    const payload = {
      type: "aeroconcierge:widget-layout",
        layout: {
          widgetPosition: appearance.widgetPosition,
          launcherStyle: appearance.launcherStyle,
          launcherIconOnly: true,
          botName: appearance.botName,
          windowWidth: publicEmbedWidth,
          windowHeight: publicEmbedHeight,
          borderRadius: appearance.borderRadius
      }
    };
    window.parent.postMessage(payload, "*");
    const retryOne = window.setTimeout(() => window.parent.postMessage(payload, "*"), 160);
    const retryTwo = window.setTimeout(() => window.parent.postMessage(payload, "*"), 640);
    return () => {
      window.clearTimeout(retryOne);
      window.clearTimeout(retryTwo);
    };
  }, [
    appearance.borderRadius,
    appearance.botName,
    appearance.launcherStyle,
    appearance.widgetPosition,
    isPublicEmbed,
    publicEmbedHeight,
    publicEmbedWidth
  ]);

  useEffect(() => {
    if (!isPublicEmbed || window.parent === window) return;
    const payload = { type: "aeroconcierge:widget-state", open: isOpen, mode: publicEmbedMode };
    window.parent.postMessage(payload, "*");
    const retryOne = window.setTimeout(() => window.parent.postMessage(payload, "*"), 180);
    const retryTwo = window.setTimeout(() => window.parent.postMessage(payload, "*"), 720);
    return () => {
      window.clearTimeout(retryOne);
      window.clearTimeout(retryTwo);
    };
  }, [isPublicEmbed, isOpen, publicEmbedMode]);

  useEffect(() => {
    if (!activeChatId) {
      setConversationMode("ai_only");
      clearAgentTypingState();
      return;
    }

    const activeThread = threads.find((thread) => thread.id === activeChatId);
    if (activeThread?.conversation_mode) {
      setConversationMode(activeThread.conversation_mode);
    }
    if (isConversationRealtimeMode(activeThread?.conversation_mode ?? conversationMode)) {
      setIsAgentTyping((current) => current || isRecentAgentTyping(activeThread));
    }
  }, [activeChatId, conversationMode, threads]);

  useEffect(() => {
    if (conversationMode === "handoff_pending" || conversationMode === "agent_active") {
      setShowHandoffContactCapture(false);
    }

    if (!canPublishVisitorTyping(activeChatId, conversationMode)) {
      clearVisitorTypingTimers();
      visitorTypingStateRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, conversationMode]);

  useEffect(() => {
    if (!pendingLauncherReply || !isOpen) return;
    const nextReply = pendingLauncherReply;
    setPendingLauncherReply(null);
    void sendMessage(nextReply);
  }, [pendingLauncherReply, isOpen]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  async function refreshThreads(preferredChatId?: string) {
    setIsLoadingThreads(true);
    try {
      const nextThreads = await listChats({ tenantId, deviceId, backendUrl, authToken: portalToken, siteHost });
      setThreads(nextThreads);
      const selected = preferredChatId ?? activeChatId ?? nextThreads[0]?.id ?? null;
      if (selected) {
        const selectedThread = nextThreads.find((thread) => thread.id === selected);
        const nextMode = selectedThread?.conversation_mode ?? "ai_only";
        setConversationMode(nextMode);
        if (nextMode !== "agent_active") {
          setActiveAgent(null);
        }
        clearAgentTypingState();
        setActiveChatId(selected);
        await loadMessages(selected);
      } else {
        setMessages([]);
        setConversationMode("ai_only");
        setActiveAgent(null);
        clearAgentTypingState();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load threads");
    } finally {
      setIsLoadingThreads(false);
    }
  }

  async function loadMessages(chatId: string) {
    setIsLoadingMessages(true);
    try {
      const next = await listMessages({ chatId, tenantId, deviceId, backendUrl, authToken: portalToken, siteHost });
      const merged = mergeSyncedMessages(chatId, next, messagesRef.current);
      setMessages(merged);

      const lastAgentMessage = [...merged].reverse().find((item) => item.sender_type === "agent");
      if (lastAgentMessage) {
        const metadata = (lastAgentMessage.metadata ?? {}) as MessageMetadata;
        const agentId = lastAgentMessage.sender_id?.trim() ?? "";
        if (agentId) {
          setActiveAgent({
            id: agentId,
            name:
              typeof metadata.agent_name === "string" && metadata.agent_name.trim()
                ? metadata.agent_name.trim()
                : "Live Agent",
            avatarUrl:
              typeof metadata.agent_avatar_url === "string" ? metadata.agent_avatar_url : null
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function handleCreateChat() {
    try {
      const chat = await createChat({ tenantId, deviceId, backendUrl, authToken: portalToken, siteHost });
      setActiveChatId(chat.id);
      setConversationMode(chat.conversation_mode ?? "ai_only");
      setActiveAgent(null);
      clearAgentTypingState();
      await refreshThreads(chat.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create chat");
    }
  }

  async function handleRenameChat(thread: ChatThread, nextTitle: string) {
    try {
      await renameChat({ chatId: thread.id, tenantId, deviceId, title: nextTitle, backendUrl, authToken: portalToken, siteHost });
      await refreshThreads(thread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename chat");
    }
  }

  async function handleDeleteChat(thread: ChatThread) {
    try {
      await deleteChat({ chatId: thread.id, tenantId, deviceId, backendUrl, authToken: portalToken, siteHost });
      const fallback = activeChatId === thread.id ? null : activeChatId;
      setActiveChatId(fallback);
      await refreshThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete chat");
    }
  }

  async function openChat(chatId: string) {
    const selectedThread = threads.find((thread) => thread.id === chatId);
    const nextMode = selectedThread?.conversation_mode ?? "ai_only";
    setConversationMode(nextMode);
    if (nextMode !== "agent_active") {
      setActiveAgent(null);
    }
    clearAgentTypingState();
    setActiveChatId(chatId);
    setIsMobileThreadsOpen(false);
    await loadMessages(chatId);
  }

  async function synchronizeChatState(chatId: string) {
    const retryDelays = [0, 180, 420];
    let fallbackMessages: ChatMessage[] | null = null;
    let fallbackThreads: ChatThread[] | null = null;

    for (const delay of retryDelays) {
      if (delay > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
      }

      const [syncedMessages, syncedThreads] = await Promise.all([
        listMessages({ chatId, tenantId, deviceId, backendUrl, authToken: portalToken, siteHost }),
        listChats({ tenantId, deviceId, backendUrl, authToken: portalToken, siteHost })
      ]);

      const mergedMessages = mergeSyncedMessages(chatId, syncedMessages, messagesRef.current);
      fallbackMessages = mergedMessages;
      fallbackThreads = syncedThreads;

      if (syncedMessagesAreComplete(chatId, syncedMessages, messagesRef.current)) {
        setMessages(mergedMessages);
        setThreads(syncedThreads);
        return;
      }
    }

    if (fallbackMessages && fallbackThreads) {
      setMessages(fallbackMessages);
      setThreads(fallbackThreads);
    }
  }

  function handleContactFieldChange(field: "fullName" | "email" | "phone", value: string) {
    setContactValues((prev) => ({ ...prev, [field]: value }));
    setContactErrors((prev) => ({ ...prev, [field]: undefined }));
    setContactSuccessMessage(null);
    setError(null);
  }

  async function handleSubmitContactCapture(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setContactSuccessMessage(null);
    const shouldAutoRequestHandoff = showHandoffContactCapture;
    const validation = validateVisitorContactInput(contactValues);
    if (Object.keys(validation).length > 0) {
      setContactErrors(validation);
      return;
    }

    setIsSubmittingContact(true);
    try {
      const chatIdForCapture = activeChatId && isUuid(activeChatId) ? activeChatId : undefined;
      await submitVisitorContact({
        tenantId,
        deviceId,
        chatId: chatIdForCapture,
        fullName: contactValues.fullName.trim(),
        email: contactValues.email.trim().toLowerCase(),
        phone: normalizeVisitorPhoneInput(contactValues.phone),
        backendUrl,
        authToken: portalToken,
        siteHost
      });

      const key = buildContactCaptureStorageKey(tenantId, deviceId);
      window.localStorage.setItem(key, "1");
      setHasCapturedContact(true);
      setContactErrors({});
      if (shouldAutoRequestHandoff && activeChatId && isUuid(activeChatId)) {
        setContactSuccessMessage("Details saved. Connecting you to a live agent...");
        await handleRequestHandoff({ skipContactGate: true });
      } else {
        setContactSuccessMessage("Details saved. You can continue chatting.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact details");
    } finally {
      setIsSubmittingContact(false);
    }
  }

  async function handleRequestHandoff(options?: { skipContactGate?: boolean }) {
    if (!activeChatId || isRequestingHandoff) return;
    if (!isUuid(activeChatId)) {
      setError("Unable to connect to an agent right now. Please send one message and try again.");
      return;
    }
    if (!options?.skipContactGate && !hasCapturedContact) {
      setShowHandoffContactCapture(true);
      setContactSuccessMessage(null);
      setError("Please share your name, email, and phone before connecting to a live agent.");
      return;
    }

    setIsRequestingHandoff(true);
    setError(null);
    clearAgentTypingState();
    setActiveAgent(null);
    try {
      const result = await requestHandoff({
        chatId: activeChatId,
        tenantId,
        deviceId,
        backendUrl,
        authToken: portalToken,
        siteHost
      });
      setConversationMode(result.mode as ConversationMode);
      setShowHandoffContactCapture(false);
      if (result.mode === "agent_active" && result.assigned_agent_id) {
        setActiveAgent({
          id: result.assigned_agent_id,
          name: "Live Agent",
          avatarUrl: null
        });
      }
      if (result.mode === "handoff_pending") {
        const handoffStatusMessage =
          result.all_agents_busy && result.waiting_eta_label
            ? `All agents are currently busy. Estimated wait: ${result.waiting_eta_label}.`
            : result.all_agents_busy
              ? "All agents are currently busy. We will connect you shortly."
              : "Connecting you with a live agent...";
        const systemMsg: ChatMessage = {
          id: `system-handoff-${Date.now()}`,
          chat_id: activeChatId,
          role: "system",
          content: handoffStatusMessage,
          metadata: null,
          sender_type: "system",
          created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, systemMsg]);
      }
      await synchronizeChatState(result.chat_id || activeChatId);
    } catch (err) {
      if (err instanceof HandoffRequestError && err.requiresContactCapture) {
        const key = buildContactCaptureStorageKey(tenantId, deviceId);
        window.localStorage.removeItem(key);
        setHasCapturedContact(false);
        setShowHandoffContactCapture(true);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to request agent");
      }
    } finally {
      setIsRequestingHandoff(false);
    }
  }

  async function handleSubmitCsat(event: React.FormEvent) {
    event.preventDefault();
    if (
      !activeChatId ||
      conversationMode !== "closed" ||
      !appearance.csatEnabled ||
      csatRating < 1 ||
      isSubmittingCsat
    ) {
      return;
    }

    setIsSubmittingCsat(true);
    setCsatError(null);
    try {
      const result = await submitConversationCsat({
        chatId: activeChatId,
        tenantId,
        deviceId,
        rating: csatRating,
        feedback: csatFeedback,
        backendUrl,
        authToken: portalToken,
        siteHost
      });
      setCsatSubmitted(result.csat);
    } catch (err) {
      setCsatError(err instanceof Error ? err.message : "Failed to submit survey");
    } finally {
      setIsSubmittingCsat(false);
    }
  }

  function isConversationRealtimeMode(mode: ConversationMode) {
    return mode === "handoff_pending" || mode === "agent_active" || mode === "copilot";
  }

  function isRecentAgentTyping(thread: ChatThread | undefined) {
    if (!thread?.last_agent_typing_at) return false;
    return Date.now() - new Date(thread.last_agent_typing_at).getTime() <= AGENT_TYPING_WINDOW_MS;
  }

  function hasAgentTypingField(thread: ChatThread | undefined) {
    return Boolean(thread) && Object.prototype.hasOwnProperty.call(thread, "last_agent_typing_at");
  }

  function applyConversationMessage(payload: unknown) {
    const msg = payload as ChatMessage;
    if (!msg?.id || !msg?.content) return;

    if (msg.sender_type === "agent") {
      const metadata = (msg.metadata ?? {}) as MessageMetadata;
      const agentId = typeof msg.sender_id === "string" ? msg.sender_id : "";
      const agentName =
        typeof metadata.agent_name === "string" && metadata.agent_name.trim()
          ? metadata.agent_name.trim()
          : "Live Agent";
      const agentAvatar =
        typeof metadata.agent_avatar_url === "string" ? metadata.agent_avatar_url : null;
      if (agentId) {
        setActiveAgent({
          id: agentId,
          name: agentName,
          avatarUrl: agentAvatar
        });
      }
      clearAgentTypingState();
    }

    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    scrollToBottom();
  }

  function applyConversationModeChange(payload: unknown) {
    const data = payload as {
      mode?: ConversationMode;
      agent_id?: string;
      agent_name?: string;
      agent_avatar_url?: string;
    };
    if (data.mode) {
      setConversationMode(data.mode);
      if (data.mode !== "agent_active") {
          clearAgentTypingState();
      }
      if (data.mode === "agent_active" && data.agent_id) {
        setActiveAgent({
          id: data.agent_id,
          name: data.agent_name?.trim() || "Live Agent",
          avatarUrl: data.agent_avatar_url || null
        });
      }
      if (data.mode === "returned_to_ai" || data.mode === "ai_only" || data.mode === "closed") {
        setActiveAgent(null);
      }
    }
  }

  function applyConversationTyping(payload: unknown) {
    const data = payload as {
      chat_id?: string;
      conversationId?: string;
      actor?: "agent" | "visitor";
      user_id?: string;
      userId?: string;
      is_typing?: boolean;
    };
    const conversationId = data.conversationId ?? data.chat_id;
    const userId = data.userId ?? data.user_id;
    if (conversationId !== activeChatId) return;
    if (userId === deviceId) return;
    if (data.actor !== "agent") return;
    const active = Boolean(data.is_typing);
    setAgentTypingUserId(active ? userId ?? null : null);
    setIsAgentTyping(active);
    clearAgentTypingTimer();
    if (active) {
      agentTypingStopRef.current = window.setTimeout(() => {
        setIsAgentTyping(false);
        setAgentTypingUserId(null);
        agentTypingStopRef.current = null;
      }, 8000);
    }
  }

  // Supabase Realtime path when public frontend keys are configured.
  useEffect(() => {
    if (!supabaseClient || !activeChatId) return;
    if (!isConversationRealtimeMode(conversationMode)) {
      return;
    }

    const channel = supabaseClient.channel(`conversation:${activeChatId}`);

    channel.on("broadcast", { event: "new_message" }, (payload) => {
      applyConversationMessage(payload.payload);
    });

    channel.on("broadcast", { event: "mode_change" }, (payload) => {
      applyConversationModeChange(payload.payload);
    });

    channel.on("broadcast", { event: "typing" }, (payload) => {
      applyConversationTyping(payload.payload);
    });
    channel.on("broadcast", { event: "typing:start" }, (payload) => {
      applyConversationTyping(payload.payload);
    });
    channel.on("broadcast", { event: "typing:stop" }, (payload) => {
      applyConversationTyping(payload.payload);
    });

    channel.subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
      clearAgentTypingState();
    };
  }, [activeChatId, conversationMode]);

  // Backend event stream fallback for local/dev deployments without VITE_SUPABASE_*.
  useEffect(() => {
    if (!activeChatId || !isConversationRealtimeMode(conversationMode)) {
      return;
    }

    const url = new URL(
      `/api/conversation/${encodeURIComponent(activeChatId)}/events`,
      resolveBaseUrl(backendUrl)
    );
    url.searchParams.set("tenant_id", tenantId);
    url.searchParams.set("device_id", deviceId);

    const headers: Record<string, string> = {};
    if (portalToken) {
      headers.Authorization = `Bearer ${portalToken}`;
    }
    if (siteHost) {
      headers["X-Tenant-Site-Host"] = siteHost;
    }

    return subscribeToBackendEvents({
      url: url.toString(),
      headers,
      onEvent({ event, payload }) {
        if (event === "new_message") {
          applyConversationMessage(payload);
        } else if (event === "mode_change") {
          applyConversationModeChange(payload);
        } else if (event === "typing" || event === "typing:start" || event === "typing:stop") {
          applyConversationTyping(payload);
        }
      }
    });
  }, [activeChatId, backendUrl, conversationMode, deviceId, portalToken, siteHost, tenantId]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }
    if (
      conversationMode !== "handoff_pending" &&
      conversationMode !== "agent_active" &&
      conversationMode !== "copilot"
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void Promise.all([
        listMessages({ chatId: activeChatId, tenantId, deviceId, backendUrl, authToken: portalToken, siteHost }),
        listChats({ tenantId, deviceId, backendUrl, authToken: portalToken, siteHost })
      ])
        .then(([nextMessages, nextThreads]) => {
          setMessages((prev) => mergeSyncedMessages(activeChatId, nextMessages, prev));
          setThreads(nextThreads);
        })
        .catch(() => undefined);
    }, 18000);

    return () => window.clearInterval(interval);
  }, [activeChatId, backendUrl, conversationMode, deviceId, portalToken, siteHost, tenantId]);

  useEffect(() => {
    if (!activeChatId || !isConversationRealtimeMode(conversationMode)) {
      return;
    }

    const refreshAgentTypingState = () => {
      void listChats({ tenantId, deviceId, backendUrl, authToken: portalToken, siteHost })
        .then((nextThreads) => {
          const activeThread = nextThreads.find((thread) => thread.id === activeChatId);
          setThreads(nextThreads);
          if (hasAgentTypingField(activeThread)) {
          const active = isRecentAgentTyping(activeThread);
          setIsAgentTyping(active);
          if (!active) setAgentTypingUserId(null);
        }
        })
        .catch(() => undefined);
    };

    refreshAgentTypingState();
    const interval = window.setInterval(refreshAgentTypingState, AGENT_TYPING_POLL_MS);
    return () => window.clearInterval(interval);
  }, [activeChatId, backendUrl, conversationMode, deviceId, portalToken, siteHost, tenantId]);

  useEffect(() => {
    if (!activeChatId || conversationMode !== "closed" || !appearance.csatEnabled) {
      setCsatSubmitted(null);
      setCsatRating(0);
      setCsatFeedback("");
      setCsatError(null);
      setIsLoadingCsat(false);
      return;
    }

    let disposed = false;
    setIsLoadingCsat(true);
    setCsatError(null);

    void getConversationCsat({
      chatId: activeChatId,
      tenantId,
      deviceId,
      backendUrl,
      authToken: portalToken,
      siteHost
    })
      .then((result) => {
        if (disposed) return;
        if (result.csat) {
          setCsatSubmitted(result.csat);
          setCsatRating(result.csat.rating);
          setCsatFeedback(result.csat.feedback ?? "");
        } else {
          setCsatSubmitted(null);
          setCsatRating(0);
        }
      })
      .catch((err) => {
        if (disposed) return;
        setCsatError(err instanceof Error ? err.message : "Failed to load survey");
      })
      .finally(() => {
        if (!disposed) {
          setIsLoadingCsat(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [activeChatId, appearance.csatEnabled, backendUrl, conversationMode, deviceId, portalToken, siteHost, tenantId]);

  function scrollToBottom() {
    if (messageListRef.current) {
      requestAnimationFrame(() => {
        messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isSending || isSubmittingContact) return;
    if (shouldShowContactCaptureForm) {
      setError("Please share your contact details first to continue chatting.");
      return;
    }

    setInput(""); setError(null);
    clearVisitorTypingTimers();
    void emitVisitorTypingState(false);
    const existingChatId = activeChatId;
    const localChatId = existingChatId ?? `local-chat-${Date.now()}`;
    const clientMessageId = generateClientMessageId();

    const now = new Date().toISOString();
    const userMessage: ChatMessage = { id: `local-user-${Date.now()}`, chat_id: localChatId, role: "user", content: text, metadata: null, created_at: now };

    // If in agent_active or handoff_pending mode, just send the message (no AI streaming)
    if (conversationMode === "agent_active" || conversationMode === "handoff_pending") {
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);
      try {
        const base = (backendUrl || import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (portalToken) headers["Authorization"] = `Bearer ${portalToken}`;
        if (siteHost) headers["X-Tenant-Site-Host"] = siteHost;
        const response = await fetch(`${base}/api/chat/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            tenant_id: tenantId,
            device_id: deviceId,
            chat_id: existingChatId ?? undefined,
            client_message_id: clientMessageId,
            message: text,
            page_context: { url: window.location.href, title: document.title }
          })
        });
        if (!response.ok) throw new Error("Failed to send message");
        const json = (await response.json()) as { chat_id?: string; mode?: ConversationMode };
        if (json.mode) {
          setConversationMode(json.mode);
        }
        const finalChatId = json.chat_id || existingChatId || localChatId;
        setActiveChatId(finalChatId);
        await synchronizeChatState(finalChatId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Message send failed");
      } finally {
        setIsSending(false);
      }
      return;
    }

    const assistantMessageId = `local-assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = { id: assistantMessageId, chat_id: localChatId, role: "assistant", content: "", metadata: null, created_at: now };

    resetStreamBuffer();
    streamedAssistantIdRef.current = assistantMessageId;
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsSending(true);

    try {
      const done = await streamChat({
        backendUrl,
        payload: {
          tenant_id: tenantId,
          device_id: deviceId,
          chat_id: existingChatId ?? undefined,
          client_message_id: clientMessageId,
          message: text,
          page_context: { url: window.location.href, title: document.title }
        },
        onToken(token) {
          streamedAssistantTextRef.current += token;
          scheduleStreamFlush();
        },
        onError(message) {
          flushStreamedAssistantText();
          setMessages((prev) =>
            prev.map((messageItem) =>
              messageItem.id === assistantMessageId
                ? {
                    ...messageItem,
                    content: messageItem.content.trim() ? messageItem.content : (message || "Unable to process this request.")
                  }
                : messageItem
            )
          );
        },
        authToken: portalToken,
        siteHost
      });

      flushStreamedAssistantText();
      const finalChatId = done.chat_id || existingChatId || localChatId;
      setActiveChatId(finalChatId);
      setIsSending(false);

      try {
        await synchronizeChatState(finalChatId);
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Reply received, but chat sync failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message send failed");
    } finally {
      flushStreamedAssistantText();
      resetStreamBuffer();
      setIsSending(false);
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    await sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  useEffect(() => {
    if (isPublicEmbed && !isOpen) return;
    if (!embedded && !isOpen) return;
    refreshThreads().catch((err) => setError(err instanceof Error ? err.message : "Failed to initialize chat widget"));
  }, [embedded, isOpen, isPublicEmbed]);

  function openPublicEmbedChat(reply?: string) {
    if (reply) setPendingLauncherReply(reply);
    setIsOpen(true);
  }

  return (
    <>
      {!embedded ? (
        <button
          className={`chat-launcher chat-launcher-${appearance.widgetPosition} chat-launcher-${appearance.launcherStyle}`}
          style={shellStyle}
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "Close chat" : `Open ${appearance.botName}`}
        >
          <span className="chat-launcher-icon">
            {isOpen ? <IconClose /> : <LauncherIconGlyph icon={appearance.launcherIcon} />}
          </span>
          <span className="chat-launcher-label">{isOpen ? "Close" : appearance.botName}</span>
        </button>
      ) : null}

      {isPublicEmbed && !isOpen ? (
        <div
          className={`chat-peek-stack chat-peek-stack-${appearance.widgetPosition}${shouldShowNotificationCard ? "" : " launcher-only"}`}
          aria-label={`${appearance.botName} launcher`}
          style={shellStyle}
        >
          {shouldShowNotificationCard ? (
            <>
              <button
                type="button"
                className={`chat-peek-card chat-peek-card-${appearance.notifAnimation}`}
                onClick={() => openPublicEmbedChat()}
              >
                {headerCtaConfig.label ? <span className="chat-peek-pill">{headerCtaConfig.label}</span> : null}
                <p>{appearance.notifText || headerCtaConfig.notice}</p>
              </button>

              <div className="chat-peek-actions">
                {teaserReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    className="chat-peek-chip"
                    onClick={() => openPublicEmbedChat(reply)}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <button
            type="button"
            className={`chat-peek-launcher chat-peek-launcher-${appearance.launcherStyle} chat-peek-launcher-icon-only`}
            onClick={() => openPublicEmbedChat()}
            aria-label={`Open ${appearance.botName}`}
          >
            {shouldShowNotificationCard ? <span className="chat-peek-launcher-badge">1</span> : null}
            <span className="chat-peek-launcher-icon">
              <LauncherIconGlyph icon={appearance.launcherIcon} />
            </span>
          </button>
        </div>
      ) : null}

      {shouldRenderShell ? (
        <section
          ref={shellRef}
          className={`chat-shell chat-shell-${appearance.widgetPosition} theme-${appearance.themeStyle} bg-pattern-${appearance.bgPattern}${embedded ? " embedded" : ""}${isPublicEmbed ? " public-embed-shell" : ""}${isCompactLayout ? " compact" : ""}${isPristinePublicEmbed ? " pristine-mobile-embed" : ""}${layoutVariant === "platform" ? " chat-shell-platform" : ""}`}
          style={shellStyle}
          aria-label={`${appearance.botName} chat widget`}
        >
          {/* ── Header ── */}
          <header className="chat-header">
            <div className="chat-brand">
              {appearance.botAvatarUrl ? (
                <img src={appearance.botAvatarUrl} alt={appearance.botName} className="chat-avatar" />
              ) : (
                <div className="chat-avatar chat-avatar-fallback">{appearance.botName.slice(0, 2).toUpperCase()}</div>
              )}
              <div className="chat-brand-info">
                <strong>
                  {appearance.botName}
                  {headerCtaConfig.label ? <span className="chat-header-badge">{headerCtaConfig.label}</span> : null}
                </strong>
                <p>
                  <span className={`chat-presence-dot ${liveSupportAvailability}`} />
                  {getLiveSupportLabel(liveSupportAvailability)}
                </p>
              </div>
            </div>

            <div className="chat-header-actions">
              {callCta ? (
                <a href={callCta.tel} className="header-call-btn" aria-label={callCta.label} title={callCta.label}>
                  <IconPhone />
                </a>
              ) : null}
              {isCompactLayout ? (
                <button className="thread-toggle" type="button" onClick={() => setIsMobileThreadsOpen((v) => !v)}>
                  <IconMenu />
                  Chats
                </button>
              ) : null}
            </div>
          </header>

          {/* ── Body ── */}
          <div className="chat-body">
            {/* Thread sidebar */}
            <aside className={`thread-sidebar ${isCompactLayout ? (isMobileThreadsOpen ? "mobile-open" : "mobile-hidden") : ""}`}>
              <div className="thread-actions">
                <button type="button" onClick={handleCreateChat}><IconPlus /> New Chat</button>
              </div>
              {isLoadingThreads ? <p className="thread-hint">Loading chats…</p> : null}
              <ul>
                {threads.map((thread) => (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    isActive={thread.id === activeChatId}
                    onOpen={() => openChat(thread.id)}
                    onRename={(title) => handleRenameChat(thread, title)}
                    onDelete={() => handleDeleteChat(thread)}
                  />
                ))}
              </ul>
            </aside>

            {/* Message panel */}
            <main className="message-panel">
              <div className="messages" ref={messageListRef}>
                {isLoadingMessages ? <p className="thread-hint">Loading messages…</p> : null}
                {messages.length === 0 && !isLoadingMessages ? (
                  <div className="welcome-card">
                    <span className="welcome-card-label">{appearance.botName}</span>
                    <p>{appearance.welcomeMessage}</p>
                  </div>
                ) : null}
                {conversationMode === "agent_active" && activeAgent ? (
                  <div className="message-row system">
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        margin: "6px auto 8px",
                        padding: "6px 12px",
                        borderRadius: "999px",
                        background: "var(--assistant-bubble, #edf6f9)",
                        border: "1px solid var(--assistant-bubble-border, rgba(0,0,0,0.08))",
                        fontSize: "0.78rem",
                        color: "var(--muted, #666)"
                      }}
                    >
                      {activeAgent.avatarUrl ? (
                        <img
                          src={activeAgent.avatarUrl}
                          alt={activeAgent.name}
                          style={{ width: 18, height: 18, borderRadius: "999px", objectFit: "cover" }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "999px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.65rem",
                            background: "var(--brand, #006d77)",
                            color: "#fff"
                          }}
                        >
                          {activeAgent.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {activeAgent.name} is now helping you
                    </div>
                  </div>
                ) : null}
                {messages.map((message) => {
                  if (message.role === "system") {
                    return (
                      <div key={message.id} className="message-row system">
                        <div style={{
                          textAlign: "center",
                          fontSize: "0.78rem",
                          color: "var(--muted, #888)",
                          padding: "8px 16px",
                          fontStyle: "italic"
                        }}>
                          {message.content}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <MessageBubble key={message.id} message={message} callCtaOverride={callCta} appearance={appearance} />
                  );
                })}
                {showAiTypingIndicator ? <TypingIndicator /> : null}
                {showAgentTypingIndicator ? (
                  <TypingIndicator />
                ) : null}
                {conversationMode === "handoff_pending" && !isSending && !showAgentTypingIndicator ? (
                  <div className="message-row assistant">
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 16px",
                      borderRadius: "12px",
                      background: "var(--assistant-bubble, #edf6f9)",
                      fontSize: "0.85rem",
                      color: "var(--muted, #666)"
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Waiting for an agent to join...
                    </div>
                  </div>
                ) : null}
                {/* Quick replies inline – appear right after the last bot message */}
                {!isInteractionLocked && visibleQuickReplies.length > 0 ? (
                  <div className="inline-quick-replies">
                    {visibleQuickReplies.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        disabled={isInteractionLocked}
                        onClick={() => sendMessage(reply)}
                      >{reply}</button>
                    ))}
                  </div>
                ) : null}
              </div>

              {flightUi ? (
                <GuidedFlightInput
                  flightUi={flightUi} disabled={isInteractionLocked} onSubmit={sendMessage}
                  tenantId={tenantId} backendUrl={backendUrl} authToken={portalToken} siteHost={siteHost}
                />
              ) : null}

              {serviceUi ? (
                <GuidedServiceInput serviceUi={serviceUi} disabled={isInteractionLocked} onSubmit={sendMessage} />
              ) : null}

              {effectiveContactCapture && shouldShowContactCaptureForm ? (
                <ContactCaptureForm
                  capture={effectiveContactCapture}
                  values={contactValues}
                  errors={contactErrors}
                  disabled={isSending || isRequestingHandoff}
                  submitting={isSubmittingContact}
                  successMessage={contactSuccessMessage}
                  onChange={handleContactFieldChange}
                  onSubmit={handleSubmitContactCapture}
                />
              ) : null}

              {conversationMode === "closed" && appearance.csatEnabled ? (
                <form className="guided-input" onSubmit={handleSubmitCsat}>
                  <p>{appearance.csatPrompt}</p>
                  {isLoadingCsat ? (
                    <small className="guided-help">Loading survey...</small>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={`csat-${value}`}
                            type="button"
                            disabled={isSubmittingCsat || Boolean(csatSubmitted)}
                            onClick={() => setCsatRating(value)}
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "10px",
                              border: `1px solid ${csatRating >= value ? "var(--brand, #006d77)" : "rgba(10,10,15,0.15)"}`,
                              background: csatRating >= value ? "var(--brand, #006d77)" : "white",
                              color: csatRating >= value ? "white" : "var(--ink, #111)",
                              fontWeight: 700
                            }}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={csatFeedback}
                        onChange={(event) => setCsatFeedback(event.target.value)}
                        placeholder="Optional feedback"
                        rows={2}
                        disabled={isSubmittingCsat || Boolean(csatSubmitted)}
                        style={{
                          width: "100%",
                          borderRadius: "10px",
                          border: "1px solid rgba(10,10,15,0.12)",
                          padding: "8px 10px",
                          resize: "vertical",
                          fontFamily: "inherit"
                        }}
                      />
                      {!csatSubmitted ? (
                        <button
                          type="submit"
                          className="guided-submit"
                          disabled={isSubmittingCsat || csatRating < 1}
                          style={{ marginTop: "8px" }}
                        >
                          {isSubmittingCsat ? "Submitting..." : "Submit rating"}
                        </button>
                      ) : (
                        <small className="guided-help">Thanks for the feedback.</small>
                      )}
                      {csatError ? <small className="error-text">{csatError}</small> : null}
                    </>
                  )}
                </form>
              ) : null}

              <form className="composer" onSubmit={handleSend}>
                <div className="composer-textarea-wrap">
                  <textarea
                    value={input}
                    placeholder={
                      shouldShowContactCaptureForm
                        ? "Share your contact details to continue..."
                        : conversationMode === "agent_active"
                          ? "Type a message to the agent…"
                          : conversationMode === "handoff_pending"
                            ? "Waiting for an agent…"
                            : conversationMode === "closed"
                              ? "Conversation closed"
                            : "Type a message… (Enter to send)"
                    }
                    onChange={(e) => handleComposerInputChange(e.target.value)}
                    onBlur={() => {
                      clearVisitorTypingTimers();
                      void emitVisitorTypingState(false);
                    }}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isInteractionLocked}
                  />
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {activeChatId && conversationMode === "ai_only" && messages.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => void handleRequestHandoff()}
                      disabled={isRequestingHandoff || isSending}
                      aria-label="Talk to agent"
                      title="Talk to a live agent"
                      style={{
                        background: "none",
                        border: "1.5px solid var(--brand, #006d77)",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        color: "var(--brand, #006d77)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        opacity: isRequestingHandoff ? 0.6 : 1
                      }}
                    >
                      {isRequestingHandoff ? "Connecting…" : "🧑‍💼 Agent"}
                    </button>
                  ) : null}
                  <button type="submit" className="composer-send-btn" disabled={isInteractionLocked || !input.trim()} aria-label="Send message">
                    <IconSend />
                  </button>
                </div>
              </form>


              {error ? <p className="error-text">{error}</p> : null}
            </main>
          </div>
        </section>
      ) : null}

      {isPublicEmbed && isOpen ? (
        <div className={`chat-embed-dock chat-embed-dock-${appearance.widgetPosition}`} style={shellStyle}>
          <div className="chat-embed-powered">Powered by {poweredByBrand}</div>
          <button
            type="button"
            className="chat-peek-launcher chat-peek-launcher-open"
            onClick={() => setIsOpen(false)}
            aria-label={`Close ${appearance.botName}`}
          >
            <IconChevronDown />
          </button>
        </div>
      ) : null}
    </>
  );
}
