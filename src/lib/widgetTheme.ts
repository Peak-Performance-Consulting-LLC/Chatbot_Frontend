export type WidgetThemeStyle = "standard" | "glass" | "clay" | "dark" | "minimal";

type WidgetSurfaceInput = {
  primaryColor: string;
  botBubbleColor: string;
  themeStyle: WidgetThemeStyle;
};

export type WidgetSurfaceTokens = {
  shellBg: string;
  panelBg: string;
  threadBg: string;
  headerBg: string;
  headerInk: string;
  headerMuted: string;
  headerBadgeBg: string;
  headerBadgeColor: string;
  headerActionBg: string;
  headerActionBorder: string;
  headerActionColor: string;
  headerActionHoverBg: string;
  headerActionHoverBorder: string;
  headerAvatarBg: string;
  headerAvatarColor: string;
  composerBg: string;
  inputBg: string;
  peekBg: string;
  peekBorder: string;
  peekPillBg: string;
  peekPillColor: string;
  line: string;
  ink: string;
  muted: string;
  assistantBubbleBorder: string;
  assistantBubbleShadow: string;
};

function normalizeHex(input: string | undefined, fallback: string) {
  const normalized = input?.trim().replace("#", "") || "";
  if (/^[a-fA-F0-9]{6}$/.test(normalized)) {
    return `#${normalized.toLowerCase()}`;
  }
  return fallback;
}

function hexToRgb(input: string) {
  const normalized = normalizeHex(input, "#000000").slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function mixHex(source: string, target: string, sourceWeight: number) {
  const start = hexToRgb(source);
  const end = hexToRgb(target);
  const weight = Math.min(1, Math.max(0, sourceWeight));
  const mixChannel = (a: number, b: number) => Math.round(a * weight + b * (1 - weight));

  const r = mixChannel(start.r, end.r);
  const g = mixChannel(start.g, end.g);
  const b = mixChannel(start.b, end.b);

  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function withAlpha(input: string, alpha: number) {
  const { r, g, b } = hexToRgb(input);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}

function getReadableTextColor(input: string, light = "#ffffff", dark = "#0a0a0f") {
  const { r, g, b } = hexToRgb(input);
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.42 ? dark : light;
}

export function getWidgetSurfaceTokens(input: WidgetSurfaceInput): WidgetSurfaceTokens {
  const brand = normalizeHex(input.primaryColor, "#006d77");
  const assistant = normalizeHex(input.botBubbleColor, "#edf6f9");
  const headerInk = getReadableTextColor(brand);
  const lightHeader = headerInk === "#ffffff";

  if (input.themeStyle === "dark") {
    return {
      shellBg: "linear-gradient(180deg, rgba(12,18,30,0.98), rgba(8,10,22,0.995))",
      panelBg: "#0b1220",
      threadBg: "#111827",
      headerBg: "rgba(10,16,28,0.92)",
      headerInk: "#f3f6fb",
      headerMuted: "rgba(237,242,247,0.72)",
      headerBadgeBg: "rgba(255,255,255,0.08)",
      headerBadgeColor: "#f3f6fb",
      headerActionBg: "rgba(255,255,255,0.08)",
      headerActionBorder: "rgba(255,255,255,0.12)",
      headerActionColor: "#f3f6fb",
      headerActionHoverBg: "rgba(255,255,255,0.12)",
      headerActionHoverBorder: "rgba(255,255,255,0.18)",
      headerAvatarBg: "#142033",
      headerAvatarColor: "#f3f6fb",
      composerBg: "rgba(10,16,28,0.98)",
      inputBg: "rgba(255,255,255,0.06)",
      peekBg: "rgba(12,18,30,0.96)",
      peekBorder: "rgba(255,255,255,0.1)",
      peekPillBg: "rgba(255,255,255,0.08)",
      peekPillColor: "rgba(255,255,255,0.88)",
      line: "rgba(255,255,255,0.08)",
      ink: "#f3f6fb",
      muted: "rgba(237,242,247,0.72)",
      assistantBubbleBorder: "1px solid rgba(255,255,255,0.08)",
      assistantBubbleShadow: "0 2px 8px rgba(10,10,15,0.18)"
    };
  }

  if (input.themeStyle === "glass") {
    return {
      shellBg: "linear-gradient(180deg, rgba(255,255,255,0.58), rgba(238,244,255,0.44))",
      panelBg: "rgba(255,255,255,0.26)",
      threadBg: "rgba(255,255,255,0.2)",
      headerBg: "rgba(255,255,255,0.34)",
      headerInk: "#0a0a0f",
      headerMuted: "rgba(10,10,15,0.62)",
      headerBadgeBg: withAlpha(brand, 0.1),
      headerBadgeColor: brand,
      headerActionBg: "rgba(255,255,255,0.4)",
      headerActionBorder: "rgba(255,255,255,0.45)",
      headerActionColor: "#0a0a0f",
      headerActionHoverBg: "rgba(255,255,255,0.56)",
      headerActionHoverBorder: "rgba(255,255,255,0.6)",
      headerAvatarBg: mixHex(brand, "#ffffff", 0.28),
      headerAvatarColor: "#0a0a0f",
      composerBg: "rgba(255,255,255,0.28)",
      inputBg: "rgba(255,255,255,0.55)",
      peekBg: "rgba(255,255,255,0.68)",
      peekBorder: "rgba(255,255,255,0.28)",
      peekPillBg: withAlpha(brand, 0.12),
      peekPillColor: brand,
      line: "rgba(255,255,255,0.28)",
      ink: "#0a0a0f",
      muted: "rgba(10,10,15,0.6)",
      assistantBubbleBorder: "1px solid rgba(255,255,255,0.34)",
      assistantBubbleShadow: "0 8px 18px rgba(10,10,15,0.08)"
    };
  }

  if (input.themeStyle === "minimal") {
    return {
      shellBg: "#ffffff",
      panelBg: "#fafafa",
      threadBg: "#ffffff",
      headerBg: "rgba(255,255,255,0.98)",
      headerInk: "#0a0a0f",
      headerMuted: "rgba(10,10,15,0.62)",
      headerBadgeBg: withAlpha(brand, 0.08),
      headerBadgeColor: brand,
      headerActionBg: "rgba(10,10,15,0.04)",
      headerActionBorder: "rgba(10,10,15,0.08)",
      headerActionColor: "#0a0a0f",
      headerActionHoverBg: "rgba(10,10,15,0.08)",
      headerActionHoverBorder: withAlpha(brand, 0.2),
      headerAvatarBg: mixHex(brand, "#ffffff", 0.8),
      headerAvatarColor: "#ffffff",
      composerBg: "#ffffff",
      inputBg: "#ffffff",
      peekBg: "#ffffff",
      peekBorder: withAlpha(brand, 0.12),
      peekPillBg: withAlpha(brand, 0.08),
      peekPillColor: brand,
      line: "rgba(10,10,15,0.08)",
      ink: "#0a0a0f",
      muted: "rgba(10,10,15,0.6)",
      assistantBubbleBorder: "1px solid rgba(10,10,15,0.08)",
      assistantBubbleShadow: "0 2px 8px rgba(10,10,15,0.04)"
    };
  }

  if (input.themeStyle === "clay") {
    return {
      shellBg: `linear-gradient(180deg, ${mixHex(brand, assistant, 0.18)}, ${mixHex(brand, "#ffffff", 0.1)})`,
      panelBg: mixHex(brand, assistant, 0.16),
      threadBg: mixHex(brand, assistant, 0.2),
      headerBg: brand,
      headerInk,
      headerMuted: lightHeader ? "rgba(255,255,255,0.82)" : "rgba(10,10,15,0.66)",
      headerBadgeBg: lightHeader ? "rgba(255,255,255,0.18)" : withAlpha(brand, 0.1),
      headerBadgeColor: lightHeader ? "#ffffff" : brand,
      headerActionBg: lightHeader ? "rgba(255,255,255,0.14)" : "rgba(10,10,15,0.06)",
      headerActionBorder: lightHeader ? "rgba(255,255,255,0.2)" : withAlpha(brand, 0.14),
      headerActionColor: headerInk,
      headerActionHoverBg: lightHeader ? "rgba(255,255,255,0.2)" : "rgba(10,10,15,0.09)",
      headerActionHoverBorder: lightHeader ? "rgba(255,255,255,0.28)" : withAlpha(brand, 0.2),
      headerAvatarBg: lightHeader ? mixHex(brand, "#000000", 0.76) : mixHex(brand, "#ffffff", 0.24),
      headerAvatarColor: "#ffffff",
      composerBg: mixHex(brand, "#ffffff", 0.05),
      inputBg: mixHex(brand, "#ffffff", 0.08),
      peekBg: "#ffffff",
      peekBorder: withAlpha(brand, 0.16),
      peekPillBg: withAlpha(brand, 0.14),
      peekPillColor: brand,
      line: withAlpha(brand, 0.16),
      ink: "#0a0a0f",
      muted: "rgba(10,10,15,0.62)",
      assistantBubbleBorder: `1px solid ${withAlpha(brand, 0.12)}`,
      assistantBubbleShadow: "3px 3px 0 rgba(10,10,15,0.08), 0 8px 18px rgba(10,10,15,0.08)"
    };
  }

  return {
    shellBg: `linear-gradient(180deg, ${mixHex(brand, "#ffffff", 0.12)}, ${mixHex(brand, assistant, 0.06)})`,
    panelBg: mixHex(brand, assistant, 0.1),
    threadBg: mixHex(brand, assistant, 0.14),
    headerBg: brand,
    headerInk,
    headerMuted: lightHeader ? "rgba(255,255,255,0.82)" : "rgba(10,10,15,0.66)",
    headerBadgeBg: lightHeader ? "rgba(255,255,255,0.16)" : withAlpha(brand, 0.08),
    headerBadgeColor: lightHeader ? "#ffffff" : brand,
    headerActionBg: lightHeader ? "rgba(255,255,255,0.14)" : "rgba(10,10,15,0.05)",
    headerActionBorder: lightHeader ? "rgba(255,255,255,0.22)" : withAlpha(brand, 0.14),
    headerActionColor: headerInk,
    headerActionHoverBg: lightHeader ? "rgba(255,255,255,0.2)" : "rgba(10,10,15,0.09)",
    headerActionHoverBorder: lightHeader ? "rgba(255,255,255,0.3)" : withAlpha(brand, 0.2),
    headerAvatarBg: lightHeader ? mixHex(brand, "#000000", 0.76) : mixHex(brand, "#ffffff", 0.24),
    headerAvatarColor: "#ffffff",
    composerBg: "#ffffff",
    inputBg: mixHex(brand, assistant, 0.06),
    peekBg: "#ffffff",
    peekBorder: withAlpha(brand, 0.14),
    peekPillBg: withAlpha(brand, 0.12),
    peekPillColor: brand,
    line: withAlpha(brand, 0.12),
    ink: "#0a0a0f",
    muted: "rgba(10,10,15,0.6)",
    assistantBubbleBorder: `1px solid ${withAlpha(brand, 0.1)}`,
    assistantBubbleShadow: "0 2px 8px rgba(10,10,15,0.06)"
  };
}
