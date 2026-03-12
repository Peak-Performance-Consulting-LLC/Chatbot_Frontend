import { useState } from "react";
import { getDnsReminderMessage, getDnsStatusLabel, getDnsStatusTone } from "@/platform/status";
import { usePlatformAuth } from "@/platform/state/auth";

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Not available yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function DnsPage() {
  const { selectedTenant, verifyDomain, loading, error, setError } = usePlatformAuth();
  const [status, setStatus] = useState("");

  if (!selectedTenant) {
    return <section className="platform-panel"><p>Select a tenant to manage DNS verification.</p></section>;
  }

  const tenantId = selectedTenant.tenant_id;
  const verification = selectedTenant.domain_verification;
  const tone = getDnsStatusTone(verification?.status);

  async function handleVerify() {
    setStatus("");
    setError("");

    try {
      const result = await verifyDomain(tenantId);
      setStatus(result.message);
    } catch {
      // handled in context
    }
  }

  async function copy(value: string | null | undefined) {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setStatus("Copied to clipboard.");
  }

  return (
    <section className="platform-panel dns-page">
      <h2>DNS Verification</h2>
      <p>Add the TXT record below, then keep retrying verification until the domain status shows Verified.</p>

      <div className={`platform-callout ${tone === "success" ? "success" : tone === "danger" ? "danger" : "warning"}`}>
        <strong>{getDnsStatusLabel(verification?.status)}</strong>
        <p>{getDnsReminderMessage(verification)}</p>
      </div>

      <div className="dns-grid">
        <article>
          <span>Domain</span>
          <strong>{selectedTenant.allowed_domains?.[0] || "N/A"}</strong>
        </article>
        <article>
          <span>Status</span>
          <strong>{getDnsStatusLabel(verification?.status)}</strong>
        </article>
        <article>
          <span>Last checked</span>
          <strong>{formatTimestamp(verification?.last_checked_at)}</strong>
        </article>
        <article>
          <span>Verified at</span>
          <strong>{formatTimestamp(verification?.verified_at)}</strong>
        </article>
      </div>

      <div className="snippet-block">
        <p><strong>TXT host</strong></p>
        <code>{verification?.txt_name || "Not generated"}</code>
        <p><strong>TXT value</strong></p>
        <code>{verification?.txt_value || "Not generated"}</code>
        {verification?.last_seen_records?.length ? (
          <>
            <p><strong>Latest TXT values found</strong></p>
            <code>{verification.last_seen_records.join("\n")}</code>
          </>
        ) : null}
      </div>

      <div className="action-row">
        <button className="platform-primary-btn" type="button" onClick={handleVerify} disabled={loading}>
          {loading ? "Checking..." : "Retry DNS check"}
        </button>
        <button className="platform-secondary-btn" type="button" onClick={() => copy(verification?.txt_name)}>
          Copy TXT host
        </button>
        <button className="platform-secondary-btn" type="button" onClick={() => copy(verification?.txt_value)}>
          Copy TXT value
        </button>
      </div>

      {verification?.last_error ? <p className="platform-error">{verification.last_error}</p> : null}
      {error ? <p className="platform-error">{error}</p> : null}
      {status ? <p className="platform-success">{status}</p> : null}
    </section>
  );
}
