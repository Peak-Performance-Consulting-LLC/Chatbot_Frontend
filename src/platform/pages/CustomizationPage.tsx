import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { LauncherStyle, PlatformService, WidgetPosition } from "@/platform/types";
import { usePlatformAuth } from "@/platform/state/auth";

const services: PlatformService[] = ["flights", "hotels", "cars", "cruises"];
const launcherStyles: LauncherStyle[] = ["rounded", "pill", "square", "minimal"];
const fontFamilies = ["Manrope", "Inter", "Poppins", "DM Sans", "Montserrat"];

type Tab = "brand" | "colors" | "layout" | "content";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "brand",   label: "Brand",   icon: "✦" },
  { id: "colors",  label: "Colors",  icon: "◉" },
  { id: "layout",  label: "Layout",  icon: "⊞" },
  { id: "content", label: "Content", icon: "✏" },
];

type Template = {
  id: string; name: string; description: string; emoji: string;
  primaryColor: string; userBubbleColor: string; botBubbleColor: string;
  fontFamily: string; launcherStyle: LauncherStyle; borderRadius: number;
  botName: string; welcomeMessage: string; accentGradient: string;
};

const TEMPLATES: Template[] = [
  { id: "ocean",    name: "Ocean Breeze",  description: "Cool teal tones – calm & professional",        emoji: "🌊", primaryColor: "#006d77", userBubbleColor: "#006d77", botBubbleColor: "#edf6f9", fontFamily: "Manrope",    launcherStyle: "rounded", borderRadius: 20, botName: "Aqua Assistant", welcomeMessage: "Hello! How can I help you today?",        accentGradient: "linear-gradient(135deg,#006d77,#83c5be)" },
  { id: "midnight", name: "Midnight Pro",  description: "Deep navy – sleek & corporate",               emoji: "🌙", primaryColor: "#1e2d5a", userBubbleColor: "#253571", botBubbleColor: "#f0f2fb", fontFamily: "Inter",      launcherStyle: "square",  borderRadius: 14, botName: "ProAssist",      welcomeMessage: "Welcome. I'm here to assist you.",       accentGradient: "linear-gradient(135deg,#1e2d5a,#4a69bd)" },
  { id: "coral",    name: "Coral Warmth",  description: "Vibrant coral – energetic & friendly",        emoji: "🪸", primaryColor: "#e05a47", userBubbleColor: "#e05a47", botBubbleColor: "#fff5f4", fontFamily: "Poppins",    launcherStyle: "pill",    borderRadius: 24, botName: "Coral Chat",     welcomeMessage: "Hi there! Great to see you 👋",           accentGradient: "linear-gradient(135deg,#e05a47,#f4a261)" },
  { id: "forest",   name: "Forest Fresh",  description: "Rich greens – natural & trustworthy",         emoji: "🌿", primaryColor: "#2d6a4f", userBubbleColor: "#2d6a4f", botBubbleColor: "#f0faf4", fontFamily: "DM Sans",    launcherStyle: "rounded", borderRadius: 18, botName: "EcoGuide",       welcomeMessage: "Welcome! How may I assist you today?",    accentGradient: "linear-gradient(135deg,#2d6a4f,#74c69d)" },
  { id: "royal",    name: "Royal Purple",  description: "Deep violet – premium & luxurious",           emoji: "💜", primaryColor: "#6a0dad", userBubbleColor: "#6a0dad", botBubbleColor: "#f8f4ff", fontFamily: "Montserrat", launcherStyle: "pill",    borderRadius: 22, botName: "LuxeBot",        welcomeMessage: "Welcome to our premium service.",         accentGradient: "linear-gradient(135deg,#6a0dad,#c77dff)" },
  { id: "mono",     name: "Monochrome",    description: "Clean black & white – minimal & bold",        emoji: "⬛", primaryColor: "#1a1a2e", userBubbleColor: "#1a1a2e", botBubbleColor: "#f5f5f5", fontFamily: "Inter",      launcherStyle: "square",  borderRadius: 10, botName: "Minimal AI",     welcomeMessage: "Hello. What do you need?",                accentGradient: "linear-gradient(135deg,#1a1a2e,#6c6c8a)" },
];

export default function CustomizationPage() {
  const { selectedTenant, updateTenantProfile, loading, error, setError } = usePlatformAuth();
  const profile = selectedTenant?.business_profile;
  const [activeTab, setActiveTab] = useState<Tab>("brand");

  const [businessType,       setBusinessType]       = useState(profile?.business_type || "general_travel");
  const [supportedServices,  setSupportedServices]  = useState<PlatformService[]>(profile?.supported_services || ["flights"]);
  const [supportPhone,       setSupportPhone]       = useState(profile?.support_phone || "");
  const [supportEmail,       setSupportEmail]       = useState(profile?.support_email || "");
  const [supportCtaLabel,    setSupportCtaLabel]    = useState(profile?.support_cta_label || "Connect with a specialist");
  const [headerCtaLabel,     setHeaderCtaLabel]     = useState(profile?.header_cta_label || "New");
  const [headerCtaNotice,    setHeaderCtaNotice]    = useState(profile?.header_cta_notice || "Hi! I am your AI assistant. Ask me anything about your trip.");
  const [businessDescription,setBusinessDescription]= useState(profile?.business_description || "");
  const [primaryColor,       setPrimaryColor]       = useState(profile?.primary_color || "#006d77");
  const [userBubbleColor,    setUserBubbleColor]    = useState(profile?.user_bubble_color || "#006d77");
  const [botBubbleColor,     setBotBubbleColor]     = useState(profile?.bot_bubble_color || "#edf6f9");
  const [fontFamily,         setFontFamily]         = useState(profile?.font_family || "Manrope");
  const [widgetPosition,     setWidgetPosition]     = useState<WidgetPosition>(profile?.widget_position || "right");
  const [launcherStyle,      setLauncherStyle]      = useState<LauncherStyle>(profile?.launcher_style || "rounded");
  const [windowWidth,        setWindowWidth]        = useState(profile?.window_width || 380);
  const [windowHeight,       setWindowHeight]       = useState(profile?.window_height || 640);
  const [borderRadius,       setBorderRadius]       = useState(profile?.border_radius || 18);
  const [welcomeMessage,     setWelcomeMessage]     = useState(profile?.welcome_message || "Welcome. How can I help today?");
  const [botName,            setBotName]            = useState(profile?.bot_name || "AeroConcierge");
  const [botAvatarUrl,       setBotAvatarUrl]       = useState(profile?.bot_avatar_url || "");
  const [success,            setSuccess]            = useState("");
  const [appliedTemplate,    setAppliedTemplate]    = useState<string | null>(null);

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
    setPrimaryColor(t.primaryColor); setUserBubbleColor(t.userBubbleColor);
    setBotBubbleColor(t.botBubbleColor); setFontFamily(t.fontFamily);
    setLauncherStyle(t.launcherStyle); setBorderRadius(t.borderRadius);
    setBotName(t.botName); setWelcomeMessage(t.welcomeMessage);
    setAppliedTemplate(t.id);
  }

  const previewStyle = useMemo(() => ({
    "--preview-primary": primaryColor,
    "--preview-user":    userBubbleColor,
    "--preview-bot":     botBubbleColor,
    "--preview-radius":  `${borderRadius}px`,
    fontFamily,
  }) as CSSProperties, [primaryColor, userBubbleColor, botBubbleColor, borderRadius, fontFamily]);

  if (!selectedTenant) {
    return (
      <div className="app-empty" style={{ maxWidth: 480, margin: "4rem auto" }}>
        <div className="empty-icon">🎨</div>
        <p className="empty-title">No workspace selected</p>
        <p className="empty-desc">Select a tenant to configure chatbot customization.</p>
      </div>
    );
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
        support_cta_label: supportCtaLabel, header_cta_label: headerCtaLabel,
        header_cta_notice: headerCtaNotice, business_description: businessDescription || undefined,
        primary_color: primaryColor, user_bubble_color: userBubbleColor, bot_bubble_color: botBubbleColor,
        font_family: fontFamily, widget_position: widgetPosition, launcher_style: launcherStyle,
        window_width: windowWidth, window_height: windowHeight, border_radius: borderRadius,
        welcome_message: welcomeMessage, bot_name: botName, bot_avatar_url: botAvatarUrl || undefined,
      });
      setSuccess("Customization saved! The portal preview and widget will use these settings.");
    } catch { /* handled by context */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Chatbot Appearance</p>
          <h2 className="app-h1">Customization</h2>
          <p className="app-lead">
            Start with a template or fine-tune every detail. Changes are reflected instantly in the live preview.
          </p>
        </div>
      </div>

      {/* ── Templates ────────────────────────────────────────────── */}
      <div className="app-card">
        <p className="app-card-subtitle">Quick templates</p>
        <div className="app-template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`app-template-card${appliedTemplate === t.id ? " selected" : ""}`}
              onClick={() => applyTemplate(t)}
            >
              <div className="app-template-swatch" style={{ background: t.accentGradient }} />
              <span className="app-template-emoji">{t.emoji}</span>
              {appliedTemplate === t.id && <div className="app-template-check">✓</div>}
              <div className="app-template-info">
                <strong>{t.name}</strong>
                <span>{t.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Form + preview ───────────────────────────────────────── */}
      <div className="app-two-col">

        {/* ── Left: Form ────────────────────────────────────────── */}
        <div className="app-card">

          {/* Tabs */}
          <div className="app-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`app-tab${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="app-form-grid">

              {/* ── Brand tab ── */}
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
                  <label className="full">
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
                    <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "rgba(10,10,15,0.7)", display: "block", marginBottom: "8px" }}>
                      Enabled services
                    </span>
                    <div className="app-chip-row">
                      {services.map((service) => (
                        <button
                          key={service} type="button"
                          className={`app-chip${supportedServices.includes(service) ? " active" : ""}`}
                          onClick={() => toggleService(service)}
                        >
                          {service}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Colors tab ── */}
              {activeTab === "colors" && (
                <>
                  <label>
                    Primary color
                    <div className="app-color-field">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                      <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                    </div>
                  </label>
                  <label>
                    User bubble color
                    <div className="app-color-field">
                      <input type="color" value={userBubbleColor} onChange={(e) => setUserBubbleColor(e.target.value)} />
                      <input type="text" value={userBubbleColor} onChange={(e) => setUserBubbleColor(e.target.value)} />
                    </div>
                  </label>
                  <label>
                    Bot bubble color
                    <div className="app-color-field">
                      <input type="color" value={botBubbleColor} onChange={(e) => setBotBubbleColor(e.target.value)} />
                      <input type="text" value={botBubbleColor} onChange={(e) => setBotBubbleColor(e.target.value)} />
                    </div>
                  </label>
                  <div className="full" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "rgba(10,10,15,0.7)" }}>Preview</span>
                    <div style={{ padding: "12px 16px", borderRadius: "10px", background: userBubbleColor, color: "#fff", fontSize: "0.82rem", alignSelf: "flex-end", maxWidth: "80%" }}>
                      User message looks like this
                    </div>
                    <div style={{ padding: "12px 16px", borderRadius: "10px", background: botBubbleColor, border: "1px solid rgba(0,0,0,0.08)", fontSize: "0.82rem", alignSelf: "flex-start", maxWidth: "80%" }}>
                      Bot message looks like this
                    </div>
                  </div>
                </>
              )}

              {/* ── Layout tab ── */}
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
                      {launcherStyles.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Window width (px)
                    <div className="app-range-field">
                      <input type="range" min={320} max={520} value={windowWidth} onChange={(e) => setWindowWidth(Number(e.target.value))} />
                      <span className="app-range-val">{windowWidth}px</span>
                    </div>
                  </label>
                  <label>
                    Window height (px)
                    <div className="app-range-field">
                      <input type="range" min={520} max={860} value={windowHeight} onChange={(e) => setWindowHeight(Number(e.target.value))} />
                      <span className="app-range-val">{windowHeight}px</span>
                    </div>
                  </label>
                  <label className="full">
                    Border radius (px)
                    <div className="app-range-field">
                      <input type="range" min={8} max={36} value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} />
                      <span className="app-range-val">{borderRadius}px</span>
                    </div>
                  </label>
                </>
              )}

              {/* ── Content tab ── */}
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
                    <textarea
                      rows={5}
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      placeholder="Describe your business and what the chatbot should help with…"
                    />
                  </label>
                </>
              )}

            </div>

            {error   && <p className="app-error"   style={{ marginTop: "16px" }}>{error}</p>}
            {success && <p className="app-success" style={{ marginTop: "16px" }}>{success}</p>}

            <button
              className="app-btn-primary"
              disabled={loading}
              type="submit"
              style={{ width: "100%", justifyContent: "center", marginTop: "20px" }}
            >
              {loading ? "Saving…" : "Save customization"}
            </button>
          </form>
        </div>

        {/* ── Right: Live preview ───────────────────────────────── */}
        <div className="app-card" style={{ position: "sticky", top: "80px" }}>
          <p className="app-card-title">Live preview</p>
          <p className="app-lead" style={{ marginBottom: "16px" }}>
            Updates instantly as you edit. Interactive preview is on the <em>My Chatbot</em> page.
          </p>

          {/* Chat preview mock */}
          <div className="app-chat-preview" style={previewStyle}>
            {/* Header */}
            <div className="app-chat-preview-header" style={{ background: primaryColor }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {botAvatarUrl ? (
                  <img src={botAvatarUrl} alt={botName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}>
                    {botName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>{botName}</p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                    Online
                  </p>
                </div>
              </div>
              {headerCtaLabel && (
                <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "3px 10px", background: "rgba(255,255,255,0.2)", borderRadius: "100px", color: "#fff" }}>
                  {headerCtaLabel}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="app-chat-preview-body">
              <div style={{ padding: "10px 14px", borderRadius: `${Math.min(borderRadius, 20)}px ${Math.min(borderRadius, 20)}px ${Math.min(borderRadius, 20)}px 4px`, background: botBubbleColor, fontSize: "0.8rem", border: "1px solid rgba(0,0,0,0.07)", alignSelf: "flex-start", maxWidth: "86%" }}>
                {welcomeMessage}
              </div>
              <div style={{ padding: "10px 14px", borderRadius: `${Math.min(borderRadius, 20)}px ${Math.min(borderRadius, 20)}px 4px ${Math.min(borderRadius, 20)}px`, background: userBubbleColor, color: "#fff", fontSize: "0.8rem", alignSelf: "flex-end", maxWidth: "78%" }}>
                I'd like help with a booking.
              </div>
              <div style={{ padding: "10px 14px", borderRadius: `${Math.min(borderRadius, 20)}px ${Math.min(borderRadius, 20)}px ${Math.min(borderRadius, 20)}px 4px`, background: botBubbleColor, fontSize: "0.8rem", border: "1px solid rgba(0,0,0,0.07)", alignSelf: "flex-start", maxWidth: "86%" }}>
                Of course! Could you share your travel dates?
              </div>
              {/* Typing dots */}
              <div style={{ display: "flex", gap: "4px", alignSelf: "flex-start", padding: "10px 14px", background: botBubbleColor, borderRadius: `${Math.min(borderRadius, 20)}px`, border: "1px solid rgba(0,0,0,0.07)" }}>
                {[0, 0.16, 0.32].map((delay, i) => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(10,10,15,0.3)", display: "inline-block", animation: `dot-bounce 1.2s ease-in-out ${delay}s infinite` }} />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="app-chat-preview-footer">
              <span style={{ flex: 1, fontSize: "0.78rem", color: "rgba(10,10,15,0.35)", paddingLeft: "8px" }}>Type a message…</span>
              <div style={{ width: 34, height: 34, borderRadius: `${Math.min(borderRadius / 1.8, 16)}px`, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.9rem", flexShrink: 0 }}>
                ➤
              </div>
            </div>
          </div>

          {/* Launcher pill preview */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "16px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: launcherStyle === "pill" ? "10px 20px" : "10px 16px",
              borderRadius: launcherStyle === "square" ? "12px" : launcherStyle === "minimal" ? "10px" : "999px",
              background: primaryColor, color: "#fff", fontSize: "0.8rem", fontWeight: 600,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {botName}
            </div>
          </div>

          {/* Color swatches */}
          <div className="app-swatch-row">
            <div className="app-swatch" style={{ background: primaryColor }} title={`Primary: ${primaryColor}`} />
            <div className="app-swatch" style={{ background: userBubbleColor }} title={`User: ${userBubbleColor}`} />
            <div className="app-swatch" style={{ background: botBubbleColor, border: "1px solid #ddd" }} title={`Bot: ${botBubbleColor}`} />
            <span className="app-swatch-label">{fontFamily} · r{borderRadius} · {launcherStyle}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
