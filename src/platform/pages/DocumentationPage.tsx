import { Link } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="app-docs-code">
      <code>{code}</code>
    </pre>
  );
}

export default function DocumentationPage() {
  const { selectedTenant } = usePlatformAuth();
  const tenantName = selectedTenant?.name || "your workspace";
  const widget = selectedTenant?.widget;
  const widgetScript =
    widget?.script_snippet ||
    `<script src="https://chatbot-backend-theta-two.vercel.app/api/embed?tenant_id=starlux-travel"></script>`;
  const reactSnippet =
    widget?.react_snippet ||
    `import { ChatWidget } from "@/components/ChatWidget";

export function SupportWidget() {
  return <ChatWidget tenantId="${selectedTenant?.tenant_id || "your-tenant"}" />;
}`;
  const embedUrl = widget?.embed_url || "https://your-widget-host.example/?embed=1&tenant_id=your-tenant";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Documentation</p>
          <h2 className="app-h1">Operator guide for {tenantName}</h2>
          <p className="app-lead">
            Use this page as the fast path from signup to deployment: create a workspace, verify
            DNS, index sources, then publish the widget with the generated snippet.
          </p>
        </div>
        <Link className="app-btn-secondary" to="/platform/app/pricing">
          View plans
        </Link>
      </div>

      {!selectedTenant ? (
        <div className="app-callout info">
          <div>
            <div className="callout-title">Create a workspace first</div>
            <div className="callout-body">
              Documentation becomes tenant-specific once a workspace exists. The examples below
              still show the full setup flow and API surface.
            </div>
          </div>
        </div>
      ) : null}

      <div className="app-docs-layout">
        <div className="app-docs-sections">
          <details className="app-docs-section" open>
            <summary>
              <span>Getting Started</span>
              <span className="app-docs-summary-note">Signup to live widget</span>
            </summary>
            <div className="app-docs-content">
              <ol className="app-docs-list">
                <li>Create your platform account and initial workspace.</li>
                <li>Confirm the primary website domain and add the TXT verification record.</li>
                <li>Save sitemap URLs, FAQ content, or docs so the knowledge base can be indexed.</li>
                <li>Open Widget Code and publish the generated script or embed URL on your site.</li>
              </ol>
            </div>
          </details>

          <details className="app-docs-section">
            <summary>
              <span>Widget Embed</span>
              <span className="app-docs-summary-note">Script, React, and iframe options</span>
            </summary>
            <div className="app-docs-content">
              <p className="app-docs-copy">Standard script snippet</p>
              <CodeBlock code={widgetScript} />
              <p className="app-docs-copy">React component snippet</p>
              <CodeBlock code={reactSnippet} />
              <p className="app-docs-copy">Embed URL</p>
              <CodeBlock code={embedUrl} />
            </div>
          </details>

          <details className="app-docs-section">
            <summary>
              <span>API Reference</span>
              <span className="app-docs-summary-note">Core platform endpoints</span>
            </summary>
            <div className="app-docs-content">
              <div className="app-docs-table-wrap">
                <table className="app-docs-table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Endpoint</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>GET</td>
                      <td>/api/platform/me</td>
                      <td>Load the authenticated profile, workspaces, and subscription.</td>
                    </tr>
                    <tr>
                      <td>POST</td>
                      <td>/api/platform/workspaces</td>
                      <td>Create another tenant workspace within your plan limit.</td>
                    </tr>
                    <tr>
                      <td>POST</td>
                      <td>/api/platform/verify-domain</td>
                      <td>Check the TXT record and confirm domain ownership.</td>
                    </tr>
                    <tr>
                      <td>PUT</td>
                      <td>/api/platform/sources</td>
                      <td>Replace sitemap, URL, FAQ, and doc sources for a workspace.</td>
                    </tr>
                    <tr>
                      <td>GET / POST</td>
                      <td>/api/platform/subscription</td>
                      <td>Read the current plan or create a hosted Stripe Checkout session for Starter or Growth.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </details>

          <details className="app-docs-section">
            <summary>
              <span>Customization</span>
              <span className="app-docs-summary-note">Brand controls</span>
            </summary>
            <div className="app-docs-content">
              <ul className="app-docs-list">
                <li>Set primary, user bubble, and bot bubble colors to match the site brand.</li>
                <li>Choose the font family, launcher style, widget position, and theme variant.</li>
                <li>Update welcome text, quick replies, bot identity, and top-bar CTA messaging.</li>
              </ul>
            </div>
          </details>

          <details className="app-docs-section">
            <summary>
              <span>Knowledge Base</span>
              <span className="app-docs-summary-note">Sources and re-indexing</span>
            </summary>
            <div className="app-docs-content">
              <ul className="app-docs-list">
                <li>Use sitemap URLs for broad coverage and add standalone URLs for priority pages.</li>
                <li>Paste FAQ or policy text when content is not publicly linked from the site.</li>
                <li>Run indexing again any time source content changes or you add new documents.</li>
              </ul>
            </div>
          </details>

          <details className="app-docs-section">
            <summary>
              <span>Pricing &amp; Plans</span>
              <span className="app-docs-summary-note">Trial and limits overview</span>
            </summary>
            <div className="app-docs-content">
              <div className="app-docs-plan-grid">
                <div className="app-docs-plan-card">
                  <strong>Trial</strong>
                  <span>14 days, 5 workspaces, 100 visitor messages/month</span>
                </div>
                <div className="app-docs-plan-card">
                  <strong>Starter</strong>
                  <span>1 workspace, 10,000 messages/month, $99/month</span>
                </div>
                <div className="app-docs-plan-card">
                  <strong>Growth</strong>
                  <span>5 workspaces, 100,000 messages/month, $299/month</span>
                </div>
              </div>
              <Link className="app-btn-primary" to="/platform/app/pricing">
                Open pricing page
              </Link>
            </div>
          </details>
        </div>

        <aside className="app-card app-docs-sidebar">
          <p className="app-card-subtitle">Deployment checklist</p>
          <h3 className="app-card-title">Before you launch</h3>
          <ul className="app-checklist">
            <li>Domain verification shows as verified.</li>
            <li>Knowledge base status is ready or warning with reviewed sources.</li>
            <li>Widget snippet or embed URL is installed on the live site.</li>
            <li>Pricing plan matches your expected workspace count.</li>
          </ul>
          <div className="app-action-row">
            <Link className="app-btn-secondary" to="/platform/app/widget">
              Open widget code
            </Link>
            <Link className="app-btn-secondary" to="/platform/app/knowledge">
              Review sources
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
