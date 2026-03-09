export default function PricingPage() {
  return (
    <section className="platform-panel">
      <h2>Pricing</h2>
      <p>Choose a plan based on tenant volume and monthly conversation usage.</p>

      <div className="pricing-grid">
        <article className="pricing-card">
          <h3>Starter</h3>
          <p className="price">$99 / month</p>
          <ul>
            <li>1 tenant</li>
            <li>10k messages</li>
            <li>Flight + KB concierge</li>
          </ul>
        </article>

        <article className="pricing-card featured">
          <h3>Growth</h3>
          <p className="price">$299 / month</p>
          <ul>
            <li>5 tenants</li>
            <li>100k messages</li>
            <li>Flights + Hotels + Cars + Cruises</li>
          </ul>
        </article>

        <article className="pricing-card">
          <h3>Enterprise</h3>
          <p className="price">Custom</p>
          <ul>
            <li>Unlimited tenants</li>
            <li>SLA + SSO</li>
            <li>Dedicated onboarding</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
