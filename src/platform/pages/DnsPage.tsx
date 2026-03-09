import { useState } from "react";
import { usePlatformAuth } from "@/platform/state/auth";

export default function DnsPage() {
  const { selectedTenant, verifyDomain, loading, error, setError } = usePlatformAuth();
  const [status, setStatus] = useState("");

  if (!selectedTenant) {
    return <section className="platform-panel"><p>Select a tenant to manage DNS verification.</p></section>;
  }

  const tenantId = selectedTenant.tenant_id;
  const verification = selectedTenant.domain_verification;

  async function handleVerify() {
    setStatus("");
    setError("");

    try {
      await verifyDomain(tenantId);
      setStatus("DNS verification check completed.");
    } catch {
      // handled in context
    }
  }

  return (
    <section className="platform-panel">
      <h2>DNS Verification</h2>
      <p>Add TXT record below to prove domain ownership and enable strict domain enforcement.</p>

      <div className="dns-grid">
        <article>
          <span>Domain</span>
          <strong>{selectedTenant.allowed_domains?.[0] || "N/A"}</strong>
        </article>
        <article>
          <span>Status</span>
          <strong>{verification?.status || "pending"}</strong>
        </article>
      </div>

      <div className="snippet-block">
        <p><strong>TXT host</strong></p>
        <code>{verification?.txt_name || "Not generated"}</code>
        <p><strong>TXT value</strong></p>
        <code>{verification?.txt_value || "Not generated"}</code>
      </div>

      <button className="platform-primary-btn" type="button" onClick={handleVerify} disabled={loading}>
        {loading ? "Checking..." : "Verify DNS"}
      </button>

      {error ? <p className="platform-error">{error}</p> : null}
      {status ? <p className="platform-success">{status}</p> : null}
    </section>
  );
}
