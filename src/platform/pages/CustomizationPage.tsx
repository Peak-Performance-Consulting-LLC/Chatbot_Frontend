import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { LauncherStyle, PlatformService, WidgetPosition } from "@/platform/types";
import { usePlatformAuth } from "@/platform/state/auth";

const services: PlatformService[] = ["flights", "hotels", "cars", "cruises"];
const launcherStyles: LauncherStyle[] = ["rounded", "pill", "square", "minimal"];
const fontFamilies = ["Manrope", "Inter", "Poppins", "DM Sans", "Montserrat"];
const SERVICE_LABELS: Record<PlatformService, string> = {
  flights: "Flight deals",
  hotels: "Hotels",
  cars: "Car rentals",
  cruises: "Cruises"
};

type PreviewMode = "mobile" | "desktop";

type Template = {
  id: string; name: string; emoji: string;
  primaryColor: string; userBubbleColor: string; botBubbleColor: string;
  fontFamily: string; launcherStyle: LauncherStyle; borderRadius: number;
  botName: string; welcomeMessage: string; gradient: string;
};

const TEMPLATES: Template[] = [
  { id: "ocean",    name: "Ocean",    emoji: "🌊", primaryColor: "#006d77", userBubbleColor: "#006d77", botBubbleColor: "#edf6f9", fontFamily: "Manrope",    launcherStyle: "rounded", borderRadius: 20, botName: "Aqua",    welcomeMessage: "Hello! How can I help you today?",        gradient: "linear-gradient(135deg,#006d77,#83c5be)" },
  { id: "midnight", name: "Midnight", emoji: "🌙", primaryColor: "#1e2d5a", userBubbleColor: "#253571", botBubbleColor: "#f0f2fb", fontFamily: "Inter",      launcherStyle: "square",  borderRadius: 14, botName: "ProBot",  welcomeMessage: "Welcome. I'm here to assist you.",       gradient: "linear-gradient(135deg,#1e2d5a,#4a69bd)" },
  { id: "coral",    name: "Coral",    emoji: "🪸", primaryColor: "#e05a47", userBubbleColor: "#e05a47", botBubbleColor: "#fff5f4", fontFamily: "Poppins",    launcherStyle: "pill",    borderRadius: 24, botName: "Coral",  welcomeMessage: "Hi there! Great to see you 👋",          gradient: "linear-gradient(135deg,#e05a47,#f4a261)" },
  { id: "forest",   name: "Forest",   emoji: "🌿", primaryColor: "#2d6a4f", userBubbleColor: "#2d6a4f", botBubbleColor: "#f0faf4", fontFamily: "DM Sans",    launcherStyle: "rounded", borderRadius: 18, botName: "Eco",    welcomeMessage: "Welcome! How can I assist you today?",   gradient: "linear-gradient(135deg,#2d6a4f,#74c69d)" },
  { id: "royal",    name: "Royal",    emoji: "💜", primaryColor: "#6a0dad", userBubbleColor: "#6a0dad", botBubbleColor: "#f8f4ff", fontFamily: "Montserrat", launcherStyle: "pill",    borderRadius: 22, botName: "Luxe",   welcomeMessage: "Welcome to our premium service.",        gradient: "linear-gradient(135deg,#6a0dad,#c77dff)" },
  { id: "mono",     name: "Mono",     emoji: "⬛", primaryColor: "#1a1a2e", userBubbleColor: "#1a1a2e", botBubbleColor: "#f5f5f5", fontFamily: "Inter",      launcherStyle: "square",  borderRadius: 10, botName: "Minimal",welcomeMessage: "Hello. What do you need?",              gradient: "linear-gradient(135deg,#1a1a2e,#6c6c8a)" },
];

export default function CustomizationPage() {
  const { selectedTenant, updateTenantProfile, loading, error, setError } = usePlatformAuth();
  const profile = selectedTenant?.business_profile;
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");

  // ── Form state ─────────────────────────────────────────────────────────────
  const [businessType,        setBusinessType]        = useState(profile?.business_type || "general_travel");
  const [supportedServices,   setSupportedServices]   = useState<PlatformService[]>(profile?.supported_services || ["flights"]);
  const [supportPhone,        setSupportPhone]        = useState(profile?.support_phone || "");
  const [supportEmail,        setSupportEmail]        = useState(profile?.support_email || "");
  const [supportCtaLabel,     setSupportCtaLabel]     = useState(profile?.support_cta_label || "Connect with a specialist");
  const [headerCtaLabel,      setHeaderCtaLabel]      = useState(profile?.header_cta_label || "New");
  const [headerCtaNotice,     setHeaderCtaNotice]     = useState(profile?.header_cta_notice || "Hi! I am your AI assistant. Ask me anything about your trip.");
  const [businessDescription, setBusinessDescription] = useState(profile?.business_description || "");
  const [primaryColor,        setPrimaryColor]        = useState(profile?.primary_color || "#006d77");
  const [userBubbleColor,     setUserBubbleColor]     = useState(profile?.user_bubble_color || "#006d77");
  const [botBubbleColor,      setBotBubbleColor]      = useState(profile?.bot_bubble_color || "#edf6f9");
  const [fontFamily,          setFontFamily]          = useState(profile?.font_family || "Manrope");
  const [widgetPosition,      setWidgetPosition]      = useState<WidgetPosition>(profile?.widget_position || "right");
  const [launcherStyle,       setLauncherStyle]       = useState<LauncherStyle>(profile?.launcher_style || "rounded");
  const [windowWidth,         setWindowWidth]         = useState(profile?.window_width || 380);
  const [windowHeight,        setWindowHeight]        = useState(profile?.window_height || 640);
  const [borderRadius,        setBorderRadius]        = useState(profile?.border_radius || 18);
  const [welcomeMessage,      setWelcomeMessage]      = useState(profile?.welcome_message || "Welcome. How can I help today?");
  const [botName,             setBotName]             = useState(profile?.bot_name || "AeroConcierge");
  const [botAvatarUrl,        setBotAvatarUrl]        = useState(profile?.bot_avatar_url || "");
  const [success,             setSuccess]             = useState("");
  const [appliedTemplate,     setAppliedTemplate]     = useState<string | null>(null);

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

  function toggleService(service: PlatformService) {
    setSupportedServices(prev => {
      if (prev.includes(service)) {
        const next = prev.filter(s => s !== service);
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
        tenant_id: selectedTenant!.tenant_id, business_type: businessType,
        supported_services: supportedServices,
        support_phone: supportPhone || undefined, support_email: supportEmail || undefined,
        support_cta_label: supportCtaLabel, header_cta_label: headerCtaLabel,
        header_cta_notice: headerCtaNotice, business_description: businessDescription || undefined,
        primary_color: primaryColor, user_bubble_color: userBubbleColor, bot_bubble_color: botBubbleColor,
        font_family: fontFamily, widget_position: widgetPosition, launcher_style: launcherStyle,
        window_width: windowWidth, window_height: windowHeight, border_radius: borderRadius,
        welcome_message: welcomeMessage, bot_name: botName, bot_avatar_url: botAvatarUrl || undefined,
      });
      setSuccess("Customization saved successfully!");
    } catch { /* handled by context */ }
  }

  const previewStyle = useMemo(() => ({
    "--preview-primary":  primaryColor,
    "--preview-user":     userBubbleColor,
    "--preview-bot":      botBubbleColor,
    "--preview-radius":   `${borderRadius}px`,
    fontFamily,
  }) as CSSProperties, [primaryColor, userBubbleColor, botBubbleColor, borderRadius, fontFamily]);

  const launcherBorderRadius =
    launcherStyle === "square" ? "14px" :
    launcherStyle === "minimal" ? "12px" :
    launcherStyle === "pill" ? "20px" : "999px";

  if (!selectedTenant) {
    return (
      <div className="app-empty" style={{ maxWidth: 480, margin: "4rem auto" }}>
        <div className="empty-icon">🎨</div>
        <p className="empty-title">No workspace selected</p>
        <p className="empty-desc">Select a tenant to configure chatbot customization.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Page header ── */}
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Chatbot Appearance</p>
          <h2 className="app-h1">Customization</h2>
          <p className="app-lead">Pick a template or fine-tune every detail. Preview updates instantly.</p>
        </div>
      </div>

      {/* ── Theme template picker ── */}
      <div className="app-card" style={{ padding: "20px 24px" }}>
        <p className="app-card-subtitle" style={{ marginBottom: "12px" }}>Quick themes</p>
        <div className="cust-template-row">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              className={`cust-theme-card${appliedTemplate === t.id ? " selected" : ""}`}
              onClick={() => applyTemplate(t)}
              title={t.name}
            >
              <span className="cust-theme-swatch" style={{ background: t.gradient }} />
              <span className="cust-theme-emoji">{t.emoji}</span>
              <span className="cust-theme-name">{t.name}</span>
              {appliedTemplate === t.id && <span className="cust-theme-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main: form + preview side by side ── */}
      <div className="cust-layout">

        {/* ── Left: Settings form ── */}
        <div className="app-card cust-form-card">
          <form onSubmit={handleSubmit}>

            {/* SECTION: Identity */}
            <div className="cust-section">
              <p className="cust-section-label">Identity</p>
              <div className="cust-field-grid">
                <label className="cust-label">
                  Bot name
                  <input className="cust-input" value={botName} onChange={e => setBotName(e.target.value)} maxLength={60} placeholder="My Assistant" />
                </label>
                <label className="cust-label">
                  Business type
                  <input className="cust-input" value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="travel / e-commerce / support" />
                </label>
                <label className="cust-label full">
                  Avatar URL
                  <input className="cust-input" value={botAvatarUrl} onChange={e => setBotAvatarUrl(e.target.value)} placeholder="https://…/avatar.png" />
                </label>
                <label className="cust-label">
                  Font
                  <select className="cust-input" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                    {fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <div className="cust-label full">
                  <span className="cust-field-title">Enabled services</span>
                  <div className="cust-chip-row">
                    {services.map(s => (
                      <button key={s} type="button"
                        className={`cust-chip${supportedServices.includes(s) ? " active" : ""}`}
                        onClick={() => toggleService(s)}
                      >{SERVICE_LABELS[s]}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: Colors */}
            <div className="cust-section">
              <p className="cust-section-label">Colors</p>
              <div className="cust-field-grid">
                <label className="cust-label">
                  Brand color
                  <div className="cust-color-row">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                    <input className="cust-input" type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ flex: 1 }} />
                  </div>
                </label>
                <label className="cust-label">
                  User bubble
                  <div className="cust-color-row">
                    <input type="color" value={userBubbleColor} onChange={e => setUserBubbleColor(e.target.value)} />
                    <input className="cust-input" type="text" value={userBubbleColor} onChange={e => setUserBubbleColor(e.target.value)} style={{ flex: 1 }} />
                  </div>
                </label>
                <label className="cust-label">
                  Bot bubble
                  <div className="cust-color-row">
                    <input type="color" value={botBubbleColor} onChange={e => setBotBubbleColor(e.target.value)} />
                    <input className="cust-input" type="text" value={botBubbleColor} onChange={e => setBotBubbleColor(e.target.value)} style={{ flex: 1 }} />
                  </div>
                </label>
                <label className="cust-label">
                  Corner radius
                  <div className="cust-range-row">
                    <input type="range" min={8} max={36} value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} style={{ flex: 1 }} />
                    <span className="cust-range-val">{borderRadius}px</span>
                  </div>
                </label>
              </div>
            </div>

            {/* SECTION: Widget layout */}
            <div className="cust-section">
              <p className="cust-section-label">Widget layout</p>
              <div className="cust-field-grid">
                <label className="cust-label">
                  Position
                  <select className="cust-input" value={widgetPosition} onChange={e => setWidgetPosition(e.target.value as WidgetPosition)}>
                    <option value="right">Right side</option>
                    <option value="left">Left side</option>
                  </select>
                </label>
                <label className="cust-label">
                  Launcher style
                  <select className="cust-input" value={launcherStyle} onChange={e => setLauncherStyle(e.target.value as LauncherStyle)}>
                    {launcherStyles.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </label>
                <label className="cust-label">
                  Width (desktop)
                  <div className="cust-range-row">
                    <input type="range" min={320} max={520} value={windowWidth} onChange={e => setWindowWidth(Number(e.target.value))} style={{ flex: 1 }} />
                    <span className="cust-range-val">{windowWidth}px</span>
                  </div>
                </label>
                <label className="cust-label">
                  Height (desktop)
                  <div className="cust-range-row">
                    <input type="range" min={520} max={860} value={windowHeight} onChange={e => setWindowHeight(Number(e.target.value))} style={{ flex: 1 }} />
                    <span className="cust-range-val">{windowHeight}px</span>
                  </div>
                </label>
              </div>
            </div>

            {/* SECTION: Content */}
            <div className="cust-section">
              <p className="cust-section-label">Content</p>
              <div className="cust-field-grid">
                <label className="cust-label">
                  Launcher badge text
                  <input className="cust-input" value={headerCtaLabel} onChange={e => setHeaderCtaLabel(e.target.value)} maxLength={30} placeholder="New" />
                </label>
                <label className="cust-label">
                  Support CTA label
                  <input className="cust-input" value={supportCtaLabel} onChange={e => setSupportCtaLabel(e.target.value)} placeholder="Connect with a specialist" />
                </label>
                <label className="cust-label">
                  Support phone
                  <input className="cust-input" value={supportPhone} onChange={e => setSupportPhone(e.target.value)} placeholder="+1 800 000 0000" />
                </label>
                <label className="cust-label">
                  Support email
                  <input className="cust-input" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="support@company.com" />
                </label>
                <label className="cust-label full">
                  Welcome message
                  <textarea className="cust-input cust-textarea" rows={2} value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} placeholder="How can I help you today?" />
                </label>
                <label className="cust-label full">
                  Launcher notice
                  <textarea className="cust-input cust-textarea" rows={2} value={headerCtaNotice} onChange={e => setHeaderCtaNotice(e.target.value)} placeholder="Hi! I am your AI assistant." />
                </label>
                <label className="cust-label full">
                  Business description
                  <textarea className="cust-input cust-textarea" rows={3} value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} placeholder="Describe your business…" />
                </label>
              </div>
            </div>

            {error   && <p className="app-error"   style={{ marginTop: 14 }}>{error}</p>}
            {success && <p className="app-success" style={{ marginTop: 14 }}>{success}</p>}

            <button className="app-btn-primary" disabled={loading} type="submit"
              style={{ width: "100%", justifyContent: "center", marginTop: "20px" }}>
              {loading ? "Saving…" : "Save customization"}
            </button>
          </form>
        </div>

        {/* ── Right: Live preview ── */}
        <div className="cust-preview-panel app-card" style={{ position: "sticky", top: "80px", alignSelf: "flex-start" }}>
          {/* Preview header: toggle */}
          <div className="cust-preview-header">
            <span className="cust-preview-title">Live preview</span>
            <div className="cust-preview-toggle">
              <button
                type="button"
                className={`cust-toggle-btn${previewMode === "desktop" ? " active" : ""}`}
                onClick={() => setPreviewMode("desktop")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                Desktop
              </button>
              <button
                type="button"
                className={`cust-toggle-btn${previewMode === "mobile" ? " active" : ""}`}
                onClick={() => setPreviewMode("mobile")}
              >
                <svg width="13" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/></svg>
                Mobile
              </button>
            </div>
          </div>

          {/* ── DESKTOP preview ── */}
          {previewMode === "desktop" && (
            <div className="cust-desktop-preview-wrap">
              {/* Simulated browser chrome */}
              <div className="cust-browser-chrome">
                <div className="cust-browser-dots">
                  <span style={{ background: "#ff5f57" }} />
                  <span style={{ background: "#febc2e" }} />
                  <span style={{ background: "#28c840" }} />
                </div>
                <div className="cust-browser-bar">yourwebsite.com</div>
              </div>
              {/* Browser viewport */}
              <div className="cust-browser-viewport" style={previewStyle}>
                {/* Page content bg */}
                <div className="cust-page-bg">
                  <div className="cust-page-lines">
                    {[...Array(5)].map((_, i) => <div key={i} className="cust-page-line" style={{ width: `${[80,60,72,50,65][i]}%` }} />)}
                  </div>
                </div>

                {/* Widget chat window */}
                <div className={`cust-widget-window ${widgetPosition === "left" ? "left" : "right"}`}>
                  {/* Header */}
                  <div className="cust-w-header" style={{ background: primaryColor }}>
                    <div className="cust-w-avatar">
                      {botAvatarUrl
                        ? <img src={botAvatarUrl} alt={botName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                        : <span>{botName.slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <div>
                      <div className="cust-w-name">{botName}</div>
                      <div className="cust-w-status"><span className="cust-w-dot" />Online</div>
                    </div>
                    {headerCtaLabel && (
                      <span className="cust-w-badge">{headerCtaLabel}</span>
                    )}
                  </div>
                  {/* Messages */}
                  <div className="cust-w-body">
                    <div className="cust-w-bubble bot" style={{ background: botBubbleColor, borderRadius: `${Math.min(borderRadius, 16)}px ${Math.min(borderRadius, 16)}px ${Math.min(borderRadius, 16)}px 4px` }}>
                      {welcomeMessage}
                    </div>
                    <div className="cust-w-bubble user" style={{ background: userBubbleColor, borderRadius: `${Math.min(borderRadius, 16)}px ${Math.min(borderRadius, 16)}px 4px ${Math.min(borderRadius, 16)}px` }}>
                      I'd like help with a booking.
                    </div>
                    <div className="cust-w-bubble bot" style={{ background: botBubbleColor, borderRadius: `${Math.min(borderRadius, 16)}px ${Math.min(borderRadius, 16)}px ${Math.min(borderRadius, 16)}px 4px` }}>
                      Of course! Could you share your travel dates?
                    </div>
                    <div className="cust-w-typing" style={{ background: botBubbleColor }}>
                      <span /><span /><span />
                    </div>
                  </div>
                  {/* Composer */}
                  <div className="cust-w-composer">
                    <span className="cust-w-composer-text">Type a message…</span>
                    <div className="cust-w-send" style={{ background: primaryColor, borderRadius: `${Math.min(borderRadius / 2, 10)}px` }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>

                {/* Launcher button */}
                <div className={`cust-launcher-preview ${widgetPosition === "left" ? "left" : "right"}`}
                  style={{ background: primaryColor, borderRadius: launcherBorderRadius }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>{botName}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── MOBILE preview ── */}
          {previewMode === "mobile" && (
            <div className="cust-mobile-preview-wrap">
              {/* Phone frame */}
              <div className="cust-phone-frame">
                {/* Notch */}
                <div className="cust-phone-notch">
                  <div className="cust-phone-notch-pill" />
                </div>
                {/* Screen */}
                <div className="cust-phone-screen" style={previewStyle}>
                  {/* Status bar */}
                  <div className="cust-phone-status">
                    <span>9:41</span>
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 8.5C5.5 4.5 18.5 4.5 22.5 8.5"/><path d="M5 12c2.8-2.8 12-2.8 14 0"/><path d="M8.5 15.5c1.4-1.4 7.6-1.4 7 0"/><circle cx="12" cy="19" r="1"/></svg>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="7" width="4" height="12" rx="1"/><rect x="8" y="4" width="4" height="15" rx="1"/><rect x="14" y="2" width="4" height="17" rx="1"/><rect x="20" y="7" width="2" height="12" rx="1"/></svg>
                    </span>
                  </div>

                  {/* Full-screen chat (mobile embed style) */}
                  <div className="cust-mobile-chat">
                    {/* Chat header */}
                    <div className="cust-m-header" style={{ background: primaryColor }}>
                      <div className="cust-m-avatar">
                        {botAvatarUrl
                          ? <img src={botAvatarUrl} alt={botName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                          : <span>{botName.slice(0, 2).toUpperCase()}</span>}
                      </div>
                      <div>
                        <div className="cust-m-name">{botName}</div>
                        <div className="cust-m-status"><span className="cust-w-dot" style={{ width: 5, height: 5 }} />Online</div>
                      </div>
                    </div>
                    {/* Chat body */}
                    <div className="cust-m-body">
                      <div className="cust-m-bubble bot" style={{ background: botBubbleColor, borderRadius: `${Math.min(borderRadius, 14)}px ${Math.min(borderRadius, 14)}px ${Math.min(borderRadius, 14)}px 3px` }}>
                        {welcomeMessage}
                      </div>
                      <div className="cust-m-bubble user" style={{ background: userBubbleColor, borderRadius: `${Math.min(borderRadius, 14)}px ${Math.min(borderRadius, 14)}px 3px ${Math.min(borderRadius, 14)}px` }}>
                        I'd like help with a booking.
                      </div>
                      <div className="cust-m-bubble bot" style={{ background: botBubbleColor, borderRadius: `${Math.min(borderRadius, 14)}px ${Math.min(borderRadius, 14)}px ${Math.min(borderRadius, 14)}px 3px` }}>
                        Of course! What dates work for you?
                      </div>
                      <div className="cust-w-typing" style={{ background: botBubbleColor, alignSelf: "flex-start" }}>
                        <span /><span /><span />
                      </div>
                    </div>
                    {/* Composer */}
                    <div className="cust-m-composer">
                      <div className="cust-m-input">Type a message…</div>
                      <div className="cust-m-send" style={{ background: primaryColor, borderRadius: `${Math.min(borderRadius / 2, 10)}px` }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Home bar */}
                <div className="cust-phone-bar" />
              </div>
            </div>
          )}

          {/* Color summary row */}
          <div className="cust-swatch-row">
            <div className="cust-swatch" style={{ background: primaryColor }} title={`Brand: ${primaryColor}`} />
            <div className="cust-swatch" style={{ background: userBubbleColor }} title={`User: ${userBubbleColor}`} />
            <div className="cust-swatch" style={{ background: botBubbleColor, border: "1px solid rgba(10,10,15,0.1)" }} title={`Bot: ${botBubbleColor}`} />
            <span className="cust-swatch-label">{fontFamily} · r{borderRadius} · {launcherStyle}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
