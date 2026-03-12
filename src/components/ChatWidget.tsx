import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createChat,
  deleteChat,
  listChats,
  listMessages,
  renameChat,
  searchPlaceSuggestions,
  streamChat
} from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device";
import { resolveTenantId } from "@/lib/tenant";
import type { ChatMessage, ChatThread, MessageMetadata } from "@/types";

type ChatWidgetProps = {
  tenantId?: string;
  backendUrl?: string;
  embedded?: boolean;
  portalToken?: string;
  supportPhoneOverride?: string | null;
  supportCtaLabelOverride?: string | null;
  appearanceOverride?: Partial<ChatWidgetAppearance>;
};

type FlightUi = NonNullable<MessageMetadata["flight_ui"]>;
type ServiceUi = NonNullable<MessageMetadata["service_ui"]>;
type CallCta = NonNullable<MessageMetadata["call_cta"]>;
type ChatWidgetAppearance = {
  primaryColor: string;
  userBubbleColor: string;
  botBubbleColor: string;
  fontFamily: string;
  widgetPosition: "left" | "right";
  launcherStyle: "rounded" | "pill" | "square" | "minimal";
  windowWidth: number;
  windowHeight: number;
  borderRadius: number;
  botName: string;
  welcomeMessage: string;
  botAvatarUrl?: string | null;
};

const defaultAppearance: ChatWidgetAppearance = {
  primaryColor: "#006d77",
  userBubbleColor: "#006d77",
  botBubbleColor: "#edf6f9",
  fontFamily: "Manrope",
  widgetPosition: "right",
  launcherStyle: "rounded",
  windowWidth: 380,
  windowHeight: 640,
  borderRadius: 18,
  botName: "AeroConcierge",
  welcomeMessage: "Welcome. How can I help today?",
  botAvatarUrl: null
};

function normalizeAppearance(input?: Partial<ChatWidgetAppearance> | null): ChatWidgetAppearance {
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
    windowWidth:
      typeof input?.windowWidth === "number" ? Math.min(520, Math.max(320, Math.round(input.windowWidth))) : defaultAppearance.windowWidth,
    windowHeight:
      typeof input?.windowHeight === "number" ? Math.min(860, Math.max(520, Math.round(input.windowHeight))) : defaultAppearance.windowHeight,
    borderRadius:
      typeof input?.borderRadius === "number" ? Math.min(36, Math.max(8, Math.round(input.borderRadius))) : defaultAppearance.borderRadius,
    botName: input?.botName?.trim() || defaultAppearance.botName,
    welcomeMessage: input?.welcomeMessage?.trim() || defaultAppearance.welcomeMessage,
    botAvatarUrl: input?.botAvatarUrl?.trim() || defaultAppearance.botAvatarUrl
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

function parseAppearanceFromQuery(): Partial<ChatWidgetAppearance> {
  const params = new URLSearchParams(window.location.search);
  const width = Number(params.get("window_width"));
  const height = Number(params.get("window_height"));
  const radius = Number(params.get("border_radius"));

  return {
    primaryColor: params.get("primary_color") ?? undefined,
    userBubbleColor: params.get("user_bubble_color") ?? undefined,
    botBubbleColor: params.get("bot_bubble_color") ?? undefined,
    fontFamily: params.get("font_family") ?? undefined,
    widgetPosition: params.get("widget_position") === "left" ? "left" : "right",
    launcherStyle:
      params.get("launcher_style") === "pill" ||
      params.get("launcher_style") === "square" ||
      params.get("launcher_style") === "minimal"
        ? (params.get("launcher_style") as ChatWidgetAppearance["launcherStyle"])
        : undefined,
    windowWidth: Number.isFinite(width) ? width : undefined,
    windowHeight: Number.isFinite(height) ? height : undefined,
    borderRadius: Number.isFinite(radius) ? radius : undefined,
    botName: params.get("bot_name") ?? undefined,
    welcomeMessage: params.get("welcome_message") ?? undefined,
    botAvatarUrl: params.get("avatar_url") ?? undefined
  };
}

function resolveEmbeddedSiteHost() {
  if (!document.referrer) {
    return undefined;
  }

  try {
    return new URL(document.referrer).host;
  } catch {
    return undefined;
  }
}

function sanitizePhoneNumber(value: string) {
  return value.replace(/[^+\d]/g, "");
}

function buildCallCtaOverride(number?: string | null, label?: string | null): CallCta | null {
  const trimmedNumber = number?.trim();
  if (!trimmedNumber) {
    return null;
  }

  return {
    number: trimmedNumber,
    tel: `tel:${sanitizePhoneNumber(trimmedNumber)}`,
    label: label?.trim() || "Connect with a specialist"
  };
}

function resolveCallCta(
  messageCta?: MessageMetadata["call_cta"] | null,
  overrideCta?: CallCta | null
): CallCta | null {
  return overrideCta ?? messageCta ?? null;
}

function getRenderableMessageContent(message: ChatMessage) {
  const content = message.content.trim();
  if (message.role !== "assistant" || !message.metadata?.flight_deals?.length) {
    return content;
  }

  return "Here are the best live fares I found. Compare the cards below, or tell me what you want to change.";
}

function formatDealDateTime(value?: string) {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatStops(stops?: number) {
  if (typeof stops !== "number") {
    return "Stops not listed";
  }

  if (stops === 0) {
    return "Non-stop";
  }

  return `${stops} stop${stops > 1 ? "s" : ""}`;
}

function formatCabin(cabin?: string) {
  if (!cabin) {
    return "Cabin not listed";
  }

  return cabin
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatThreadTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function FlightDeals({
  metadata,
  callCtaOverride
}: {
  metadata: MessageMetadata;
  callCtaOverride?: CallCta | null;
}) {
  if (!metadata.flight_deals || metadata.flight_deals.length === 0) {
    return null;
  }

  const offerLabel = "Call now to get up to 40% off";
  const callCta = resolveCallCta(metadata.call_cta, callCtaOverride);

  return (
    <div className="deal-grid">
      {callCta ? (
        <div className="deal-offer-banner">
          <div>
            <strong>{offerLabel}</strong>
            <p>Published fares are shown below. Better unpublished options may be available by phone.</p>
          </div>
          <a href={callCta.tel} className="deal-banner-cta">
            {callCta.number}
          </a>
        </div>
      ) : null}

      {metadata.flight_deals.map((deal) => (
        <article key={deal.id} className="deal-card">
          <div className="deal-head">
            <div className="deal-airline">
              {deal.airline_logo ? <img src={deal.airline_logo} alt={deal.airline} className="deal-logo" /> : null}
              <div>
                <h4>{deal.airline}</h4>
                <p className="deal-route">{deal.origin} to {deal.destination}</p>
              </div>
            </div>
            <div className="deal-price-wrap">
              <p className="deal-price">{deal.total_price}</p>
              <span className="deal-price-caption">Live fare</span>
            </div>
          </div>

          <div className="deal-meta-grid">
            <div>
              <span>Depart</span>
              <strong>{formatDealDateTime(deal.departure_time)}</strong>
            </div>
            <div>
              <span>Arrive</span>
              <strong>{formatDealDateTime(deal.arrival_time)}</strong>
            </div>
            <div>
              <span>Stops</span>
              <strong>{formatStops(deal.stops)}</strong>
            </div>
            <div>
              <span>Cabin</span>
              <strong>{formatCabin(deal.cabin_class)}</strong>
            </div>
          </div>

          {deal.duration ? <p className="deal-duration">Duration {deal.duration}</p> : null}

          {callCta ? (
            <a href={callCta.tel} className="deal-card-cta">
              {offerLabel}
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function QuickReplies({
  quickReplies,
  disabled,
  onSelect
}: {
  quickReplies: string[];
  disabled: boolean;
  onSelect: (value: string) => void;
}) {
  if (quickReplies.length === 0) {
    return null;
  }

  return (
    <div className="quick-replies">
      {quickReplies.map((reply) => (
        <button key={reply} type="button" disabled={disabled} onClick={() => onSelect(reply)}>
          {reply}
        </button>
      ))}
    </div>
  );
}

function ServiceRequestSummary({ metadata }: { metadata: MessageMetadata }) {
  if (!metadata.service_request) {
    return null;
  }

  const entries = Object.entries(metadata.service_request.payload ?? {});
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="service-summary">
      <h4>{metadata.service_request.service.toUpperCase()} request</h4>
      <ul>
        {entries.map(([key, value]) => (
          <li key={key}>
            <span>{key.replace(/_/g, " ")}</span>
            <strong>{String(value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuidedFlightInput({
  flightUi,
  disabled,
  onSubmit,
  tenantId,
  backendUrl,
  authToken,
  siteHost
}: {
  flightUi: FlightUi;
  disabled: boolean;
  onSubmit: (value: string) => void;
  tenantId: string;
  backendUrl?: string;
  authToken?: string;
  siteHost?: string;
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
    setAirportText("");
    setDateText("");
    setAdults(flightUi.state?.passengers?.adults ?? 1);
    setChildren(flightUi.state?.passengers?.children ?? 0);
    setInfants(flightUi.state?.passengers?.infants ?? 0);
    setTripTypeValue(flightUi.state?.trip_type ?? "one-way");
    setCabinValue(flightUi.state?.cabin_class ? formatCabin(flightUi.state.cabin_class) : "Economy");
    setSelectedAirportCode("");
    setLiveAirportSuggestions([]);
  }, [flightUi.next_slot, flightUi.state?.passengers?.adults, flightUi.state?.passengers?.children, flightUi.state?.passengers?.infants]);

  useEffect(() => {
    if (flightUi.next_slot !== "origin" && flightUi.next_slot !== "destination") {
      return;
    }

    const query = airportText.trim();
    if (query.length < 2) {
      setLiveAirportSuggestions([]);
      return;
    }

    let isCancelled = false;
    const timer = window.setTimeout(() => {
      searchPlaceSuggestions({
        tenantId,
        query,
        backendUrl,
        authToken,
        siteHost
      })
        .then((suggestions) => {
          if (!isCancelled) {
            setLiveAirportSuggestions(suggestions);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setLiveAirportSuggestions([]);
          }
        });
    }, 220);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [airportText, flightUi.next_slot, tenantId, backendUrl, authToken, siteHost]);

  const airportOptions = useMemo(() => {
    const merged = [...liveAirportSuggestions, ...(flightUi.airport_suggestions ?? [])];
    const map = new Map<string, { code: string; label: string }>();

    for (const item of merged) {
      const code = item.code?.trim().toUpperCase();
      if (!code || map.has(code)) {
        continue;
      }

      map.set(code, {
        code,
        label: item.label
      });
    }

    return Array.from(map.values()).slice(0, 8);
  }, [liveAirportSuggestions, flightUi.airport_suggestions]);

  useEffect(() => {
    if (flightUi.next_slot !== "origin" && flightUi.next_slot !== "destination") {
      return;
    }

    setSelectedAirportCode((current) => {
      if (current && airportOptions.some((option) => option.code === current)) {
        return current;
      }
      return airportOptions[0]?.code ?? "";
    });
  }, [airportOptions, flightUi.next_slot]);

  if (flightUi.phase !== "collecting" || !flightUi.next_slot) {
    return null;
  }

  if (flightUi.next_slot === "trip_type") {
    return (
      <div className="guided-input">
        <p>Trip type</p>
        <div className="guided-inline">
          <select value={tripTypeValue} onChange={(event) => setTripTypeValue(event.target.value)}>
            <option value="one-way">One-way</option>
            <option value="round-trip">Round-trip</option>
          </select>
          <button type="button" disabled={disabled} onClick={() => onSubmit(tripTypeValue)}>
            Use trip type
          </button>
        </div>
      </div>
    );
  }

  if (flightUi.next_slot === "cabin_class") {
    return (
      <div className="guided-input">
        <p>Cabin class</p>
        <div className="guided-inline">
          <select value={cabinValue} onChange={(event) => setCabinValue(event.target.value)}>
            <option value="Economy">Economy</option>
            <option value="Premium Economy">Premium Economy</option>
            <option value="Business">Business</option>
            <option value="First">First</option>
          </select>
          <button type="button" disabled={disabled} onClick={() => onSubmit(cabinValue)}>
            Use cabin
          </button>
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
          <input
            type="date"
            value={dateText}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDateText(event.target.value)}
          />
          <button
            type="button"
            disabled={disabled || !dateText}
            onClick={() => onSubmit(dateText)}
          >
            Use date
          </button>
        </div>
      </div>
    );
  }

  if (flightUi.next_slot === "passengers") {
    return (
      <div className="guided-input">
        <p>Passengers</p>
        <div className="passenger-grid">
          <label>
            Adults
            <select value={adults} onChange={(event) => setAdults(Number(event.target.value))}>
              {Array.from({ length: 9 }, (_, idx) => idx + 1).map((value) => (
                <option key={`adults-${value}`} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Children
            <select value={children} onChange={(event) => setChildren(Number(event.target.value))}>
              {Array.from({ length: 7 }, (_, idx) => idx).map((value) => (
                <option key={`children-${value}`} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Infants
            <select value={infants} onChange={(event) => setInfants(Number(event.target.value))}>
              {Array.from({ length: 5 }, (_, idx) => idx).map((value) => (
                <option key={`infants-${value}`} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <small className="guided-help">Adjust adults, children, and infants, then apply the passenger mix.</small>
        <button
          type="button"
          className="guided-submit"
          disabled={disabled}
          onClick={() => onSubmit(`Adults ${adults}, Children ${children}, Infants ${infants}`)}
        >
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
          <input
            list={dataListId}
            value={airportText}
            onChange={(event) => {
              setAirportText(event.target.value);
              setSelectedAirportCode("");
            }}
            placeholder="Type city or airport code"
          />
          <datalist id={dataListId}>
            {airportOptions.map((airport) => (
              <option
                key={`${dataListId}-${airport.code}`}
                value={airport.code}
                label={airport.label}
              />
            ))}
          </datalist>
          <button
            type="button"
            disabled={disabled || !airportText.trim()}
            onClick={() => onSubmit(airportText.trim())}
          >
            Use typed value
          </button>
        </div>

        <div className="guided-inline">
          <select
            value={selectedAirportCode}
            onChange={(event) => setSelectedAirportCode(event.target.value)}
            disabled={airportOptions.length === 0}
          >
            <option value="">{airportOptions.length === 0 ? "No suggestions yet" : "Choose a suggested airport"}</option>
            {airportOptions.map((airport) => (
              <option key={`${flightUi.next_slot}-select-${airport.code}`} value={airport.code}>
                {airport.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={disabled || !selectedAirportCode}
            onClick={() => onSubmit(selectedAirportCode)}
          >
            Use selected airport
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function GuidedServiceInput({
  serviceUi,
  disabled,
  onSubmit
}: {
  serviceUi: ServiceUi;
  disabled: boolean;
  onSubmit: (value: string) => void;
}) {
  const [dateText, setDateText] = useState("");
  const [numberText, setNumberText] = useState(1);
  const [textValue, setTextValue] = useState("");

  useEffect(() => {
    setDateText("");
    setNumberText(Math.max(1, serviceUi.next_slot_min ?? 1));
    setTextValue("");
  }, [serviceUi.next_slot, serviceUi.next_slot_min]);

  if (serviceUi.phase !== "collecting" || !serviceUi.next_slot) {
    return null;
  }

  const slotLabel = serviceUi.next_slot.replace(/_/g, " ");

  if (serviceUi.next_slot_type === "option") {
    return (
      <div className="guided-input">
        <p>Select {slotLabel}</p>
        <div className="chip-row">
          {(serviceUi.options ?? []).map((option) => (
            <button key={option} type="button" disabled={disabled} onClick={() => onSubmit(option)}>
              {option}
            </button>
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
          <input
            type="date"
            value={dateText}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDateText(event.target.value)}
          />
          <button type="button" disabled={disabled || !dateText} onClick={() => onSubmit(dateText)}>
            Use date
          </button>
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
          <select value={numberText} onChange={(event) => setNumberText(Number(event.target.value))}>
            {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((value) => (
              <option key={`${serviceUi.next_slot}-${value}`} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button type="button" disabled={disabled} onClick={() => onSubmit(String(numberText))}>
            Use value
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="guided-input">
      <p>{slotLabel}</p>
      <div className="guided-inline">
        <input value={textValue} onChange={(event) => setTextValue(event.target.value)} placeholder={`Enter ${slotLabel}`} />
        <button type="button" disabled={disabled || !textValue.trim()} onClick={() => onSubmit(textValue.trim())}>
          Use value
        </button>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  callCtaOverride
}: {
  message: ChatMessage;
  callCtaOverride?: CallCta | null;
}) {
  const isUser = message.role === "user";
  const renderableContent = getRenderableMessageContent(message);
  const hasFlightDeals = Boolean(message.metadata?.flight_deals?.length);
  const shouldRenderMarkdown = Boolean(renderableContent) && !hasFlightDeals;

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
        <button
          className="copy-btn"
          type="button"
          onClick={() => navigator.clipboard.writeText(renderableContent || message.content.trim())}
          title="Copy message"
        >
          Copy
        </button>

        {hasFlightDeals ? <p className="deal-summary-text">{renderableContent}</p> : null}
        {shouldRenderMarkdown ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{renderableContent}</ReactMarkdown> : null}

        {message.metadata ? <FlightDeals metadata={message.metadata} callCtaOverride={callCtaOverride} /> : null}
        {message.metadata ? <ServiceRequestSummary metadata={message.metadata} /> : null}
      </div>
    </div>
  );
}

export function ChatWidget({
  tenantId: tenantIdProp,
  backendUrl,
  embedded = false,
  portalToken,
  supportPhoneOverride,
  supportCtaLabelOverride,
  appearanceOverride
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileThreadsOpen, setIsMobileThreadsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);

  const messageListRef = useRef<HTMLDivElement | null>(null);

  const tenantId = useMemo(() => resolveTenantId(tenantIdProp), [tenantIdProp]);
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const siteHost = useMemo(
    () => (portalToken ? undefined : embedded ? resolveEmbeddedSiteHost() : window.location.host),
    [embedded, portalToken]
  );
  const tenantCallCtaOverride = useMemo(
    () => buildCallCtaOverride(supportPhoneOverride, supportCtaLabelOverride),
    [supportPhoneOverride, supportCtaLabelOverride]
  );
  const appearance = useMemo(
    () => normalizeAppearance({ ...parseAppearanceFromQuery(), ...appearanceOverride }),
    [appearanceOverride]
  );
  const shellStyle = useMemo(
    () =>
      ({
        "--brand": appearance.primaryColor,
        "--brand-strong": darkenHex(appearance.primaryColor),
        "--user-bubble": appearance.userBubbleColor,
        "--assistant-bubble": appearance.botBubbleColor,
        "--widget-width": `${appearance.windowWidth}px`,
        "--widget-height": `${appearance.windowHeight}px`,
        "--widget-radius": `${appearance.borderRadius}px`,
        fontFamily: appearance.fontFamily
      }) as CSSProperties,
    [appearance]
  );

  const latestAssistantMeta = useMemo(() => {
    for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
      const message = messages[idx];
      if (message?.role === "assistant" && message.metadata) {
        return message.metadata;
      }
    }

    return null;
  }, [messages]);

  const quickReplies = latestAssistantMeta?.quick_replies ?? [];
  const flightUi = latestAssistantMeta?.flight_ui ?? null;
  const serviceUi = latestAssistantMeta?.service_ui ?? null;
  const callCta = tenantCallCtaOverride ?? latestAssistantMeta?.call_cta ?? null;

  useEffect(() => {
    if (embedded) {
      setIsOpen(true);
    }
  }, [embedded]);

  useEffect(() => {
    const listener = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  async function refreshThreads(preferredChatId?: string) {
    setIsLoadingThreads(true);

    try {
      const nextThreads = await listChats({ tenantId, deviceId, backendUrl, authToken: portalToken, siteHost });
      setThreads(nextThreads);

      const selected = preferredChatId ?? activeChatId ?? nextThreads[0]?.id ?? null;
      if (selected) {
        setActiveChatId(selected);
        await loadMessages(selected);
      } else {
        setMessages([]);
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
      const nextMessages = await listMessages({ chatId, tenantId, deviceId, backendUrl, authToken: portalToken, siteHost });
      setMessages(nextMessages);
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

  async function handleRenameChat(thread: ChatThread) {
    const nextTitle = window.prompt("Rename chat", thread.title)?.trim();
    if (!nextTitle) {
      return;
    }

    try {
      await renameChat({
        chatId: thread.id,
        tenantId,
        deviceId,
        title: nextTitle,
        backendUrl,
        authToken: portalToken,
        siteHost
      });
      await refreshThreads(thread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename chat");
    }
  }

  async function handleDeleteChat(thread: ChatThread) {
    const confirmed = window.confirm(`Delete chat \"${thread.title}\"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteChat({
        chatId: thread.id,
        tenantId,
        deviceId,
        backendUrl,
        authToken: portalToken,
        siteHost
      });

      const fallbackChat = activeChatId === thread.id ? null : activeChatId;
      setActiveChatId(fallbackChat);
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
    if (!text || isSending) {
      return;
    }

    setInput("");
    setError(null);

    let chatId = activeChatId;

    if (!chatId) {
      const chat = await createChat({ tenantId, deviceId, backendUrl, authToken: portalToken, siteHost });
      chatId = chat.id;
      setActiveChatId(chatId);
      await refreshThreads(chatId);
    }

    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      chat_id: chatId,
      role: "user",
      content: text,
      metadata: null,
      created_at: new Date().toISOString()
    };

    const assistantMessageId = `local-assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      chat_id: chatId,
      role: "assistant",
      content: "",
      metadata: null,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsSending(true);

    try {
      const done = await streamChat({
        backendUrl,
        payload: {
          tenant_id: tenantId,
          device_id: deviceId,
          chat_id: chatId,
          message: text,
          page_context: {
            url: window.location.href,
            title: document.title
          }
        },
        onToken(token) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: `${message.content}${token}` }
                : message
            )
          );
        },
        onError(message) {
          setMessages((prev) =>
            prev.map((item) =>
              item.id === assistantMessageId
                ? { ...item, content: message || "Unable to process this request." }
                : item
            )
          );
        },
        authToken: portalToken,
        siteHost
      });

      const finalChatId = done.chat_id || chatId;
      setActiveChatId(finalChatId);

      const syncedMessages = await listMessages({
        chatId: finalChatId,
        tenantId,
        deviceId,
        backendUrl,
        authToken: portalToken,
        siteHost
      });
      setMessages(syncedMessages);

      const syncedThreads = await listChats({ tenantId, deviceId, backendUrl, authToken: portalToken, siteHost });
      setThreads(syncedThreads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message send failed");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    await sendMessage(input);
  }

  useEffect(() => {
    const shouldLoad = embedded || isOpen;
    if (!shouldLoad) {
      return;
    }

    refreshThreads().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to initialize chat widget");
    });
  }, [embedded, isOpen]);

  const shouldRenderShell = embedded || isOpen;

  return (
    <>
      {!embedded ? (
        <button
          className={`chat-launcher chat-launcher-${appearance.widgetPosition} chat-launcher-${appearance.launcherStyle}`}
          style={shellStyle}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? "Close" : appearance.botName}
        </button>
      ) : null}

      {shouldRenderShell ? (
        <section
          className={`chat-shell chat-shell-${appearance.widgetPosition}${embedded ? " embedded" : ""}`}
          style={shellStyle}
          aria-label={`${appearance.botName} chat widget`}
        >
          <header className="chat-header">
            <div className="chat-brand">
              {appearance.botAvatarUrl ? (
                <img src={appearance.botAvatarUrl} alt={appearance.botName} className="chat-avatar" />
              ) : (
                <div className="chat-avatar chat-avatar-fallback">{appearance.botName.slice(0, 2).toUpperCase()}</div>
              )}
              <div>
                <strong>{appearance.botName}</strong>
                <p>{tenantId}</p>
              </div>
            </div>

            <div className="chat-header-actions">
              {callCta ? (
                <a href={callCta.tel} className="header-call-btn">
                  {callCta.label}
                </a>
              ) : null}
              {isMobile ? (
                <button
                  className="thread-toggle"
                  type="button"
                  onClick={() => setIsMobileThreadsOpen((value) => !value)}
                >
                  Threads
                </button>
              ) : null}
            </div>
          </header>

          <div className="chat-body">
            <aside className={`thread-sidebar ${isMobile ? (isMobileThreadsOpen ? "mobile-open" : "mobile-hidden") : ""}`}>
              <div className="thread-actions">
                <button type="button" onClick={handleCreateChat}>New Chat</button>
              </div>

              {isLoadingThreads ? <p className="thread-hint">Loading chats...</p> : null}

              <ul>
                {threads.map((thread) => (
                  <li key={thread.id} className={thread.id === activeChatId ? "active" : ""}>
                    <button type="button" onClick={() => openChat(thread.id)}>
                      <span>{thread.title}</span>
                      <small>{formatThreadTime(thread.last_message_at)}</small>
                    </button>

                    <div className="thread-row-actions">
                      <button type="button" onClick={() => handleRenameChat(thread)}>Rename</button>
                      <button type="button" onClick={() => handleDeleteChat(thread)}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>

            <main className="message-panel">
              <div className="messages" ref={messageListRef}>
                {isLoadingMessages ? <p className="thread-hint">Loading messages...</p> : null}

                {messages.length === 0 && !isLoadingMessages ? (
                  <div className="welcome-card">
                    <h3>{appearance.botName}</h3>
                    <p>{appearance.welcomeMessage}</p>
                  </div>
                ) : null}

                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} callCtaOverride={callCta} />
                ))}
              </div>

              <QuickReplies quickReplies={quickReplies} disabled={isSending} onSelect={sendMessage} />

              {flightUi ? (
                <GuidedFlightInput
                  flightUi={flightUi}
                  disabled={isSending}
                  onSubmit={sendMessage}
                  tenantId={tenantId}
                  backendUrl={backendUrl}
                  authToken={portalToken}
                  siteHost={siteHost}
                />
              ) : null}

              {serviceUi ? (
                <GuidedServiceInput serviceUi={serviceUi} disabled={isSending} onSubmit={sendMessage} />
              ) : null}

              <form className="composer" onSubmit={handleSend}>
                <textarea
                  value={input}
                  placeholder="Type your message"
                  onChange={(event) => setInput(event.target.value)}
                  rows={2}
                />

                <button disabled={isSending || !input.trim()} type="submit">
                  {isSending ? "Sending..." : "Send"}
                </button>
              </form>

              {error ? <p className="error-text">{error}</p> : null}
            </main>
          </div>
        </section>
      ) : null}
    </>
  );
}
