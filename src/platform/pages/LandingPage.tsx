import { Link } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

export default function LandingPage() {
  const { token } = usePlatformAuth();
  const dashboardPath = "/platform/app/overview";

  return (
    <div className="platform-landing">
      <header className="landing-topbar">
        <div className="landing-brand">
          <span className="landing-brand-mark">AC</span>
          <div>
            <strong>AeroConcierge Platform</strong>
            <p>Multi-tenant travel concierge</p>
          </div>
        </div>

        <div className="landing-topbar-actions">
          <Link className="landing-link-btn" to="/platform/login">Login</Link>
          <Link className="landing-primary-btn" to="/platform/signup">Create Workspace</Link>
        </div>
      </header>

      <section className="landing-hero">
        <div>
          <p className="landing-eyebrow">Deploy chatbot platform on Vercel</p>
          <h1>Landing to signup to dashboard to website connect to go-live</h1>
          <p>
            Launch tenant-specific chatbot widgets with domain verification, knowledge ingestion from sitemap/docs,
            and guided travel service flows from one dashboard.
          </p>

          <div className="landing-action-row">
            <Link className="landing-primary-btn" to={token ? dashboardPath : "/platform/signup"}>
              {token ? "Open Dashboard" : "Start Free Setup"}
            </Link>
            <Link className="landing-link-btn" to="/platform/login">
              I already have an account
            </Link>
            <Link className="landing-link-btn" to="/demo">
              Open widget demo
            </Link>
          </div>
        </div>

        <article className="landing-callout">
          <h3>What you configure inside portal</h3>
          <ul>
            <li>Business profile: flights/hotels/cars/cruises + CTA phone/email</li>
            <li>Domain ownership via DNS TXT verification</li>
            <li>Knowledge base from sitemap, pages, and FAQ text</li>
            <li>Widget snippet and tenant-scoped chatbot preview</li>
          </ul>
        </article>
      </section>

      <section className="landing-grid">
        <article className="landing-card">
          <h4>1. Create Workspace</h4>
          <p>Sign up with company details and website URL. Tenant is generated automatically.</p>
        </article>
        <article className="landing-card">
          <h4>2. Verify Domain</h4>
          <p>Copy TXT record, verify DNS ownership, and enforce secure domain routing.</p>
        </article>
        <article className="landing-card">
          <h4>3. Feed Knowledge</h4>
          <p>Paste sitemap/docs/FAQ and run index. Replies are scoped to that website only.</p>
        </article>
        <article className="landing-card">
          <h4>4. Install Widget</h4>
          <p>Copy script/React snippet and test in portal preview before production launch.</p>
        </article>
      </section>
    </div>
  );
}
