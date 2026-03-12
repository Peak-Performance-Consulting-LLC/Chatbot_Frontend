import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { LauncherStyle, PlatformService, WidgetPosition } from "@/platform/types";
import { usePlatformAuth } from "@/platform/state/auth";

const services: PlatformService[] = ["flights", "hotels", "cars", "cruises"];
const launcherStyles: LauncherStyle[] = ["rounded", "pill", "square", "minimal"];
const fontFamilies = ["Manrope", "Inter", "Poppins", "DM Sans", "Montserrat"];

export default function CustomizationPage() {
  const { selectedTenant, updateTenantProfile, loading, error, setError } = usePlatformAuth();
  const profile = selectedTenant?.business_profile;

  const [businessType, setBusinessType] = useState(profile?.business_type || "general_travel");
  const [supportedServices, setSupportedServices] = useState<PlatformService[]>(
    profile?.supported_services || ["flights"]
  );
  const [supportPhone, setSupportPhone] = useState(profile?.support_phone || "");
  const [supportEmail, setSupportEmail] = useState(profile?.support_email || "");
  const [supportCtaLabel, setSupportCtaLabel] = useState(profile?.support_cta_label || "Connect with a specialist");
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

  useEffect(() => {
    if (!profile) {
      return;
    }

    setBusinessType(profile.business_type || "general_travel");
    setSupportedServices(profile.supported_services || ["flights"]);
    setSupportPhone(profile.support_phone || "");
    setSupportEmail(profile.support_email || "");
    setSupportCtaLabel(profile.support_cta_label || "Connect with a specialist");
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
    setSupportedServices((previous) => {
      if (previous.includes(service)) {
        const next = previous.filter((item) => item !== service);
        return next.length > 0 ? next : ["flights"];
      }
      return [...previous, service];
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSuccess("");
    setError("");

    try {
      await updateTenantProfile({
        tenant_id: tenantId,
        business_type: businessType,
        supported_services: supportedServices,
        support_phone: supportPhone || undefined,
        support_email: supportEmail || undefined,
        support_cta_label: supportCtaLabel,
        business_description: businessDescription || undefined,
        primary_color: primaryColor,
        user_bubble_color: userBubbleColor,
        bot_bubble_color: botBubbleColor,
        font_family: fontFamily,
        widget_position: widgetPosition,
        launcher_style: launcherStyle,
        window_width: windowWidth,
        window_height: windowHeight,
        border_radius: borderRadius,
        welcome_message: welcomeMessage,
        bot_name: botName,
        bot_avatar_url: botAvatarUrl || undefined
      });

      setSuccess("Customization saved. The portal preview and verified website widget will use these settings.");
    } catch {
      // handled by context
    }
  }

  return (
    <div className="platform-grid two-col">
      <section className="platform-panel">
        <h2>Customization</h2>
        <p>Control the chatbot theme, launcher, welcome copy, specialist CTA, and layout before you publish.</p>

        <form onSubmit={handleSubmit} className="platform-form-grid two-col">
          <label>
            Business type
            <input value={businessType} onChange={(event) => setBusinessType(event.target.value)} />
          </label>

          <label>
            Bot name
            <input value={botName} onChange={(event) => setBotName(event.target.value)} maxLength={80} />
          </label>

          <label>
            Support phone
            <input value={supportPhone} onChange={(event) => setSupportPhone(event.target.value)} placeholder="+1..." />
          </label>

          <label>
            CTA label
            <input value={supportCtaLabel} onChange={(event) => setSupportCtaLabel(event.target.value)} />
          </label>

          <label>
            Support email
            <input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} placeholder="support@company.com" />
          </label>

          <label>
            Avatar URL
            <input value={botAvatarUrl} onChange={(event) => setBotAvatarUrl(event.target.value)} placeholder="https://.../avatar.png" />
          </label>

          <label className="full">
            Welcome message
            <textarea rows={3} value={welcomeMessage} onChange={(event) => setWelcomeMessage(event.target.value)} />
          </label>

          <label className="full">
            Business description
            <textarea rows={4} value={businessDescription} onChange={(event) => setBusinessDescription(event.target.value)} />
          </label>

          <label>
            Primary color
            <div className="color-field">
              <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
              <input value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
            </div>
          </label>

          <label>
            User bubble color
            <div className="color-field">
              <input type="color" value={userBubbleColor} onChange={(event) => setUserBubbleColor(event.target.value)} />
              <input value={userBubbleColor} onChange={(event) => setUserBubbleColor(event.target.value)} />
            </div>
          </label>

          <label>
            Bot bubble color
            <div className="color-field">
              <input type="color" value={botBubbleColor} onChange={(event) => setBotBubbleColor(event.target.value)} />
              <input value={botBubbleColor} onChange={(event) => setBotBubbleColor(event.target.value)} />
            </div>
          </label>

          <label>
            Font family
            <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>
              {fontFamilies.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </label>

          <label>
            Widget position
            <select value={widgetPosition} onChange={(event) => setWidgetPosition(event.target.value as WidgetPosition)}>
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </label>

          <label>
            Launcher style
            <select value={launcherStyle} onChange={(event) => setLauncherStyle(event.target.value as LauncherStyle)}>
              {launcherStyles.map((style) => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </label>

          <label>
            Window width
            <input type="number" min={320} max={520} value={windowWidth} onChange={(event) => setWindowWidth(Number(event.target.value) || 380)} />
          </label>

          <label>
            Window height
            <input type="number" min={520} max={860} value={windowHeight} onChange={(event) => setWindowHeight(Number(event.target.value) || 640)} />
          </label>

          <label>
            Border radius
            <input type="number" min={8} max={36} value={borderRadius} onChange={(event) => setBorderRadius(Number(event.target.value) || 18)} />
          </label>

          <div className="full">
            <span className="label-inline">Enabled services</span>
            <div className="chip-row">
              {services.map((service) => (
                <button
                  key={service}
                  type="button"
                  className={supportedServices.includes(service) ? "chip active" : "chip"}
                  onClick={() => toggleService(service)}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="platform-error full">{error}</p> : null}
          {success ? <p className="platform-success full">{success}</p> : null}

          <button className="platform-primary-btn" disabled={loading} type="submit">
            {loading ? "Saving..." : "Save customization"}
          </button>
        </form>
      </section>

      <section className="platform-panel">
        <h3>Live theme preview</h3>
        <p>This preview updates instantly while you edit. The interactive chatbot preview remains available on the My Chatbot page.</p>

        <div className={`customization-preview preview-${widgetPosition} preview-launcher-${launcherStyle}`} style={previewStyle}>
          <div className="customization-preview-header">
            <div className="customization-preview-brand">
              {botAvatarUrl ? (
                <img src={botAvatarUrl} alt={botName} className="customization-preview-avatar" />
              ) : (
                <div className="customization-preview-avatar fallback">{botName.slice(0, 2).toUpperCase()}</div>
              )}
              <div>
                <strong>{botName}</strong>
                <p>{selectedTenant.tenant_id}</p>
              </div>
            </div>
            <span className="customization-preview-badge">{supportCtaLabel}</span>
          </div>

          <div className="customization-preview-body">
            <div className="customization-preview-message bot">
              <p>{welcomeMessage}</p>
            </div>
            <div className="customization-preview-message user">
              <p>I’d like help with a booking.</p>
            </div>
          </div>

          <div className="customization-preview-launcher">
            {botName}
          </div>
        </div>
      </section>
    </div>
  );
}
