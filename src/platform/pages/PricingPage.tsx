export default function PricingPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Plans</p>
          <h2 className="app-h1">Simple, transparent pricing</h2>
          <p className="app-lead">
            Choose a plan based on tenant volume and monthly conversation usage. All plans include
            the full concierge feature set — no hidden limits on core AI functionality.
          </p>
        </div>
      </div>

      {/* ── Pricing grid ─────────────────────────────────────────── */}
      <div className="app-pricing-grid">

        {/* Starter */}
        <div className="app-pricing-card">
          <span className="app-pricing-tag neutral">Starter</span>
          <h3 className="app-pricing-name">Starter</h3>
          <p className="app-pricing-price">$99 <small>/ month</small></p>
          <div className="app-pricing-divider" />
          <ul className="app-pricing-features">
            <li>1 tenant workspace</li>
            <li>10,000 messages / month</li>
            <li>Flight + Knowledge Base concierge</li>
            <li>Standard email support</li>
            <li>DNS domain verification</li>
          </ul>
          <button type="button" className="app-btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
            Start with Starter
          </button>
        </div>

        {/* Growth (featured) */}
        <div className="app-pricing-card featured">
          <span className="app-pricing-tag featured">Most Popular</span>
          <h3 className="app-pricing-name">Growth</h3>
          <p className="app-pricing-price">$299 <small>/ month</small></p>
          <div className="app-pricing-divider" />
          <ul className="app-pricing-features">
            <li>5 tenant workspaces</li>
            <li>100,000 messages / month</li>
            <li>Flights + Hotels + Cars + Cruises</li>
            <li>Priority support</li>
            <li>Advanced brand customization</li>
            <li>Analytics dashboard (soon)</li>
          </ul>
          <button type="button" className="app-btn-gold" style={{ width: "100%", justifyContent: "center" }}>
            Choose Growth →
          </button>
        </div>

        {/* Enterprise */}
        <div className="app-pricing-card">
          <span className="app-pricing-tag enterprise">Enterprise</span>
          <h3 className="app-pricing-name">Enterprise</h3>
          <p className="app-pricing-price">Custom</p>
          <div className="app-pricing-divider" />
          <ul className="app-pricing-features">
            <li>Unlimited tenant workspaces</li>
            <li>SLA + SSO integration</li>
            <li>Dedicated onboarding engineer</li>
            <li>Advanced security controls</li>
            <li>Custom AI model fine-tuning</li>
            <li>White-label deployment</li>
          </ul>
          <button type="button" className="app-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Contact Sales
          </button>
        </div>

      </div>

      {/* ── Feature comparison note ───────────────────────────────── */}
      <div className="app-card" style={{ display: "flex", gap: "32px", flexWrap: "wrap", justifyContent: "space-around", textAlign: "center" }}>
        {[
          { icon: "🔒", title: "All plans secured", desc: "JWT-auth, domain verification, tenant isolation" },
          { icon: "⚡", title: "Instant setup", desc: "Go live in minutes with our guided setup wizard" },
          { icon: "🔄", title: "Cancel anytime", desc: "No long-term contracts. Monthly billing only." },
          { icon: "🛠", title: "Dedicated support", desc: "Growth & Enterprise plans get priority response" },
        ].map((item) => (
          <div key={item.title} style={{ flex: "1 1 180px", padding: "8px" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{item.icon}</div>
            <p style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: "1rem", fontWeight: 500, color: "#0a0a0f", margin: "0 0 4px" }}>{item.title}</p>
            <p style={{ fontSize: "0.78rem", color: "rgba(10,10,15,0.5)", margin: 0 }}>{item.desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
