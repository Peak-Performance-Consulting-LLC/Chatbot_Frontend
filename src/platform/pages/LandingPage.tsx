import { Link } from "react-router-dom";
import PlatformLogo from "@/platform/components/PlatformLogo";
import { usePlatformAuth } from "@/platform/state/auth";

export default function LandingPage() {
  const { token } = usePlatformAuth();
  const dashboardPath = "/platform/app/overview";

  return (
    <div className="platform-landing">
      <header className="landing-topbar">
        <div className="landing-brand">
          <PlatformLogo className="landing-brand-image" />
          <div>
            <strong>AeroConcierge Platform</strong>
            <p>Travel commerce orchestration</p>
          </div>
        </div>

        <div className="landing-topbar-actions">
          <Link className="landing-link-btn" to="/platform/login">Login</Link>
          <Link className="landing-primary-btn" to="/platform/signup">Create Workspace</Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Premium concierge platform for travel brands</p>
          <h1>Launch a branded AI booking desk that feels like your best sales specialist.</h1>
          <p>
            Turn your website into a verified, tenant-safe concierge for flights, hotels, cars, cruises, and support.
            Onboard the brand, verify the domain, ingest the site, then deploy a widget that answers only from that
            business.
          </p>

          <div className="landing-action-row">
            <Link className="landing-primary-btn" to={token ? dashboardPath : "/platform/signup"}>
              {token ? "Open Dashboard" : "Start Building"}
            </Link>
            <Link className="landing-link-btn" to="/platform/login">
              Login to existing workspace
            </Link>
            <Link className="landing-link-btn" to="/demo">
              Preview live widget
            </Link>
          </div>

          <div className="landing-chip-row">
            <span className="landing-chip">Flights</span>
            <span className="landing-chip">Hotels</span>
            <span className="landing-chip">Cars</span>
            <span className="landing-chip">Cruises</span>
            <span className="landing-chip">Multi-tenant RAG</span>
          </div>

          <div className="landing-metric-row">
            <article className="landing-metric-card">
              <strong>Domain-verified</strong>
              <span>Each bot is locked to its own website and tenant knowledge.</span>
            </article>
            <article className="landing-metric-card accent">
              <strong>Operator-ready</strong>
              <span>Widget code, DNS records, business profile, and CTA routing in one flow.</span>
            </article>
            <article className="landing-metric-card warm">
              <strong>Live deal engine</strong>
              <span>Flight results come only from your configured live search API.</span>
            </article>
          </div>
        </div>

        <aside className="landing-showcase">
          <div className="landing-showcase-glow" />

          <article className="landing-console-card">
            <div className="landing-console-head">
              <div>
                <p>Workspace signal board</p>
                <h3>Sapphire Travels</h3>
              </div>
              <span className="landing-status-pill">Ready for launch</span>
            </div>

            <div className="landing-console-grid">
              <div className="landing-console-panel">
                <span className="landing-console-label">Onboarding</span>
                <strong>Domain, data, widget</strong>
                <ul>
                  <li>TXT verification record generated</li>
                  <li>Sitemap + policy docs connected</li>
                  <li>Specialist CTA synced to brand profile</li>
                </ul>
              </div>

              <div className="landing-console-panel warm">
                <span className="landing-console-label">Live preview</span>
                <strong>Assistant + deal cards</strong>
                <div className="landing-mini-chat">
                  <div className="landing-mini-bubble assistant">Welcome to Sapphire Travels. How can I help today?</div>
                  <div className="landing-mini-bubble user">Need business class fares from JFK to LHR.</div>
                  <div className="landing-mini-deal">
                    <span>SWISS</span>
                    <strong>469.25 USD</strong>
                    <small>Specialist CTA attached</small>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="landing-proof-strip">
        <article className="landing-proof-card">
          <p>Multi-site control</p>
          <strong>One platform, isolated tenant knowledge bases</strong>
        </article>
        <article className="landing-proof-card">
          <p>Brand-safe setup</p>
          <strong>Support phone, service mix, and domain rules per workspace</strong>
        </article>
        <article className="landing-proof-card">
          <p>Responsive deployment</p>
          <strong>Works across desktop, tablet, mobile, and embed mode</strong>
        </article>
      </section>

      <section className="landing-grid">
        <article className="landing-card">
          <span className="landing-card-index">01</span>
          <h4>Create the workspace</h4>
          <p>Signup generates the tenant, the dashboard shell, and the widget-ready account structure.</p>
        </article>
        <article className="landing-card">
          <span className="landing-card-index">02</span>
          <h4>Verify the domain</h4>
          <p>DNS TXT verification protects tenant routing and locks answers to the correct website.</p>
        </article>
        <article className="landing-card">
          <span className="landing-card-index">03</span>
          <h4>Feed business knowledge</h4>
          <p>Ingest sitemap pages, docs, and policy text so responses stay grounded in the site content.</p>
        </article>
        <article className="landing-card">
          <span className="landing-card-index">04</span>
          <h4>Deploy the widget</h4>
          <p>Use the generated snippet, preview the conversation flow, then launch on production.</p>
        </article>
      </section>

      <section className="landing-service-band">
        <div className="landing-service-copy">
          <p className="landing-section-kicker">Built for travel operators, not generic chatbots</p>
          <h2>Handle sales, support, and service discovery without losing brand control.</h2>
        </div>

        <div className="landing-service-grid">
          <article className="landing-service-card teal">
            <h3>Flight concierge</h3>
            <p>Guided slot filling, place suggestions, live fares, deal cards, and specialist handoff.</p>
          </article>
          <article className="landing-service-card sand">
            <h3>Hotel, car, cruise capture</h3>
            <p>Structured lead capture flows route high-intent visitors to the right booking specialist.</p>
          </article>
          <article className="landing-service-card mist">
            <h3>Tenant-specific knowledge</h3>
            <p>Each workspace retrieves only its own RAG context, policies, sources, and CTA details.</p>
          </article>
        </div>
      </section>

      <section className="landing-bottom-cta">
        <div>
          <p className="landing-section-kicker">Go from site URL to launch-ready concierge</p>
          <h2>Build a platform experience that feels premium before the first message is even sent.</h2>
        </div>

        <div className="landing-action-row">
          <Link className="landing-primary-btn" to={token ? dashboardPath : "/platform/signup"}>
            {token ? "Continue setup" : "Create Workspace"}
          </Link>
          <Link className="landing-link-btn" to="/demo">
            View widget demo
          </Link>
        </div>
      </section>
    </div>
  );
}
