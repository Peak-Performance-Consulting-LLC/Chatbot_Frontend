import { useState } from "react";
import { getDnsReminderMessage, getDnsStatusLabel, getDnsStatusTone } from "@/platform/status";
import { usePlatformAuth } from "@/platform/state/auth";

function formatTimestamp(value?: string | null) {
  if (!value) return "Not available yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function DnsPage() {
  const { selectedTenant, verifyDomain, loading, error, setError } = usePlatformAuth();
  const [status, setStatus] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!selectedTenant) {
    return (
      <div className="app-empty" style={{ maxWidth: 480, margin: "4rem auto" }}>
        <div className="empty-icon">🔒</div>
        <p className="empty-title">No workspace selected</p>
        <p className="empty-desc">Select a tenant to manage DNS verification.</p>
      </div>
    );
  }

  const tenantId = selectedTenant.tenant_id;
  const verification = selectedTenant.domain_verification;
  const tone = getDnsStatusTone(verification?.status);

  async function handleVerify() {
    setStatus(""); setError("");
    try {
      const result = await verifyDomain(tenantId);
      setStatus(result.message);
    } catch { /* handled in context */ }
  }

  async function copy(value: string | null | undefined, key: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  const calloutType = tone === "success" ? "success" : tone === "danger" ? "danger" : "warning";
  const calloutIcon = tone === "success" ? "✓" : "⚠";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Page header ────────────────────────────────────────── */}
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Domain Security</p>
          <h2 className="app-h1">DNS Verification</h2>
          <p className="app-lead">
            Add the TXT record below to your DNS provider, then retry verification until the domain status shows Verified.
          </p>
        </div>
        <button className="app-btn-primary" type="button" onClick={handleVerify} disabled={loading}>
          {loading ? "Checking…" : "↺ Retry DNS check"}
        </button>
      </div>

      {/* ── Status banner ──────────────────────────────────────── */}
      <div className={`app-callout ${calloutType}`}>
        <span className="callout-icon">{calloutIcon}</span>
        <div>
          <p className="callout-title">{getDnsStatusLabel(verification?.status)}</p>
          <p className="callout-body">{getDnsReminderMessage(verification)}</p>
        </div>
      </div>

      {/* ── Domain stats ───────────────────────────────────────── */}
      <div className="app-dns-grid">
        <div className="app-dns-cell">
          <p className="dns-label">Domain</p>
          <p className="dns-value">{selectedTenant.allowed_domains?.[0] || "N/A"}</p>
        </div>
        <div className="app-dns-cell">
          <p className="dns-label">Status</p>
          <p className="dns-value">{getDnsStatusLabel(verification?.status)}</p>
        </div>
        <div className="app-dns-cell">
          <p className="dns-label">Last checked</p>
          <p className="dns-value" style={{ fontSize: "0.8rem" }}>{formatTimestamp(verification?.last_checked_at)}</p>
        </div>
        <div className="app-dns-cell">
          <p className="dns-label">Verified at</p>
          <p className="dns-value" style={{ fontSize: "0.8rem" }}>{formatTimestamp(verification?.verified_at)}</p>
        </div>
      </div>

      {/* ── TXT record snippets ────────────────────────────────── */}
      <div className="app-two-col">
        <div>
          {/* TXT Host */}
          <div className="app-snippet" style={{ marginBottom: "14px" }}>
            <div className="app-snippet-label">
              <span>TXT Host</span>
              <button
                type="button"
                onClick={() => copy(verification?.txt_name, "host")}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "6px", padding: "3px 10px", color: copiedKey === "host" ? "#c9a96e" : "rgba(255,255,255,0.5)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                {copiedKey === "host" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <code>{verification?.txt_name || "Not generated yet"}</code>
          </div>

          {/* TXT Value */}
          <div className="app-snippet">
            <div className="app-snippet-label">
              <span>TXT Value</span>
              <button
                type="button"
                onClick={() => copy(verification?.txt_value, "value")}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "6px", padding: "3px 10px", color: copiedKey === "value" ? "#c9a96e" : "rgba(255,255,255,0.5)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                {copiedKey === "value" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <code style={{ wordBreak: "break-all" }}>{verification?.txt_value || "Not generated yet"}</code>
          </div>

          {/* Last seen records */}
          {verification?.last_seen_records?.length ? (
            <div className="app-snippet" style={{ marginTop: "14px" }}>
              <div className="app-snippet-label"><span>Latest TXT values found</span></div>
              <code>{verification.last_seen_records.join("\n")}</code>
            </div>
          ) : null}

          <div className="app-action-row">
            <button className="app-btn-primary" type="button" onClick={handleVerify} disabled={loading}>
              {loading ? "Checking…" : "Retry DNS check"}
            </button>
            <button className="app-btn-secondary" type="button" onClick={() => copy(verification?.txt_name, "host-btn")}>
              {copiedKey === "host-btn" ? "✓ Copied host" : "Copy TXT host"}
            </button>
            <button className="app-btn-secondary" type="button" onClick={() => copy(verification?.txt_value, "val-btn")}>
              {copiedKey === "val-btn" ? "✓ Copied value" : "Copy TXT value"}
            </button>
          </div>

          {verification?.last_error && <p className="app-error" style={{ marginTop: "12px" }}>{verification.last_error}</p>}
          {error  && <p className="app-error" style={{ marginTop: "12px" }}>{error}</p>}
          {status && <p className="app-success" style={{ marginTop: "12px" }}>{status}</p>}
        </div>

        {/* Troubleshooting */}
        <div>
          <p className="app-card-subtitle" style={{ marginBottom: "14px" }}>Troubleshooting</p>
          <div className="app-note-list">
            <div className="app-note">
              <strong>DNS propagation takes time</strong>
              <p>After adding the TXT record, changes may take up to 48 hours to propagate globally. Check back periodically.</p>
            </div>
            <div className="app-note">
              <strong>Remove conflicting TXT records</strong>
              <p>If the host already has multiple TXT values, ensure the workspace verification record is present exactly as shown.</p>
            </div>
            <div className="app-note">
              <strong>Retry after saving</strong>
              <p>Once your DNS provider confirms the record is saved, run verification again from this screen.</p>
            </div>
            <div className="app-note">
              <strong>Use a DNS lookup tool</strong>
              <p>Tools like <em>dnschecker.org</em> or <em>dig</em> can confirm your TXT record is visible globally before retrying.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
