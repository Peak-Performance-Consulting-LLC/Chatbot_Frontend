import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createChat,
  deleteChat,
  getWidgetConfig,
  listChats,
  listMessages,
  renameChat,
  searchPlaceSuggestions,
  streamChat,
  type WidgetConfig
} from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device";
import { resolveTenantId } from "@/lib/tenant";
import type { ChatMessage, ChatThread, MessageMetadata } from "@/types";

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
type CallCta = NonNullable<MessageMetadata["call_cta"]>;
type HeaderCtaConfig = {
  label: string;
  notice: string;
};
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
  notifChips: ["I have a question", "Tell me more"]
};

const defaultHeaderCtaConfig: HeaderCtaConfig = {
  label: "",
  notice: "Hi! I am your AI assistant. Ask me anything about your trip."
};
const poweredByBrand = "PPConsultings";

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
        : defaultAppearance.notifChips
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

  useEffect(() => {
    setAirportText(""); setDateText("");
    setAdults(flightUi.state?.passengers?.adults ?? 1);
    setChildren(flightUi.state?.passengers?.children ?? 0);
    setInfants(flightUi.state?.passengers?.infants ?? 0);
    setTripTypeValue(flightUi.state?.trip_type ?? "one-way");
    setCabinValue(flightUi.state?.cabin_class ? formatCabin(flightUi.state.cabin_class) : "Economy");
    setSelectedAirportCode(""); setLiveAirportSuggestions([]);
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
      <div className="guided-input">
        <p>Passengers</p>
        <div className="passenger-grid">
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
        <small className="guided-help">Adjust adults, children, and infants, then apply the passenger mix.</small>
        <button type="button" className="guided-submit" disabled={disabled}
          onClick={() => onSubmit(`${adults} adults, ${children} children, ${infants} infants`)}>
          Use passengers
        </button>
      </div>
    );
  }

  if (flightUi.next_slot === "origin" || flightUi.next_slot === "destination") {
    const dataListId = `${flightUi.next_slot}-airport-options`;
    return (
      <div className="guided-input">
        <p>{flightUi.next_slot === "origin" ? "Departure airport" : "Destination airport"}</p>
        <small className="guided-help">Search by city or airport, then choose from the suggestion dropdown.</small>
        <div className="guided-inline">
          <input list={dataListId} value={airportText}
            onChange={(e) => { setAirportText(e.target.value); setSelectedAirportCode(""); }}
            placeholder="Type city or airport code" />
          <datalist id={dataListId}>
            {airportOptions.map((a) => <option key={`${dataListId}-${a.code}`} value={a.code} label={a.label} />)}
          </datalist>
          <button type="button" disabled={disabled || !airportText.trim()} onClick={() => onSubmit(airportText.trim())}>
            Use typed value
          </button>
        </div>
        <div className="guided-inline">
          <select value={selectedAirportCode} onChange={(e) => setSelectedAirportCode(e.target.value)} disabled={airportOptions.length === 0}>
            <option value="">{airportOptions.length === 0 ? "No suggestions yet" : "Choose a suggested airport"}</option>
            {airportOptions.map((a) => <option key={`${flightUi.next_slot}-sel-${a.code}`} value={a.code}>{a.label}</option>)}
          </select>
          <button type="button" disabled={disabled || !selectedAirportCode} onClick={() => onSubmit(selectedAirportCode)}>
            Use selected
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

      {!renaming && !confirmDelete && (
        <div className="thread-row-actions">
          <button type="button" onClick={startRename}>Rename</button>
          <button type="button" className="danger" onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      )}

      {confirmDelete && (
        <div className="thread-delete-confirm">
          <span>Delete?</span>
          <button type="button" className="confirm-yes" onClick={() => { setConfirmDelete(false); onDelete(); }}>Yes</button>
          <button type="button" className="confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
        </div>
      )}
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
  const [showLauncherNotification, setShowLauncherNotification] = useState(isPublicEmbed);
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

  const shellRef = useRef<HTMLElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const streamedAssistantIdRef = useRef<string | null>(null);
  const streamedAssistantTextRef = useRef("");
  const streamFlushTimerRef = useRef<number | null>(null);
  const widgetQueryConfig = useMemo(() => parseWidgetConfigFromQuery(), []);

  const tenantId = useMemo(() => resolveTenantId(tenantIdProp), [tenantIdProp]);
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const siteHost = useMemo(
    () => (portalToken ? undefined : embedded ? resolveEmbeddedSiteHost() : window.location.host),
    [embedded, portalToken]
  );
  const runtimeAppearance = runtimeWidgetConfig?.appearance;
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
  const shellStyle = useMemo(
    () => {
      const darkTheme = appearance.themeStyle === "dark";
      const glassTheme = appearance.themeStyle === "glass";
      const clayTheme = appearance.themeStyle === "clay";
      const minimalTheme = appearance.themeStyle === "minimal";

      return {
        "--brand": appearance.primaryColor,
        "--brand-strong": darkenHex(appearance.primaryColor),
        "--user-bubble": appearance.userBubbleColor,
        "--assistant-bubble": appearance.botBubbleColor,
        "--assistant-bubble-border":
          glassTheme
            ? "1px solid rgba(255,255,255,0.34)"
            : minimalTheme
              ? "1px solid rgba(10,10,15,0.08)"
              : darkTheme
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(10,10,15,0.08)",
        "--assistant-bubble-shadow":
          clayTheme
            ? "3px 3px 0 rgba(10,10,15,0.08), 0 8px 18px rgba(10,10,15,0.08)"
            : "0 2px 8px rgba(10,10,15,0.06)",
        "--widget-shell-bg":
          darkTheme
            ? "linear-gradient(180deg, rgba(12,18,30,0.98), rgba(8,10,22,0.995))"
            : glassTheme
              ? "linear-gradient(180deg, rgba(255,255,255,0.58), rgba(238,244,255,0.44))"
              : clayTheme
                ? "linear-gradient(180deg, #fff6ef, #f7efe4)"
                : minimalTheme
                  ? "#ffffff"
                  : "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(248,250,251,0.985))",
        "--widget-panel-bg":
          darkTheme ? "#0b1220" : glassTheme ? "rgba(255,255,255,0.26)" : clayTheme ? "#f7efe4" : minimalTheme ? "#fafafa" : "#f8fafa",
        "--widget-thread-bg":
          darkTheme ? "#111827" : glassTheme ? "rgba(255,255,255,0.2)" : clayTheme ? "#f4eadf" : minimalTheme ? "#ffffff" : "#f8fafa",
        "--widget-header-bg":
          darkTheme ? "rgba(10,16,28,0.92)" : glassTheme ? "rgba(255,255,255,0.34)" : clayTheme ? "rgba(255,247,239,0.92)" : minimalTheme ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.97)",
        "--widget-composer-bg":
          darkTheme ? "rgba(10,16,28,0.98)" : glassTheme ? "rgba(255,255,255,0.28)" : "#ffffff",
        "--widget-input-bg":
          darkTheme ? "rgba(255,255,255,0.06)" : glassTheme ? "rgba(255,255,255,0.55)" : minimalTheme ? "#ffffff" : "#f8fafa",
        "--widget-peek-bg":
          darkTheme ? "rgba(12,18,30,0.96)" : glassTheme ? "rgba(255,255,255,0.68)" : "#ffffff",
        "--widget-peek-border":
          darkTheme ? "rgba(255,255,255,0.1)" : glassTheme ? "rgba(255,255,255,0.28)" : "rgba(26,92,92,0.12)",
        "--widget-peek-pill-bg":
          darkTheme ? "rgba(255,255,255,0.08)" : "rgba(26,92,92,0.1)",
        "--widget-peek-pill-color":
          darkTheme ? "rgba(255,255,255,0.88)" : appearance.primaryColor,
        "--widget-line":
          darkTheme ? "rgba(255,255,255,0.08)" : glassTheme ? "rgba(255,255,255,0.28)" : "rgba(10,10,15,0.08)",
        "--ink": darkTheme ? "#f3f6fb" : "#0a0a0f",
        "--muted": darkTheme ? "rgba(237,242,247,0.72)" : "rgba(10,10,15,0.6)",
        "--widget-width": `${publicEmbedWidth}px`,
        "--widget-height": `${publicEmbedHeight}px`,
        "--widget-radius": `${appearance.borderRadius}px`,
        fontFamily: appearance.fontFamily
      } as CSSProperties;
    },
    [appearance, publicEmbedHeight, publicEmbedWidth]
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
    !flightUi &&
    !serviceUi;
  const shouldShowNotificationCard = showLauncherNotification && appearance.notifEnabled;
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

  useEffect(() => {
    if (embedded && portalToken) setIsOpen(true);
  }, [embedded, portalToken]);

  useEffect(() => {
    if (!appearance.notifEnabled) {
      setShowLauncherNotification(false);
    }
  }, [appearance.notifEnabled]);

  useEffect(() => () => resetStreamBuffer(), []);

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
      if (selected) { setActiveChatId(selected); await loadMessages(selected); }
      else setMessages([]);
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
      setMessages(next);
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
    setActiveChatId(chatId);
    setIsMobileThreadsOpen(false);
    await loadMessages(chatId);
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isSending) return;

    setInput(""); setError(null);
    const existingChatId = activeChatId;
    const localChatId = existingChatId ?? `local-chat-${Date.now()}`;

    const now = new Date().toISOString();
    const userMessage: ChatMessage = { id: `local-user-${Date.now()}`, chat_id: localChatId, role: "user", content: text, metadata: null, created_at: now };
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
        const [syncedMessages, syncedThreads] = await Promise.all([
          listMessages({ chatId: finalChatId, tenantId, deviceId, backendUrl, authToken: portalToken, siteHost }),
          listChats({ tenantId, deviceId, backendUrl, authToken: portalToken, siteHost })
        ]);
        setMessages(syncedMessages);
        setThreads(syncedThreads);
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
    if (isPublicEmbed) setShowLauncherNotification(false);
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
            className={`chat-peek-launcher chat-peek-launcher-${appearance.launcherStyle}`}
            onClick={() => openPublicEmbedChat()}
            aria-label={`Open ${appearance.botName}`}
          >
            {appearance.notifEnabled ? <span className="chat-peek-launcher-badge">1</span> : null}
            <span className="chat-peek-launcher-icon">
              <LauncherIconGlyph icon={appearance.launcherIcon} />
            </span>
            <span className="chat-peek-launcher-label">{appearance.botName}</span>
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
                  <span className="chat-online-dot" />
                  Online
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
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} callCtaOverride={callCta} appearance={appearance} />
                ))}
                {isSending ? <TypingIndicator /> : null}
                {/* Quick replies inline – appear right after the last bot message */}
                {!isSending && visibleQuickReplies.length > 0 ? (
                  <div className="inline-quick-replies">
                    {visibleQuickReplies.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        disabled={isSending}
                        onClick={() => sendMessage(reply)}
                      >{reply}</button>
                    ))}
                  </div>
                ) : null}
              </div>

              {flightUi ? (
                <GuidedFlightInput
                  flightUi={flightUi} disabled={isSending} onSubmit={sendMessage}
                  tenantId={tenantId} backendUrl={backendUrl} authToken={portalToken} siteHost={siteHost}
                />
              ) : null}

              {serviceUi ? (
                <GuidedServiceInput serviceUi={serviceUi} disabled={isSending} onSubmit={sendMessage} />
              ) : null}

              <form className="composer" onSubmit={handleSend}>
                <div className="composer-textarea-wrap">
                  <textarea
                    value={input}
                    placeholder="Type a message… (Enter to send)"
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isSending}
                  />
                  {/* <span className="composer-hint">Shift+Enter for newline</span> */}
                </div>
                <button type="submit" className="composer-send-btn" disabled={isSending || !input.trim()} aria-label="Send message">
                  <IconSend />
                </button>
              </form>


              {error ? <p className="error-text">{error}</p> : null}
            </main>
          </div>
        </section>
      ) : null}

      {isPublicEmbed && isOpen ? (
        <div className={`chat-embed-dock chat-embed-dock-${appearance.widgetPosition}`}>
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
