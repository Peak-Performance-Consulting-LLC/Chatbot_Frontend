import { useEffect, useMemo, useRef, useState } from "react";
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
  supportPhoneOverride?: string | null;
  supportCtaLabelOverride?: string | null;
};

type FlightUi = NonNullable<MessageMetadata["flight_ui"]>;
type ServiceUi = NonNullable<MessageMetadata["service_ui"]>;
type CallCta = NonNullable<MessageMetadata["call_cta"]>;

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
  backendUrl
}: {
  flightUi: FlightUi;
  disabled: boolean;
  onSubmit: (value: string) => void;
  tenantId: string;
  backendUrl?: string;
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
        backendUrl
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
  }, [airportText, flightUi.next_slot, tenantId, backendUrl]);

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

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`message-bubble ${isUser ? "user" : "assistant"}`}>
        <button
          className="copy-btn"
          type="button"
          onClick={() => navigator.clipboard.writeText(renderableContent)}
          title="Copy message"
        >
          Copy
        </button>

        <ReactMarkdown remarkPlugins={[remarkGfm]}>{renderableContent}</ReactMarkdown>

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
  supportPhoneOverride,
  supportCtaLabelOverride
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
  const tenantCallCtaOverride = useMemo(
    () => buildCallCtaOverride(supportPhoneOverride, supportCtaLabelOverride),
    [supportPhoneOverride, supportCtaLabelOverride]
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
      const nextThreads = await listChats({ tenantId, deviceId, backendUrl });
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
      const nextMessages = await listMessages({ chatId, tenantId, deviceId, backendUrl });
      setMessages(nextMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function handleCreateChat() {
    try {
      const chat = await createChat({ tenantId, deviceId, backendUrl });
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
        backendUrl
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
        backendUrl
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
      const chat = await createChat({ tenantId, deviceId, backendUrl });
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
        }
      });

      const finalChatId = done.chat_id || chatId;
      setActiveChatId(finalChatId);

      const syncedMessages = await listMessages({
        chatId: finalChatId,
        tenantId,
        deviceId,
        backendUrl
      });
      setMessages(syncedMessages);

      const syncedThreads = await listChats({ tenantId, deviceId, backendUrl });
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
        <button className="chat-launcher" onClick={() => setIsOpen((value) => !value)}>
          {isOpen ? "Close" : "Concierge"}
        </button>
      ) : null}

      {shouldRenderShell ? (
        <section className={`chat-shell${embedded ? " embedded" : ""}`} aria-label="Aero concierge chat widget">
          <header className="chat-header">
            <div>
              <strong>AeroConcierge</strong>
              <p>{tenantId}</p>
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
                  <p className="empty-state">Start with a greeting or ask for flights, hotels, cars, or cruises.</p>
                ) : null}

                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} callCtaOverride={tenantCallCtaOverride} />
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
