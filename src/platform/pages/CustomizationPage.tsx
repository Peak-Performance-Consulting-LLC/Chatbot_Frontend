import { useEffect, useMemo, useState, useRef, type CSSProperties } from "react";
import { MessageCircle, Sparkles, Headphones, Zap, Heart } from "lucide-react";
import type {
  AiTone,
  BgPattern,
  LauncherIcon,
  LauncherStyle,
  NotifAnimation,
  PlatformService,
  ThemeStyle,
  WidgetPosition
} from "@/platform/types";
import { getWidgetSurfaceTokens } from "@/lib/widgetTheme";
import { usePlatformAuth } from "@/platform/state/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "templates" | "appearance" | "layout" | "content" | "persona" | "notification";

type Template = {
  id: string; name: string; badge: string; badgeColor: string;
  primaryColor: string; userBubbleColor: string; botBubbleColor: string;
  fontFamily: string; launcherStyle: LauncherStyle; borderRadius: number;
  botName: string; welcomeMessage: string; themeStyle: ThemeStyle;
  bgGradient: string;
};

// ─── Data ────────────────────────────────────────────────────────────────────
const SERVICES: PlatformService[] = ["flights", "hotels", "cars", "cruises"];
const SERVICE_LABELS: Record<PlatformService, string> = {
  flights: "Flights", hotels: "Hotels", cars: "Car rentals", cruises: "Cruises"
};
const FONT_FAMILIES = ["Manrope", "Inter", "Poppins", "DM Sans", "Montserrat", "Nunito", "Raleway"];
const LAUNCHER_STYLES: LauncherStyle[] = ["rounded", "pill", "square", "minimal"];

const TEMPLATES: Template[] = [
  { id: "ocean", name: "Ocean", badge: "Default", badgeColor: "rgba(26,92,92,0.15)", primaryColor: "#006d77", userBubbleColor: "#006d77", botBubbleColor: "#edf6f9", fontFamily: "Manrope", launcherStyle: "rounded", borderRadius: 20, botName: "Aqua", welcomeMessage: "Hello! How can I help you today?", themeStyle: "standard", bgGradient: "linear-gradient(135deg,#006d77,#83c5be)" },
  { id: "glass", name: "Glassmorphism", badge: "Glass", badgeColor: "rgba(99,102,241,0.15)", primaryColor: "#4f46e5", userBubbleColor: "#6366f1", botBubbleColor: "#eef2ff", fontFamily: "Inter", launcherStyle: "pill", borderRadius: 24, botName: "Crystal", welcomeMessage: "Welcome! I'm here to help you.", themeStyle: "glass", bgGradient: "linear-gradient(135deg,#4f46e5,#818cf8)" },
  { id: "clay", name: "Claymorphism", badge: "Clay", badgeColor: "rgba(251,146,60,0.2)", primaryColor: "#f97316", userBubbleColor: "#f97316", botBubbleColor: "#fff7ed", fontFamily: "Nunito", launcherStyle: "rounded", borderRadius: 28, botName: "Clay", welcomeMessage: "Hey there! What can I do for you? 🎨", themeStyle: "clay", bgGradient: "linear-gradient(135deg,#f97316,#fb923c)" },
  { id: "noir", name: "Dark Premium", badge: "Premium", badgeColor: "rgba(201,169,110,0.2)", primaryColor: "#c9a96e", userBubbleColor: "#c9a96e", botBubbleColor: "#1e2040", fontFamily: "Montserrat", launcherStyle: "square", borderRadius: 14, botName: "Noir", welcomeMessage: "Welcome. I'm here to assist.", themeStyle: "dark", bgGradient: "linear-gradient(135deg,#0a0a1a,#c9a96e)" },
  { id: "minimal", name: "Minimalist", badge: "Minimal", badgeColor: "rgba(10,10,15,0.08)", primaryColor: "#0a0a0f", userBubbleColor: "#0a0a0f", botBubbleColor: "#f5f5f5", fontFamily: "Inter", launcherStyle: "square", borderRadius: 8, botName: "Assistant", welcomeMessage: "Hello. What do you need?", themeStyle: "minimal", bgGradient: "linear-gradient(135deg,#374151,#6b7280)" },
  { id: "forest", name: "Forest", badge: "Nature", badgeColor: "rgba(45,106,79,0.15)", primaryColor: "#2d6a4f", userBubbleColor: "#2d6a4f", botBubbleColor: "#f0faf4", fontFamily: "DM Sans", launcherStyle: "rounded", borderRadius: 18, botName: "Eco", welcomeMessage: "Welcome! How can I assist you today?", themeStyle: "standard", bgGradient: "linear-gradient(135deg,#2d6a4f,#74c69d)" },
  { id: "coral", name: "Coral", badge: "Warm", badgeColor: "rgba(224,90,71,0.15)", primaryColor: "#e05a47", userBubbleColor: "#e05a47", botBubbleColor: "#fff5f4", fontFamily: "Poppins", launcherStyle: "pill", borderRadius: 24, botName: "Coral", welcomeMessage: "Hi there! Great to see you 👋", themeStyle: "standard", bgGradient: "linear-gradient(135deg,#e05a47,#f4a261)" },
  { id: "royal", name: "Royal", badge: "Bold", badgeColor: "rgba(106,13,173,0.15)", primaryColor: "#6a0dad", userBubbleColor: "#6a0dad", botBubbleColor: "#f8f4ff", fontFamily: "Raleway", launcherStyle: "pill", borderRadius: 22, botName: "Luxe", welcomeMessage: "Welcome to our premium service.", themeStyle: "standard", bgGradient: "linear-gradient(135deg,#6a0dad,#c77dff)" },
  { id: "sunset", name: "Sunset", badge: "Gradient", badgeColor: "rgba(251,113,133,0.2)", primaryColor: "#f43f5e", userBubbleColor: "#f43f5e", botBubbleColor: "#fff1f2", fontFamily: "Poppins", launcherStyle: "pill", borderRadius: 26, botName: "Sunny", welcomeMessage: "Hello sunshine! How can I help? ☀️", themeStyle: "standard", bgGradient: "linear-gradient(135deg,#f43f5e,#fb923c)" },
  { id: "carbon", name: "Carbon", badge: "Tech", badgeColor: "rgba(71,85,105,0.15)", primaryColor: "#334155", userBubbleColor: "#475569", botBubbleColor: "#1e293b", fontFamily: "Inter", launcherStyle: "square", borderRadius: 10, botName: "Sys", welcomeMessage: "System online. How can I help?", themeStyle: "dark", bgGradient: "linear-gradient(135deg,#0f172a,#334155)" },
];

const AI_TONES: { id: AiTone; label: string; desc: string; emoji: string }[] = [
  { id: "friendly", label: "Friendly", desc: "Warm, approachable, uses emojis", emoji: "😊" },
  { id: "professional", label: "Professional", desc: "Formal, precise, business-like", emoji: "💼" },
  { id: "concise", label: "Concise", desc: "Short answers, straight to point", emoji: "⚡" },
  { id: "enthusiastic", label: "Enthusiastic", desc: "Energetic, upbeat, motivating", emoji: "🚀" },
];

const LAUNCHER_ICONS: { id: LauncherIcon; icon: React.ReactNode; label: string }[] = [
  { id: "chat", icon: <MessageCircle size={17} strokeWidth={1.8} />, label: "Chat" },
  { id: "sparkle", icon: <Sparkles size={17} strokeWidth={1.8} />, label: "Sparkles" },
  { id: "headset", icon: <Headphones size={17} strokeWidth={1.8} />, label: "Headset" },
  { id: "zap", icon: <Zap size={17} strokeWidth={1.8} />, label: "Zap" },
  { id: "heart", icon: <Heart size={17} strokeWidth={1.8} />, label: "Heart" },
];

// ─── Mini Template Preview ────────────────────────────────────────────────────
function TemplatePreviewMini({ t, isSelected, onClick }: { t: Template; isSelected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`cust-tpl-card${isSelected ? " selected" : ""}`} onClick={onClick}>
      <div className={`cust-tpl-preview ${t.themeStyle}`} style={{ background: t.bgGradient }}>
        <div className="cust-tpl-mini-header" style={{ background: t.primaryColor }}>
          <div className="cust-tpl-mini-avatar" />
          <span className="cust-tpl-mini-name">{t.botName}</span>
        </div>
        <div className="cust-tpl-mini-body">
          <div className="cust-tpl-mini-bubble bot" style={{ background: t.botBubbleColor, color: t.themeStyle === "dark" ? "rgba(255,255,255,0.85)" : "#333" }}>
            {t.welcomeMessage.slice(0, 32)}…
          </div>
          <div className="cust-tpl-mini-bubble user" style={{ background: t.userBubbleColor }}>How can you help?</div>
        </div>
      </div>
      <div className="cust-tpl-info">
        <strong>{t.name}</strong>
        <span style={{ color: "#a07840" }}>{t.badge}</span>
      </div>
      {isSelected && <div className="cust-tpl-check">✓</div>}
      <div className="cust-tpl-badge" style={{ background: t.badgeColor, color: "rgba(10,10,15,0.65)" }}>{t.badge}</div>
    </button>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────
function LivePreview({
  primaryColor, userBubbleColor, botBubbleColor, borderRadius,
  fontFamily, botName, botAvatarUrl, welcomeMessage, headerCtaLabel,
  widgetPosition, launcherStyle, themeStyle, bgPattern, quickReplies,
  notifEnabled, notifText, notifAnimation, launcherIcon, notifChips,
}: {
  primaryColor: string; userBubbleColor: string; botBubbleColor: string;
  borderRadius: number; fontFamily: string; botName: string; botAvatarUrl: string;
  welcomeMessage: string; headerCtaLabel: string; widgetPosition: WidgetPosition;
  launcherStyle: string; themeStyle: ThemeStyle; bgPattern: BgPattern;
  quickReplies: string[]; notifEnabled: boolean; notifText: string;
  notifAnimation: NotifAnimation; launcherIcon: LauncherIcon; notifChips: string[];
}) {
  const [mode, setMode] = useState<"desktop" | "mobile" | "notification">("desktop");
  const launcherBR = launcherStyle === "square" ? "12px" : launcherStyle === "minimal" ? "10px" : launcherStyle === "pill" ? "18px" : "999px";
  const surfaceTokens = useMemo(
    () =>
      getWidgetSurfaceTokens({
        primaryColor,
        botBubbleColor,
        themeStyle
      }),
    [botBubbleColor, primaryColor, themeStyle]
  );

  const bodyBg = surfaceTokens.panelBg;
  const botBubbleBg = botBubbleColor;
  const botBubbleBorder = surfaceTokens.assistantBubbleBorder;
  const botTextColor = surfaceTokens.ink;
  const clShadow = surfaceTokens.assistantBubbleShadow;
  const patternClass = bgPattern !== "none" ? `cust-bg-${bgPattern}` : "";
  const iconNode = LAUNCHER_ICONS.find(i => i.id === launcherIcon)?.icon ?? <MessageCircle size={16} strokeWidth={1.8} />;

  const avatar = botAvatarUrl
    ? <img src={botAvatarUrl} alt={botName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
    : <span>{botName.slice(0, 2).toUpperCase()}</span>;

  const chatBody = (scale: number) => {
    const bR = Math.min(borderRadius, 16) * scale;
    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 * scale, padding: `${7 * scale}px ${8 * scale}px`, background: bodyBg, minHeight: 70 * scale, flex: 1 }} className={patternClass}>
          <div style={{ padding: `${5 * scale}px ${8 * scale}px`, fontSize: `${0.62 * scale}rem`, lineHeight: 1.4, background: botBubbleBg, border: botBubbleBorder, borderRadius: `${bR}px ${bR}px ${bR}px ${3 * scale}px`, alignSelf: "flex-start", maxWidth: "84%", color: botTextColor, boxShadow: clShadow }}>{welcomeMessage}</div>
          {quickReplies.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
              {quickReplies.slice(0, 3).map((q, i) => (
                <span key={i} style={{ padding: `${2 * scale}px ${7 * scale}px`, borderRadius: 999, border: "1px solid rgba(10,10,15,0.15)", background: "#fff", fontSize: `${0.52 * scale}rem`, color: "rgba(10,10,15,0.6)" }}>{q}</span>
              ))}
            </div>
          )}
          <div style={{ padding: `${5 * scale}px ${8 * scale}px`, fontSize: `${0.62 * scale}rem`, lineHeight: 1.4, background: userBubbleColor, borderRadius: `${bR}px ${bR}px ${3 * scale}px ${bR}px`, alignSelf: "flex-end", maxWidth: "84%", color: "#fff" }}>I'd like help with a booking.</div>
          <div style={{ padding: `${5 * scale}px ${8 * scale}px`, fontSize: `${0.62 * scale}rem`, lineHeight: 1.4, background: botBubbleBg, border: botBubbleBorder, borderRadius: `${bR}px ${bR}px ${bR}px ${3 * scale}px`, alignSelf: "flex-start", maxWidth: "84%", color: botTextColor, boxShadow: clShadow }}>Of course! What dates work?</div>
          <div style={{ display: "flex", gap: 3, alignItems: "center", padding: `${5 * scale}px ${7 * scale}px`, alignSelf: "flex-start", borderRadius: 10, background: botBubbleBg, border: botBubbleBorder, boxShadow: clShadow }}>
            {[0, 150, 300].map(d => <span key={d} style={{ width: 4 * scale, height: 4 * scale, borderRadius: "50%", background: "rgba(10,10,15,0.28)", display: "inline-block", animation: `dot-bounce 1.2s ${d}ms infinite ease-in-out` }} />)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 * scale, padding: `${5 * scale}px ${7 * scale}px`, borderTop: `1px solid ${surfaceTokens.line}`, background: surfaceTokens.composerBg }}>
          <span style={{ flex: 1, fontSize: `${0.58 * scale}rem`, color: surfaceTokens.muted }}>Type a message…</span>
          <div style={{ width: 20 * scale, height: 20 * scale, display: "flex", alignItems: "center", justifyContent: "center", background: primaryColor, borderRadius: Math.min(borderRadius / 2, 10) * scale, flexShrink: 0, color: "#fff" }}>
            <svg width={12 * scale} height={12 * scale} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </div>
        </div>
      </>
    );
  };

  // Pill-style launcher (desktop/mobile chat view)
  const launcherBtn = (scale: number) => (
    <div className="cust-launcher-wrap">
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5 * scale, padding: `${6 * scale}px ${11 * scale}px`, background: primaryColor, borderRadius: launcherBR, color: "#fff", fontSize: `${0.64 * scale}rem`, fontWeight: 700, boxShadow: `0 ${6 * scale}px ${18 * scale}px rgba(0,0,0,0.18)`, position: "relative" }}>
        <span style={{ display: "flex", alignItems: "center", width: 17 * scale, height: 17 * scale }}>{iconNode}</span>
        <span>{botName}</span>
      </div>
    </div>
  );

  const launcherNotif = (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {launcherBtn(1)}
      {notifEnabled ? <div className="cust-launcher-badge">1</div> : null}
    </div>
  );

  return (
    <div className="cust-preview-panel app-card" style={{ position: "sticky", top: 80, alignSelf: "flex-start" }}>
      <div className="cust-preview-header">
        <span className="cust-preview-title">Live Preview</span>
        <div className="cust-preview-toggle">
          {(["desktop", "mobile", "notification"] as const).map(m => (
            <button key={m} type="button" className={`cust-toggle-btn${mode === m ? " active" : ""}`} onClick={() => setMode(m)}>
              {m === "desktop"
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                : m === "mobile"
                ? <svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
              {m === "notification" ? "Notif" : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {mode === "desktop" && (
        <div className="cust-desktop-preview-wrap">
          <div className="cust-browser-chrome">
            <div className="cust-browser-dots"><span style={{ background: "#ff5f57" }} /><span style={{ background: "#febc2e" }} /><span style={{ background: "#28c840" }} /></div>
            <div className="cust-browser-bar">yourwebsite.com</div>
          </div>
          <div className="cust-browser-viewport" style={{ fontFamily }}>
            <div className="cust-page-bg"><div className="cust-page-lines">{[80, 60, 72, 50, 65].map((w, i) => <div key={i} className="cust-page-line" style={{ width: `${w}%` }} />)}</div></div>
            <div className={`cust-widget-window ${widgetPosition}`}>
              <div className="cust-w-header" style={{ background: surfaceTokens.headerBg, color: surfaceTokens.headerInk }}>
                <div className="cust-w-avatar">{avatar}</div>
                <div>
                  <div className="cust-w-name" style={{ color: surfaceTokens.headerInk }}>{botName}</div>
                  <div className="cust-w-status" style={{ color: surfaceTokens.headerMuted }}><span className="cust-w-dot" />Online</div>
                </div>
                {headerCtaLabel && <span className="cust-w-badge" style={{ background: surfaceTokens.headerBadgeBg, color: surfaceTokens.headerBadgeColor }}>{headerCtaLabel}</span>}
              </div>
              {chatBody(1)}
            </div>
            <div className={`cust-launcher-preview ${widgetPosition}`} style={{ background: "transparent", padding: 0, bottom: 9, position: "absolute" }}>
              {launcherBtn(1)}
            </div>
          </div>
        </div>
      )}

      {mode === "mobile" && (
        <div className="cust-mobile-preview-wrap">
          <div className="cust-phone-frame">
            <div className="cust-phone-notch"><div className="cust-phone-notch-pill" /></div>
            <div className="cust-phone-screen" style={{ fontFamily }}>
              <div className="cust-phone-status"><span>9:41</span><span>●●●</span></div>
              <div className="cust-mobile-chat">
                <div className="cust-m-header" style={{ background: surfaceTokens.headerBg, color: surfaceTokens.headerInk }}>
                  <div className="cust-m-avatar">{avatar}</div>
                  <div>
                    <div className="cust-m-name" style={{ color: surfaceTokens.headerInk }}>{botName}</div>
                    <div className="cust-m-status" style={{ color: surfaceTokens.headerMuted }}><span className="cust-w-dot" style={{ width: 5, height: 5 }} />Online</div>
                  </div>
                </div>
                {chatBody(0.9)}
              </div>
            </div>
            <div className="cust-phone-bar" />
          </div>
        </div>
      )}

      {/* ── Notification card scene ── */}
      {mode === "notification" && (
        <div className={`cust-preview-notif-scene ${widgetPosition === "left" ? "left" : ""}`}>
          <div className="cust-notif-scene-lines">
            {[70, 55, 65, 40].map((w, i) => <div key={i} className="cust-notif-scene-line" style={{ width: `${w}%` }} />)}
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: widgetPosition === "left" ? "flex-start" : "flex-end", gap: 10, zIndex: 2 }}>
            {notifEnabled ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", alignItems: widgetPosition === "left" ? "flex-start" : "flex-end", gap: 8, maxWidth: 360 }}>
                  <div style={{ background: "#fff", borderRadius: 18, padding: "13px 16px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", fontSize: "0.86rem", color: "#0a0a0f", lineHeight: 1.45, maxWidth: 220, fontFamily, animation: "notif-card-in 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span>👋</span>
                      <span>{notifText || "Hi! How can we help?"}</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: widgetPosition === "left" ? "flex-start" : "flex-end", maxWidth: 320 }}>
                    {(notifChips.length > 0 ? notifChips : ["I have a question", "Tell me more"]).slice(0, 3).map((chip, i) => (
                      <div key={i} style={{ padding: "9px 15px", borderRadius: 999, background: "#fff", border: "1px solid rgba(10,10,15,0.1)", fontSize: "0.8rem", color: "#1a2332", fontWeight: 500, whiteSpace: "nowrap", fontFamily, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>{chip}</div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", paddingBottom: 14 }}>Notification bubble is disabled</div>
            )}
            {launcherNotif}
          </div>
        </div>
      )}

      <div className="cust-swatch-row">
        <div className="cust-swatch" style={{ background: primaryColor }} />
        <div className="cust-swatch" style={{ background: userBubbleColor }} />
        <div className="cust-swatch" style={{ background: botBubbleColor, border: "1px solid rgba(10,10,15,0.1)" }} />
        <span className="cust-swatch-label">{fontFamily} · r{borderRadius} · {launcherStyle} · {themeStyle}</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomizationPage() {
  const { selectedTenant, updateTenantProfile, loading, error, setError } = usePlatformAuth();
  const profile = selectedTenant?.business_profile;
  const [tab, setTab] = useState<TabId>("templates");
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [newChip, setNewChip] = useState("");
  const chipInputRef = useRef<HTMLInputElement>(null);
  // Track which tenant_id we last synced profile from, to avoid overwriting active edits
  // but always re-sync when the tenant changes (e.g., workspace switch or first load)
  const lastSyncedTenantIdRef = useRef<string | null>(null);

  // Core appearance
  const [primaryColor, setPrimaryColor] = useState(profile?.primary_color || "#006d77");
  const [userBubbleColor, setUserBubbleColor] = useState(profile?.user_bubble_color || "#006d77");
  const [botBubbleColor, setBotBubbleColor] = useState(profile?.bot_bubble_color || "#edf6f9");
  const [fontFamily, setFontFamily] = useState(profile?.font_family || "Manrope");
  const [borderRadius, setBorderRadius] = useState(profile?.border_radius || 18);
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>(profile?.theme_style || "standard");
  const [bgPattern, setBgPattern] = useState<BgPattern>(profile?.bg_pattern || "none");

  // Layout
  const [widgetPosition, setWidgetPosition] = useState<WidgetPosition>(profile?.widget_position || "right");
  const [launcherStyle, setLauncherStyle] = useState<LauncherStyle>(profile?.launcher_style || "rounded");
  const [windowWidth, setWindowWidth] = useState(profile?.window_width || 380);
  const [windowHeight, setWindowHeight] = useState(profile?.window_height || 760);
  const [launcherIcon, setLauncherIcon] = useState<LauncherIcon>(profile?.launcher_icon || "chat");

  // Content
  const [botName, setBotName] = useState(profile?.bot_name || "AeroConcierge");
  const [botAvatarUrl, setBotAvatarUrl] = useState(profile?.bot_avatar_url || "");
  const [welcomeMessage, setWelcomeMessage] = useState(profile?.welcome_message || "Welcome. How can I help today?");
  const [headerCtaLabel, setHeaderCtaLabel] = useState(
    profile?.header_cta_label && profile.header_cta_label.toLowerCase() !== "new" ? profile.header_cta_label : ""
  );
  const [headerCtaNotice, setHeaderCtaNotice] = useState(profile?.header_cta_notice || "Hi! I am your AI assistant.");
  const [supportPhone, setSupportPhone] = useState(profile?.support_phone || "");
  const [supportEmail, setSupportEmail] = useState(profile?.support_email || "");
  const [supportCtaLabel, setSupportCtaLabel] = useState(profile?.support_cta_label || "Connect with a specialist");
  const [quickReplies, setQuickReplies] = useState<string[]>(profile?.quick_replies || ["How does this work?", "Pricing plans", "Get support"]);

  // Persona
  const [businessType, setBusinessType] = useState(profile?.business_type || "general_travel");
  const [supportedServices, setSupportedServices] = useState<PlatformService[]>(profile?.supported_services || ["flights"]);
  const [businessDesc, setBusinessDesc] = useState(profile?.business_description || "");
  const [aiTone, setAiTone] = useState<AiTone>(profile?.ai_tone || "friendly");

  // Notification
  const [notifEnabled, setNotifEnabled] = useState(profile?.notif_enabled ?? true);
  const [notifText, setNotifText] = useState(profile?.notif_text || "👋 Need help?");
  const [notifAnimation, setNotifAnimation] = useState<NotifAnimation>(profile?.notif_animation || "bounce");
  const [notifChips, setNotifChips] = useState<string[]>(profile?.notif_chips || ["I have a question", "Tell me more"]);


  // Sync form state from saved profile whenever the tenant changes.
  // Using tenant_id as the sync key — re-syncs on workspace switch or first load,
  // but never overwrites the user's active edits within the same workspace session.
  useEffect(() => {
    if (!profile || !selectedTenant?.tenant_id) return;
    if (lastSyncedTenantIdRef.current === selectedTenant.tenant_id) return;
    lastSyncedTenantIdRef.current = selectedTenant.tenant_id;
    setPrimaryColor(profile.primary_color || "#006d77");
    setUserBubbleColor(profile.user_bubble_color || "#006d77");
    setBotBubbleColor(profile.bot_bubble_color || "#edf6f9");
    setFontFamily(profile.font_family || "Manrope");
    setBorderRadius(profile.border_radius || 18);
    setThemeStyle(profile.theme_style || "standard");
    setBgPattern(profile.bg_pattern || "none");
    setWidgetPosition(profile.widget_position || "right");
    setLauncherStyle(profile.launcher_style || "rounded");
    setLauncherIcon(profile.launcher_icon || "chat");
    setWindowWidth(profile.window_width || 380);
    setWindowHeight(profile.window_height || 760);
    setBotName(profile.bot_name || "AeroConcierge");
    setBotAvatarUrl(profile.bot_avatar_url || "");
    setWelcomeMessage(profile.welcome_message || "Welcome. How can I help today?");
    setHeaderCtaLabel(
      profile.header_cta_label && profile.header_cta_label.toLowerCase() !== "new" ? profile.header_cta_label : ""
    );
    setHeaderCtaNotice(profile.header_cta_notice || "Hi! I am your AI assistant.");
    setSupportPhone(profile.support_phone || "");
    setSupportEmail(profile.support_email || "");
    setSupportCtaLabel(profile.support_cta_label || "Connect with a specialist");
    setQuickReplies(profile.quick_replies || ["How does this work?", "Pricing plans", "Get support"]);
    setBusinessType(profile.business_type || "general_travel");
    setSupportedServices(profile.supported_services || ["flights"]);
    setBusinessDesc(profile.business_description || "");
    setAiTone(profile.ai_tone || "friendly");
    setNotifEnabled(profile.notif_enabled ?? true);
    setNotifText(profile.notif_text || "👋 Need help?");
    setNotifAnimation(profile.notif_animation || "bounce");
    setNotifChips(profile.notif_chips || ["I have a question", "Tell me more"]);
  }, [profile, selectedTenant?.tenant_id]);



  function applyTemplate(t: Template) {
    setPrimaryColor(t.primaryColor); setUserBubbleColor(t.userBubbleColor);
    setBotBubbleColor(t.botBubbleColor); setFontFamily(t.fontFamily);
    setLauncherStyle(t.launcherStyle); setBorderRadius(t.borderRadius);
    setBotName(t.botName); setWelcomeMessage(t.welcomeMessage);
    setThemeStyle(t.themeStyle); setAppliedTemplate(t.id);
    setTab("appearance");
  }

  function toggleService(s: PlatformService) {
    setSupportedServices(prev => prev.includes(s) ? (prev.filter(x => x !== s).length > 0 ? prev.filter(x => x !== s) : ["flights"]) : [...prev, s]);
  }

  function addChip() {
    const v = newChip.trim();
    if (v && !quickReplies.includes(v) && quickReplies.length < 6) {
      setQuickReplies(prev => [...prev, v]);
      setNewChip("");
      chipInputRef.current?.focus();
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSuccess(""); setError("");
    try {
      // Reset the sync guard BEFORE the await so the useEffect re-syncs from
      // the freshly updated profile that auth.tsx sets after a successful save.
      lastSyncedTenantIdRef.current = null;
      await updateTenantProfile({
        tenant_id: selectedTenant!.tenant_id,
        primary_color: primaryColor, user_bubble_color: userBubbleColor,
        bot_bubble_color: botBubbleColor, font_family: fontFamily,
        border_radius: borderRadius, widget_position: widgetPosition,
        launcher_style: launcherStyle, window_width: windowWidth, window_height: windowHeight,
        theme_style: themeStyle, bg_pattern: bgPattern, launcher_icon: launcherIcon,
        bot_name: botName.trim() || "Assistant",
        bot_avatar_url: botAvatarUrl || undefined,
        welcome_message: welcomeMessage.trim() || "Hello! How can I help you?",
        header_cta_label: headerCtaLabel.trim() || undefined,
        header_cta_notice: headerCtaNotice.trim() || "Hi! I am your AI assistant.",
        support_phone: supportPhone.trim() || undefined,
        support_email: supportEmail.trim() || undefined,
        support_cta_label: supportCtaLabel.trim() || "Connect with a specialist",
        quick_replies: quickReplies,
        business_type: businessType.trim() || "general_travel",
        supported_services: supportedServices.length > 0 ? supportedServices : ["flights"],
        business_description: businessDesc.trim() || undefined,
        ai_tone: aiTone,
        notif_enabled: notifEnabled,
        notif_text: notifText.trim() || "👋 Need help?",
        notif_animation: notifAnimation,
        notif_chips: notifChips,
      });
      setSuccess("✅ Customization saved! Changes are live.");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      // Restore sync guard so stale state doesn't persist on error
      lastSyncedTenantIdRef.current = selectedTenant?.tenant_id ?? null;
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Save failed: ${msg}`);
    }
  }

  if (!selectedTenant) {
    return (
      <div className="app-empty" style={{ maxWidth: 480, margin: "4rem auto" }}>
        <div className="empty-icon">🎨</div>
        <p className="empty-title">No workspace selected</p>
        <p className="empty-desc">Select a workspace to configure chatbot appearance.</p>
      </div>
    );
  }

  const TABS: { id: TabId; label: string; emoji: string }[] = [
    { id: "templates", label: "Templates", emoji: "🎨" },
    { id: "appearance", label: "Appearance", emoji: "✨" },
    { id: "layout", label: "Layout", emoji: "📐" },
    { id: "content", label: "Content", emoji: "✏️" },
    { id: "persona", label: "Persona", emoji: "🤖" },
    { id: "notification", label: "Notification", emoji: "🔔" },
  ];

  const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <label className="cust-label">
      {label}
      <div className="cust-color-row">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} />
        <input className="cust-input" type="text" value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1 }} placeholder="#000000" />
      </div>
    </label>
  );

  const RangeField = ({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) => (
    <label className="cust-label">
      {label}
      <div className="cust-range-row">
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1 }} />
        <span className="cust-range-val">{value}{unit}</span>
      </div>
    </label>
  );

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Widget Customization</p>
          <h2 className="app-h1">Chatbot Designer</h2>
          <p className="app-lead">Choose a template or fine-tune every visual, behavioral, and notification detail.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {success && <span className="app-success" style={{ padding: "8px 14px" }}>{success}</span>}
          {error && <span className="app-error" style={{ padding: "8px 14px" }}>{error}</span>}
          <button className="app-btn-primary" type="submit" disabled={loading}>
            {loading ? "Saving…" : "💾 Save changes"}
          </button>
        </div>
      </div>

      {/* Main layout: tabs + preview */}
      <div className="cust-layout" style={{ gap: 24 }}>

        {/* LEFT: Tab editor */}
        <div className="app-card cust-form-card">

          {/* Tab bar */}
          <div className="cust-tab-bar">
            {TABS.map(t => (
              <button key={t.id} type="button" className={`cust-tab-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Templates ── */}
          {tab === "templates" && (
            <div>
              <p className="cust-section-label" style={{ marginBottom: 14 }}>Choose a visual theme — click to apply, then refine in other tabs</p>
              <div className="cust-tpl-grid">
                {TEMPLATES.map(t => (
                  <TemplatePreviewMini key={t.id} t={t} isSelected={appliedTemplate === t.id} onClick={() => applyTemplate(t)} />
                ))}
              </div>
              <p style={{ fontSize: "0.76rem", color: "rgba(10,10,15,0.42)", marginTop: 14 }}>
                💡 Templates set colors, font, shape, and effect style. Your other settings are preserved — refine them in the Appearance, Layout, and Content tabs.
              </p>
            </div>
          )}

          {/* ── TAB: Appearance ── */}
          {tab === "appearance" && (
            <div>
              <p className="cust-sub-heading">Theme Style</p>
              <div className="cust-tone-grid" style={{ marginBottom: 16 }}>
                {([["standard", "Standard", "Clean, classic look", "🪟"], ["glass", "Glassmorphism", "Frosted blur effect", "🫧"], ["clay", "Claymorphism", "3D puffy clay cards", "🎨"], ["dark", "Dark Mode", "Deep, premium dark bg", "🌑"], ["minimal", "Minimalist", "Flat, no shadows", "⬜"]] as [ThemeStyle, string, string, string][]).map(([id, label, desc, emoji]) => (
                  <button key={id} type="button" className={`cust-tone-card${themeStyle === id ? " selected" : ""}`} onClick={() => setThemeStyle(id)}>
                    <strong>{emoji} {label}</strong><span>{desc}</span>
                  </button>
                ))}
              </div>

              <p className="cust-sub-heading">Colors</p>
              <div className="cust-field-grid">
                <ColorField label="Brand / primary" value={primaryColor} onChange={setPrimaryColor} />
                <ColorField label="User bubble" value={userBubbleColor} onChange={setUserBubbleColor} />
                <ColorField label="Bot bubble" value={botBubbleColor} onChange={setBotBubbleColor} />
                <RangeField label="Corner radius" value={borderRadius} min={4} max={36} unit="px" onChange={setBorderRadius} />
              </div>

              <p className="cust-sub-heading">Typography</p>
              <div className="cust-field-grid">
                <label className="cust-label">Font family
                  <select className="cust-input" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                    {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
              </div>

              <p className="cust-sub-heading">Chat Background</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["none", "dots", "grid", "waves"] as BgPattern[]).map(p => (
                  <button key={p} type="button" className={`cust-chip${bgPattern === p ? " active" : ""}`} onClick={() => setBgPattern(p)}>
                    {p === "none" ? "Solid" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: Layout ── */}
          {tab === "layout" && (
            <div>
              <p className="cust-sub-heading">Widget Position</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
                {(["right", "left"] as WidgetPosition[]).map(p => (
                  <button key={p} type="button" className={`cust-tone-card${widgetPosition === p ? " selected" : ""}`} onClick={() => setWidgetPosition(p)} style={{ flex: 1 }}>
                    <strong>{p === "right" ? "↗ Right side" : "↖ Left side"}</strong>
                    <span>{p === "right" ? "Standard position" : "Left-aligned widget"}</span>
                  </button>
                ))}
              </div>

              <p className="cust-sub-heading">Launcher Button</p>
              <div className="cust-field-grid">
                <label className="cust-label">Button shape
                  <select className="cust-input" value={launcherStyle} onChange={e => setLauncherStyle(e.target.value as LauncherStyle)}>
                    {LAUNCHER_STYLES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </label>
              </div>
              <label className="cust-label" style={{ marginTop: 10 }}>Launcher icon
                <div className="cust-icon-row" style={{ marginTop: 6 }}>
                  {LAUNCHER_ICONS.map(i => (
                    <button key={i.id} type="button" className={`cust-icon-btn${launcherIcon === i.id ? " selected" : ""}`} onClick={() => setLauncherIcon(i.id as LauncherIcon)} >
                      {i.icon}
                    </button>
                  ))}
                </div>
              </label>

              <p className="cust-sub-heading">Window Dimensions</p>
              <div className="cust-field-grid">
                <RangeField label="Width (desktop)" value={windowWidth} min={320} max={520} unit="px" onChange={setWindowWidth} />
                <RangeField label="Height (desktop)" value={windowHeight} min={520} max={860} unit="px" onChange={setWindowHeight} />
              </div>
            </div>
          )}

          {/* ── TAB: Content ── */}
          {tab === "content" && (
            <div>
              <p className="cust-sub-heading">Bot Identity</p>
              <div className="cust-field-grid">
                <label className="cust-label">Bot name
                  <input className="cust-input" value={botName} onChange={e => setBotName(e.target.value)} maxLength={60} placeholder="My Assistant" />
                </label>
                <label className="cust-label">Header badge text
                  <input className="cust-input" value={headerCtaLabel} onChange={e => setHeaderCtaLabel(e.target.value)} maxLength={30} placeholder="Optional badge" />
                </label>
                <label className="cust-label full">Avatar URL
                  <input className="cust-input" value={botAvatarUrl} onChange={e => setBotAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.png" />
                </label>
                <label className="cust-label full">Welcome message
                  <textarea className="cust-input cust-textarea" rows={2} value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} placeholder="How can I help you today?" />
                </label>
                <label className="cust-label full">Launcher pop-up notice
                  <textarea className="cust-input cust-textarea" rows={2} value={headerCtaNotice} onChange={e => setHeaderCtaNotice(e.target.value)} placeholder="Hi! I am your AI assistant." />
                </label>
              </div>

              <p className="cust-sub-heading">Quick Reply Chips</p>
              <p style={{ fontSize: "0.76rem", color: "rgba(10,10,15,0.45)", marginBottom: 10 }}>Add up to 6 pre-set questions shown below the welcome message.</p>
              <div className="cust-chip-editor">
                <div className="cust-chip-editor-list">
                  {quickReplies.map((q, i) => (
                    <div key={i} className="cust-chip-editor-item">
                      {q}
                      <button type="button" onClick={() => setQuickReplies(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                </div>
                {quickReplies.length < 6 && (
                  <div className="cust-chip-add-row">
                    <input ref={chipInputRef} className="cust-input" style={{ flex: 1 }} value={newChip} onChange={e => setNewChip(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChip(); } }} placeholder="e.g. What are your prices?" maxLength={60} />
                    <button type="button" className="app-btn-secondary" onClick={addChip} style={{ whiteSpace: "nowrap" }}>+ Add</button>
                  </div>
                )}
              </div>

              <p className="cust-sub-heading">Support Contact</p>
              <div className="cust-field-grid">
                <label className="cust-label">Support phone
                  <input className="cust-input" value={supportPhone} onChange={e => setSupportPhone(e.target.value)} placeholder="+1 800 000 0000" />
                </label>
                <label className="cust-label">Support email
                  <input className="cust-input" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="support@company.com" />
                </label>
                <label className="cust-label full">Support CTA label
                  <input className="cust-input" value={supportCtaLabel} onChange={e => setSupportCtaLabel(e.target.value)} placeholder="Connect with a specialist" />
                </label>
              </div>
            </div>
          )}

          {/* ── TAB: Persona ── */}
          {tab === "persona" && (
            <div>
              <p className="cust-sub-heading">Business Profile</p>
              <div className="cust-field-grid">
                <label className="cust-label">Business type
                  <input className="cust-input" value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="e.g. travel, e-commerce, support" />
                </label>
              </div>
              <label className="cust-label" style={{ marginTop: 12 }}>Enabled services
                <div className="cust-chip-row" style={{ marginTop: 6 }}>
                  {SERVICES.map(s => (
                    <button key={s} type="button" className={`cust-chip${supportedServices.includes(s) ? " active" : ""}`} onClick={() => toggleService(s)}>{SERVICE_LABELS[s]}</button>
                  ))}
                </div>
              </label>
              <label className="cust-label full" style={{ marginTop: 12 }}>Business description
                <textarea className="cust-input cust-textarea" rows={3} value={businessDesc} onChange={e => setBusinessDesc(e.target.value)} placeholder="Describe your business to help the AI give better, context-aware answers…" />
              </label>

              <p className="cust-sub-heading">AI Response Tone</p>
              <p style={{ fontSize: "0.76rem", color: "rgba(10,10,15,0.45)", marginBottom: 12 }}>Controls how your chatbot communicates with visitors.</p>
              <div className="cust-tone-grid">
                {AI_TONES.map(t => (
                  <button key={t.id} type="button" className={`cust-tone-card${aiTone === t.id ? " selected" : ""}`} onClick={() => setAiTone(t.id)}>
                    <strong>{t.emoji} {t.label}</strong>
                    <span>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: Notification ── */}
          {tab === "notification" && (
            <div>
              <p className="cust-sub-heading">Notification Bubble</p>
              <p style={{ fontSize: "0.76rem", color: "rgba(10,10,15,0.45)", marginBottom: 14 }}>A small popup appears near the launcher button to catch attention.</p>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(10,10,15,0.03)", border: "1px solid rgba(10,10,15,0.07)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.84rem", fontWeight: 500, color: "#0a0a0f", userSelect: "none" }}>
                  <input type="checkbox" checked={notifEnabled} onChange={e => setNotifEnabled(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#1a5c5c" }} />
                  Enable notification bubble
                </label>
                {notifEnabled && <span className="app-status-badge ready">Active</span>}
              </div>

              {notifEnabled && (
                <>
                  <div className="cust-field-grid">
                    <label className="cust-label full">Bubble message
                      <input className="cust-input" value={notifText} onChange={e => setNotifText(e.target.value)} maxLength={60} placeholder="👋 Need help?" />
                    </label>
                  </div>

                  <p className="cust-sub-heading">Quick Reply Chips</p>
                  <p style={{ fontSize: "0.76rem", color: "rgba(10,10,15,0.45)", marginBottom: 10 }}>Shown as pill buttons beside the notification card (up to 4).</p>
                  <div className="cust-chip-editor">
                    <div className="cust-chip-editor-list">
                      {notifChips.map((c, i) => (
                        <div key={i} className="cust-chip-editor-item">
                          {c}
                          <button type="button" onClick={() => setNotifChips(prev => prev.filter((_, j) => j !== i))}>✕</button>
                        </div>
                      ))}
                    </div>
                    {notifChips.length < 4 && (
                      <div className="cust-chip-add-row">
                        <input id="notif-chip-input" className="cust-input" style={{ flex: 1 }}
                          placeholder='e.g. "Tell me more"' maxLength={40}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const v = (e.target as HTMLInputElement).value.trim();
                              if (v && !notifChips.includes(v)) { setNotifChips(prev => [...prev, v]); (e.target as HTMLInputElement).value = ""; }
                            }
                          }}
                        />
                        <button type="button" className="app-btn-secondary" onClick={() => {
                          const el = document.getElementById("notif-chip-input") as HTMLInputElement;
                          const v = el?.value.trim();
                          if (v && !notifChips.includes(v)) { setNotifChips(prev => [...prev, v]); el.value = ""; }
                        }}>+ Add</button>
                      </div>
                    )}
                  </div>

                  <p className="cust-sub-heading">Animation Style</p>
                  <div className="cust-tone-grid">
                    {([["bounce", "Bounce", "Playful up-down bounce", "🏀"], ["pulse", "Pulse", "Expanding ring glow", "💓"], ["slide", "Slide", "Subtle float in/out", "🌊"]] as [NotifAnimation, string, string, string][]).map(([id, label, desc, emoji]) => (
                      <button key={id} type="button" className={`cust-tone-card${notifAnimation === id ? " selected" : ""}`} onClick={() => setNotifAnimation(id)}>
                        <strong>{emoji} {label}</strong><span>{desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="app-callout info" style={{ marginTop: 18 }}>
                    <span className="callout-icon">💡</span>
                    <div>
                      <p className="callout-title">Preview updates live</p>
                      <p className="callout-body">Check the live preview on the right to see your notification bubble animation in action. The bubble appears near the launcher button after a short delay.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* RIGHT: Live Preview */}
        <LivePreview
          primaryColor={primaryColor} userBubbleColor={userBubbleColor}
          botBubbleColor={botBubbleColor} borderRadius={borderRadius}
          fontFamily={fontFamily} botName={botName} botAvatarUrl={botAvatarUrl}
          welcomeMessage={welcomeMessage} headerCtaLabel={headerCtaLabel}
          widgetPosition={widgetPosition} launcherStyle={launcherStyle}
          themeStyle={themeStyle} bgPattern={bgPattern} quickReplies={quickReplies}
          notifEnabled={notifEnabled} notifText={notifText}
          notifAnimation={notifAnimation} launcherIcon={launcherIcon}
          notifChips={notifChips}
        />
      </div>
    </form>
  );
}
