import { useState } from "react";
import { getDnsReminderMessage, getDnsStatusLabel } from "@/platform/status";
import { usePlatformAuth } from "@/platform/state/auth";

export default function WidgetCodePage() {
  const { selectedTenant } = usePlatformAuth();
  const [status, setStatus] = useState("");

  if (!selectedTenant) {
    return <section className="platform-panel"><p>Select a tenant to access widget code.</p></section>;
  }

  const widget = selectedTenant.widget;
  const verification = selectedTenant.domain_verification;

  async function copy(value: string | null | undefined) {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setStatus("Copied to clipboard.");
  }

  if (!widget?.enabled) {
    return (
      <section className="platform-panel">
        <h2>Widget Code</h2>
        <p>You can keep testing the chatbot inside the portal. Live website install stays blocked until DNS verification succeeds.</p>

        <div className="platform-callout warning">
          <strong>{getDnsStatusLabel(verification?.status)}</strong>
          <p>{widget?.blocked_reason || getDnsReminderMessage(verification)}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="platform-panel">
      <h2>Widget Code</h2>
      <p>Install the widget on your verified website. Requests remain tenant-scoped and domain-validated.</p>

      <div className="snippet-block">
        <p><strong>Embed URL</strong></p>
        <textarea readOnly rows={3} value={widget.embed_url || ""} />
        <button className="platform-secondary-btn" type="button" onClick={() => copy(widget.embed_url)}>Copy URL</button>
      </div>

      <div className="snippet-block">
        <p><strong>Script snippet</strong></p>
        <textarea readOnly rows={12} value={widget.script_snippet || ""} />
        <button className="platform-secondary-btn" type="button" onClick={() => copy(widget.script_snippet)}>Copy script</button>
      </div>

      <div className="snippet-block">
        <p><strong>React snippet</strong></p>
        <textarea readOnly rows={10} value={widget.react_snippet || ""} />
        <button className="platform-secondary-btn" type="button" onClick={() => copy(widget.react_snippet)}>Copy React usage</button>
      </div>

      {status ? <p className="platform-success">{status}</p> : null}
    </section>
  );
}
