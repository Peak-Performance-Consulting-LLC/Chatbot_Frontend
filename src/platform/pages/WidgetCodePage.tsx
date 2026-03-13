import { useState } from "react";
import { getDnsReminderMessage, getDnsStatusLabel } from "@/platform/status";
import { usePlatformAuth } from "@/platform/state/auth";

export default function WidgetCodePage() {
  const { selectedTenant } = usePlatformAuth();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!selectedTenant) {
    return (
      <div className="app-empty" style={{ maxWidth: 480, margin: "4rem auto" }}>
        <div className="empty-icon">🔌</div>
        <p className="empty-title">No workspace selected</p>
        <p className="empty-desc">Select a tenant to access widget code.</p>
      </div>
    );
  }

  const widget = selectedTenant.widget;
  const verification = selectedTenant.domain_verification;

  async function copy(value: string | null | undefined, key: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function SnippetBlock({
    label,
    value,
    rows,
    copyKey,
  }: { label: string; value: string | null | undefined; rows: number; copyKey: string }) {
    return (
      <div className="app-snippet" style={{ marginBottom: "0" }}>
        <div className="app-snippet-label">
          <span>{label}</span>
          <button
            type="button"
            onClick={() => copy(value, copyKey)}
            style={{
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "6px",
              padding: "3px 12px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit",
              color: copiedKey === copyKey ? "#c9a96e" : "rgba(255,255,255,0.5)",
            }}
          >
            {copiedKey === copyKey ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <textarea readOnly rows={rows} value={value || ""} style={{ width: "100%", fontFamily: "'Fira Code','Fira Mono','Courier New',monospace", fontSize: "0.78rem", color: "rgba(255,255,255,0.82)", background: "transparent", border: "none", outline: "none", resize: "none", padding: "0" }} />
      </div>
    );
  }

  /* ── Widget not yet enabled (DNS not verified) ────────────── */
  if (!widget?.enabled) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="app-page-header">
          <div>
            <p className="app-kicker">Deployment</p>
            <h2 className="app-h1">Widget Code</h2>
            <p className="app-lead">
              You can keep testing the chatbot inside the portal. Live website install stays
              blocked until DNS verification succeeds.
            </p>
          </div>
        </div>

        <div className="app-callout warning">
          <span className="callout-icon">⚠</span>
          <div>
            <p className="callout-title">{getDnsStatusLabel(verification?.status)}</p>
            <p className="callout-body">{widget?.blocked_reason || getDnsReminderMessage(verification)}</p>
          </div>
        </div>

        <div className="app-two-col">
          <div className="app-note-list">
            <div className="app-note">
              <strong>Why verification is required</strong>
              <p>DNS verification confirms the widget is only installed on the approved domain for this workspace, preventing misuse.</p>
            </div>
            <div className="app-note">
              <strong>What you can do now</strong>
              <p>Keep testing inside the portal preview, refine the brand styling, and finish DNS setup before deploying.</p>
            </div>
            <div className="app-note">
              <strong>How long does it take?</strong>
              <p>DNS propagation typically takes 5 minutes to 48 hours. Once propagated, use the DNS page to retry verification.</p>
            </div>
          </div>

          {/* Placeholder card */}
          <div className="app-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 260, background: "rgba(10,10,15,0.02)", border: "1px dashed rgba(10,10,15,0.15)" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "12px", opacity: 0.3 }}>🔒</div>
            <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "1.15rem", color: "#0a0a0f", margin: "0 0 6px" }}>
              Widget code locked
            </p>
            <p style={{ fontSize: "0.78rem", color: "rgba(10,10,15,0.45)", maxWidth: 240, margin: "0 auto" }}>
              Complete DNS verification to unlock your embed URL, script snippet, and React usage.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Widget enabled, show code ────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Deployment</p>
          <h2 className="app-h1">Widget Code</h2>
          <p className="app-lead">
            Install the widget on your verified website. Requests remain tenant-scoped and domain-validated.
          </p>
        </div>
        <div className="app-callout success" style={{ margin: 0, padding: "10px 16px" }}>
          <span className="callout-icon">✓</span>
          <div>
            <p className="callout-title" style={{ margin: 0 }}>Domain verified — widget live</p>
          </div>
        </div>
      </div>

      {/* ── Snippets ─────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <SnippetBlock label="Embed URL" value={widget.embed_url} rows={2} copyKey="url" />
        <SnippetBlock label="Script snippet" value={widget.script_snippet} rows={10} copyKey="script" />
        <SnippetBlock label="React snippet" value={widget.react_snippet} rows={8} copyKey="react" />
      </div>

      {/* ── Installation steps ───────────────────────────────── */}
      <div className="app-card">
        <p className="app-card-title">Installation steps</p>
        <div className="app-note-list">
          <div className="app-note">
            <strong>Step 1 – Choose a snippet</strong>
            <p>Use the script snippet for plain HTML websites, or the React snippet for React / Next.js app integrations.</p>
          </div>
          <div className="app-note">
            <strong>Step 2 – Place before <code style={{ fontSize: "0.75rem" }}>&lt;/body&gt;</code></strong>
            <p>Add the script tag just before the closing body tag on every page you want the widget to appear.</p>
          </div>
          <div className="app-note">
            <strong>Step 3 – Verified domain only</strong>
            <p>Install the widget on the verified domain only. Requests are tenant-validated and will be rejected on unverified domains.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
