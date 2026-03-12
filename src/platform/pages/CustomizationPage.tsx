import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { LauncherStyle, PlatformService, WidgetPosition } from "@/platform/types";
import { usePlatformAuth } from "@/platform/state/auth";

const services: PlatformService[] = ["flights", "hotels", "cars", "cruises"];
const launcherStyles: LauncherStyle[] = ["rounded", "pill", "square", "minimal"];
const fontFamilies = ["Manrope", "Inter", "Poppins", "DM Sans", "Montserrat"];

type Tab = "brand" | "colors" | "layout" | "content";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "brand", label: "Brand", icon: "✦" },
  { id: "colors", label: "Colors", icon: "◉" },
  { id: "layout", label: "Layout", icon: "⊞" },
  { id: "content", label: "Content", icon: "✏" }
];

type Template = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  primaryColor: string;
  userBubbleColor: string;
  botBubbleColor: string;
  fontFamily: string;
  launcherStyle: LauncherStyle;
  borderRadius: number;
  botName: string;
  welcomeMessage: string;
  accentGradient: string; // for the card visual
};

const TEMPLATES: Template[] = [
  {
    id: "ocean",
    name: "Ocean Breeze",
    description: "Cool teal tones – calm & professional",
    emoji: "🌊",
    primaryColor: "#006d77",
    userBubbleColor: "#006d77",
    botBubbleColor: "#edf6f9",
    fontFamily: "Manrope",
    launcherStyle: "rounded",
    borderRadius: 20,
    botName: "Aqua Assistant",
    welcomeMessage: "Hello! How can I help you today?",
    accentGradient: "linear-gradient(135deg, #006d77, #83c5be)"
  },
  {
    id: "midnight",
    name: "Midnight Pro",
    description: "Deep navy – sleek & corporate",
    emoji: "🌙",
    primaryColor: "#1e2d5a",
    userBubbleColor: "#253571",
    botBubbleColor: "#f0f2fb",
    fontFamily: "Inter",
    launcherStyle: "square",
    borderRadius: 14,
    botName: "ProAssist",
    welcomeMessage: "Welcome. I'm here to assist you.",
    accentGradient: "linear-gradient(135deg, #1e2d5a, #4a69bd)"
  },
  {
    id: "coral",
    name: "Coral Warmth",
    description: "Vibrant coral – energetic & friendly",
    emoji: "🪸",
    primaryColor: "#e05a47",
    userBubbleColor: "#e05a47",
    botBubbleColor: "#fff5f4",
    fontFamily: "Poppins",
    launcherStyle: "pill",
    borderRadius: 24,
    botName: "Coral Chat",
    welcomeMessage: "Hi there! Great to see you 👋",
    accentGradient: "linear-gradient(135deg, #e05a47, #f4a261)"
  },
  {
    id: "forest",
    name: "Forest Fresh",
    description: "Rich greens – natural & trustworthy",
    emoji: "🌿",
    primaryColor: "#2d6a4f",
    userBubbleColor: "#2d6a4f",
    botBubbleColor: "#f0faf4",
    fontFamily: "DM Sans",
    launcherStyle: "rounded",
    borderRadius: 18,
    botName: "EcoGuide",
    welcomeMessage: "Welcome! How may I assist you today?",
    accentGradient: "linear-gradient(135deg, #2d6a4f, #74c69d)"
  },
  {
    id: "royal",
    name: "Royal Purple",
    description: "Deep violet – premium & luxurious",
    emoji: "💜",
    primaryColor: "#6a0dad",
    userBubbleColor: "#6a0dad",
    botBubbleColor: "#f8f4ff",
    fontFamily: "Montserrat",
    launcherStyle: "pill",
    borderRadius: 22,
    botName: "LuxeBot",
    welcomeMessage: "Welcome to our premium service.",
    accentGradient: "linear-gradient(135deg, #6a0dad, #c77dff)"
  },
  {
    id: "mono",
    name: "Monochrome",
    description: "Clean black & white – minimal & bold",
    emoji: "⬛",
    primaryColor: "#1a1a2e",
    userBubbleColor: "#1a1a2e",
    botBubbleColor: "#f5f5f5",
    fontFamily: "Inter",
    launcherStyle: "square",
    borderRadius: 10,
    botName: "Minimal AI",
    welcomeMessage: "Hello. What do you need?",
    accentGradient: "linear-gradient(135deg, #1a1a2e, #6c6c8a)"
  }
];

export default function CustomizationPage() {
  const { selectedTenant, updateTenantProfile, loading, error, setError } = usePlatformAuth();
  const profile = selectedTenant?.business_profile;
  const [activeTab, setActiveTab] = useState<Tab>("brand");

  const [businessType, setBusinessType] = useState(profile?.business_type || "general_travel");
  const [supportedServices, setSupportedServices] = useState<PlatformService[]>(profile?.supported_services || ["flights"]);
  const [supportPhone, setSupportPhone] = useState(profile?.support_phone || "");
  const [supportEmail, setSupportEmail] = useState(profile?.support_email || "");
  const [supportCtaLabel, setSupportCtaLabel] = useState(profile?.support_cta_label || "Connect with a specialist");
  const [headerCtaLabel, setHeaderCtaLabel] = useState(profile?.header_cta_label || "New");
  const [headerCtaNotice, setHeaderCtaNotice] = useState(
    profile?.header_cta_notice || "Hi! I am your AI assistant. Ask me anything about your trip."
  );
  const [businessDescription, setBusinessDescription] = useState(profile?.business_description || "");
  const [primaryColor, setPrimaryColor] = useState(profile?.primary_color || "#006d77");
  const [userBubbleColor, setUserBubbleColor] = useState(profile?.user_bubble_color || "#006d77");
  const [botBubbleColor, setBotBubbleColor] = useState(profile?.bot_bubble_color || "#edf6f9");
  const [fontFamily, setFontFamily] = useState(profile?.font_family || "Manrope");
  const [widgetPosition, setWidgetPosition] = useState<WidgetPosition>(profile?.widget_position || "right");
  const [launcherStyle, setLauncherStyle] = useState<LauncherStyle>(profile?.launcher_style || "rounded");
  const [windowWidth, setWindowWidth] = useState(profile?.window_width || 380);
  const [windowHeight, setWindowHeight] = useState(profile?.window_height || 640);
  const [borderRadius, setBorderRadius] = useState(profile?.border_radius || 18);
  const [welcomeMessage, setWelcomeMessage] = useState(profile?.welcome_message || "Welcome. How can I help today?");
  const [botName, setBotName] = useState(profile?.bot_name || "AeroConcierge");
  const [botAvatarUrl, setBotAvatarUrl] = useState(profile?.bot_avatar_url || "");
  const [success, setSuccess] = useState("");
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setBusinessType(profile.business_type || "general_travel");
    setSupportedServices(profile.supported_services || ["flights"]);
    setSupportPhone(profile.support_phone || "");
    setSupportEmail(profile.support_email || "");
    setSupportCtaLabel(profile.support_cta_label || "Connect with a specialist");
    setHeaderCtaLabel(profile.header_cta_label || "New");
    setHeaderCtaNotice(profile.header_cta_notice || "Hi! I am your AI assistant. Ask me anything about your trip.");
    setBusinessDescription(profile.business_description || "");
    setPrimaryColor(profile.primary_color || "#006d77");
    setUserBubbleColor(profile.user_bubble_color || "#006d77");
    setBotBubbleColor(profile.bot_bubble_color || "#edf6f9");
    setFontFamily(profile.font_family || "Manrope");
    setWidgetPosition(profile.widget_position || "right");
    setLauncherStyle(profile.launcher_style || "rounded");
    setWindowWidth(profile.window_width || 380);
    setWindowHeight(profile.window_height || 640);
    setBorderRadius(profile.border_radius || 18);
    setWelcomeMessage(profile.welcome_message || "Welcome. How can I help today?");
    setBotName(profile.bot_name || "AeroConcierge");
    setBotAvatarUrl(profile.bot_avatar_url || "");
  }, [profile]);

  function applyTemplate(t: Template) {
    setPrimaryColor(t.primaryColor);
    setUserBubbleColor(t.userBubbleColor);
    setBotBubbleColor(t.botBubbleColor);
    setFontFamily(t.fontFamily);
    setLauncherStyle(t.launcherStyle);
    setBorderRadius(t.borderRadius);
    setBotName(t.botName);
    setWelcomeMessage(t.welcomeMessage);
    setAppliedTemplate(t.id);
  }

  const previewStyle = useMemo(
    () =>
      ({
        "--preview-primary": primaryColor,
        "--preview-user": userBubbleColor,
        "--preview-bot": botBubbleColor,
        "--preview-radius": `${borderRadius}px`,
        fontFamily
      }) as CSSProperties,
    [primaryColor, userBubbleColor, botBubbleColor, borderRadius, fontFamily]
  );

  if (!selectedTenant) {
    return <section className="platform-panel"><p>Select a tenant to configure chatbot behavior.</p></section>;
  }

  const tenantId = selectedTenant.tenant_id;

  function toggleService(service: PlatformService) {
    setSupportedServices((prev) => {
      if (prev.includes(service)) {
        const next = prev.filter((s) => s !== service);
        return next.length > 0 ? next : ["flights"];
      }
      return [...prev, service];
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSuccess(""); setError("");
    try {
      await updateTenantProfile({
        tenant_id: tenantId, business_type: businessType, supported_services: supportedServices,
        support_phone: supportPhone || undefined, support_email: supportEmail || undefined,
        support_cta_label: supportCtaLabel, header_cta_label: headerCtaLabel, header_cta_notice: headerCtaNotice,
        business_description: businessDescription || undefined,
        primary_color: primaryColor, user_bubble_color: userBubbleColor, bot_bubble_color: botBubbleColor,
        font_family: fontFamily, widget_position: widgetPosition, launcher_style: launcherStyle,
        window_width: windowWidth, window_height: windowHeight, border_radius: borderRadius,
        welcome_message: welcomeMessage, bot_name: botName, bot_avatar_url: botAvatarUrl || undefined
      });
      setSuccess("Customization saved! The portal preview and widget will use these settings.");
    } catch { /* handled by context */ }
  }

  return (
    <div className="platform-grid two-col">
      {/* ── Left: Form ─────────────────────────────────── */}
      <section className="platform-panel">
        <h2>Customize your chatbot</h2>
        <p>Start with a template or fine-tune every detail below.</p>

        {/* Template Grid */}
        <div className="cust-section-title">Quick templates</div>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`template-card${appliedTemplate === t.id ? " selected" : ""}`}
              onClick={() => applyTemplate(t)}
            >
              <div className="template-swatch" style={{ background: t.accentGradient }}>
                <span className="template-emoji">{t.emoji}</span>
              </div>
              <div className="template-info">
                <strong>{t.name}</strong>
                <span>{t.description}</span>
              </div>
              {appliedTemplate === t.id && <div className="template-check">✓</div>}
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="cust-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`cust-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="cust-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="platform-form-grid two-col">
          {/* ── Brand Tab ── */}
          {activeTab === "brand" && (
            <>
              <label>
                Bot name
                <input value={botName} onChange={(e) => setBotName(e.target.value)} maxLength={80} placeholder="My Assistant" />
              </label>
              <label>
                Business type
                <input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="travel / e-commerce / support" />
              </label>
              <label>
                Avatar URL
                <input value={botAvatarUrl} onChange={(e) => setBotAvatarUrl(e.target.value)} placeholder="https://…/avatar.png" />
              </label>
              <label>
                Font family
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                  {fontFamilies.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label>
                Support phone
                <input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} placeholder="+1 800 000 0000" />
              </label>
              <label>
                Support email
                <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@company.com" />
              </label>
              <label>
                CTA label
                <input value={supportCtaLabel} onChange={(e) => setSupportCtaLabel(e.target.value)} />
              </label>
              <label>
                Launcher badge label
                <input value={headerCtaLabel} onChange={(e) => setHeaderCtaLabel(e.target.value)} maxLength={40} />
              </label>
              <div className="full">
                <span className="label-inline">Enabled services</span>
                <div className="chip-row">
                  {services.map((service) => (
                    <button key={service} type="button"
                      className={supportedServices.includes(service) ? "chip active" : "chip"}
                      onClick={() => toggleService(service)}>
                      {service}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Colors Tab ── */}
          {activeTab === "colors" && (
            <>
              <label>
                Primary color
                <div className="color-field">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                  <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                </div>
              </label>
              <label>
                User bubble color
                <div className="color-field">
                  <input type="color" value={userBubbleColor} onChange={(e) => setUserBubbleColor(e.target.value)} />
                  <input value={userBubbleColor} onChange={(e) => setUserBubbleColor(e.target.value)} />
                </div>
              </label>
              <label>
                Bot bubble color
                <div className="color-field">
                  <input type="color" value={botBubbleColor} onChange={(e) => setBotBubbleColor(e.target.value)} />
                  <input value={botBubbleColor} onChange={(e) => setBotBubbleColor(e.target.value)} />
                </div>
              </label>
              <div className="full cust-color-preview-row">
                <div className="cust-bubble-preview-user" style={{ background: userBubbleColor }}>User message looks like this</div>
                <div className="cust-bubble-preview-bot" style={{ background: botBubbleColor, border: `1px solid rgba(0,0,0,0.08)` }}>Bot message looks like this</div>
              </div>
            </>
          )}

          {/* ── Layout Tab ── */}
          {activeTab === "layout" && (
            <>
              <label>
                Widget position
                <select value={widgetPosition} onChange={(e) => setWidgetPosition(e.target.value as WidgetPosition)}>
                  <option value="right">Right side</option>
                  <option value="left">Left side</option>
                </select>
              </label>
              <label>
                Launcher style
                <select value={launcherStyle} onChange={(e) => setLauncherStyle(e.target.value as LauncherStyle)}>
                  {launcherStyles.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </label>
              <label>
                Window width (px)
                <div className="slider-field">
                  <input type="range" min={320} max={520} value={windowWidth} onChange={(e) => setWindowWidth(Number(e.target.value))} />
                  <span className="slider-val">{windowWidth}px</span>
                </div>
              </label>
              <label>
                Window height (px)
                <div className="slider-field">
                  <input type="range" min={520} max={860} value={windowHeight} onChange={(e) => setWindowHeight(Number(e.target.value))} />
                  <span className="slider-val">{windowHeight}px</span>
                </div>
              </label>
              <label className="full">
                Border radius (px)
                <div className="slider-field">
                  <input type="range" min={8} max={36} value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} />
                  <span className="slider-val">{borderRadius}px</span>
                </div>
              </label>
            </>
          )}

          {/* ── Content Tab ── */}
          {activeTab === "content" && (
            <>
              <label className="full">
                Launcher notice text
                <textarea
                  rows={3}
                  value={headerCtaNotice}
                  onChange={(e) => setHeaderCtaNotice(e.target.value)}
                  placeholder="Hi! I am your AI assistant. Ask me anything about your trip."
                />
              </label>
              <label className="full">
                Welcome message
                <textarea rows={3} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="How can I help you today?" />
              </label>
              <label className="full">
                Business description
                <textarea rows={5} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="Describe your business and what the chatbot should help with…" />
              </label>
            </>
          )}

          {error ? <p className="platform-error full">{error}</p> : null}
          {success ? <p className="platform-success full">{success}</p> : null}

          <button className="platform-primary-btn full" disabled={loading} type="submit">
            {loading ? "Saving…" : "Save customization"}
          </button>
        </form>
      </section>

      {/* ── Right: Live Preview ──────────────────────────── */}
      <section className="platform-panel">
        <h3>Live preview</h3>
        <p>Updates instantly as you edit. Interactive chatbot preview is on the <em>My Chatbot</em> page.</p>

        <div className={`customization-preview preview-${widgetPosition} preview-launcher-${launcherStyle}`} style={previewStyle}>
          {/* Preview header */}
          <div className="customization-preview-header">
            <div className="customization-preview-brand">
              {botAvatarUrl ? (
                <img src={botAvatarUrl} alt={botName} className="customization-preview-avatar" />
              ) : (
                <div className="customization-preview-avatar fallback">{botName.slice(0, 2).toUpperCase()}</div>
              )}
              <div>
                <strong>{botName}</strong>
                <p className="customization-preview-online">
                  <span className="customization-preview-dot" />
                  Online
                </p>
              </div>
            </div>
            <div className="customization-preview-header-cta">
              <span className="customization-preview-badge">{headerCtaLabel}</span>
              <p>{headerCtaNotice}</p>
            </div>
          </div>

          {/* Preview messages */}
          <div className="customization-preview-body">
            <div className="customization-preview-message bot">
              <p>{welcomeMessage}</p>
            </div>
            <div className="customization-preview-message user">
              <p>I'd like help with a booking.</p>
            </div>
            <div className="customization-preview-message bot">
              <p>Of course! I'll help you right away. Could you share your travel dates?</p>
            </div>
            <div className="customization-preview-message user">
              <p>Next Friday, returning Sunday.</p>
            </div>
            {/* Typing indicator preview */}
            <div className="customization-preview-typing">
              <span /><span /><span />
            </div>
          </div>

          {/* Preview composer */}
          <div className="customization-preview-composer">
            <span>Type a message…</span>
            <div className="customization-preview-send">➤</div>
          </div>

          {/* Launcher button preview */}
          <div className={`customization-preview-launcher launcher-${launcherStyle}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {botName}
          </div>
        </div>

        {/* Color swatches summary */}
        <div className="cust-swatch-row">
          <div className="cust-swatch" style={{ background: primaryColor }} title={`Primary: ${primaryColor}`} />
          <div className="cust-swatch" style={{ background: userBubbleColor }} title={`User bubble: ${userBubbleColor}`} />
          <div className="cust-swatch" style={{ background: botBubbleColor, border: "1px solid #ddd" }} title={`Bot bubble: ${botBubbleColor}`} />
          <span className="cust-swatch-label">{fontFamily} · r{borderRadius} · {launcherStyle}</span>
        </div>
      </section>
    </div>
  );
}
