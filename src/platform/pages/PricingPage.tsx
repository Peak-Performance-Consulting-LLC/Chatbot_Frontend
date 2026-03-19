import { useEffect, useState } from "react";
import { platformGetSubscription, platformSubscribe } from "@/lib/platformApi";
import { usePlatformAuth } from "@/platform/state/auth";
import type { PlatformSubscription, PlatformSubscriptionPlan } from "@/platform/types";

type PlanCard = {
  plan: "starter" | "growth" | "enterprise";
  name: string;
  tag: string;
  tagClassName: string;
  price: string;
  priceSuffix?: string;
  description: string;
  featured?: boolean;
  features: string[];
};

const PLAN_CARDS: PlanCard[] = [
  {
    plan: "starter",
    name: "Starter",
    tag: "Starter",
    tagClassName: "neutral",
    price: "$99",
    priceSuffix: "/ month",
    description: "For a single brand that needs a polished concierge and predictable monthly usage.",
    features: [
      "1 tenant workspace",
      "10,000 messages / month",
      "Flight + knowledge base concierge",
      "Standard email support",
      "DNS domain verification"
    ]
  },
  {
    plan: "growth",
    name: "Growth",
    tag: "Most Popular",
    tagClassName: "featured",
    price: "$299",
    priceSuffix: "/ month",
    description: "For operators managing multiple travel brands with higher message volume.",
    featured: true,
    features: [
      "5 tenant workspaces",
      "100,000 messages / month",
      "Flights + hotels + cars + cruises",
      "Priority support",
      "Advanced brand customization",
      "Analytics dashboard (soon)"
    ]
  },
  {
    plan: "enterprise",
    name: "Enterprise",
    tag: "Enterprise",
    tagClassName: "enterprise",
    price: "Custom",
    description: "For large deployments that need bespoke onboarding, security, and commercial terms.",
    features: [
      "Unlimited tenant workspaces",
      "SLA + SSO integration",
      "Dedicated onboarding engineer",
      "Advanced security controls",
      "Custom AI model fine-tuning",
      "White-label deployment"
    ]
  }
];

function formatPlanName(plan: PlatformSubscriptionPlan) {
  switch (plan) {
    case "starter":
      return "Starter";
    case "growth":
      return "Growth";
    case "enterprise":
      return "Enterprise";
    default:
      return "Trial";
  }
}

export default function PricingPage() {
  const { token, refresh, profile } = usePlatformAuth();
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(profile?.subscription ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionPlan, setActionPlan] = useState<"starter" | "growth" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadSubscription() {
      setIsLoading(true);
      setError("");

      try {
        const response = await platformGetSubscription(token);
        if (!isMounted) {
          return;
        }
        setSubscription(response.subscription);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load subscription");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSubscription();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function handleSubscribe(plan: "starter" | "growth") {
    if (!token) {
      return;
    }

    setActionPlan(plan);
    setError("");
    setSuccess("");

    try {
      const response = await platformSubscribe(token, plan);
      setSubscription(response.subscription);
      setSuccess(`${formatPlanName(plan)} is now active on your account.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update subscription");
    } finally {
      setActionPlan(null);
    }
  }

  const currentPlan = subscription?.plan ?? null;
  const currentPlanName = currentPlan ? formatPlanName(currentPlan) : "Trial";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Plans</p>
          <h2 className="app-h1">Simple pricing with a 14-day full trial</h2>
          <p className="app-lead">
            Every account starts on Trial with full product access. Upgrade when you need a longer
            billing cycle or tighter control over workspace limits.
          </p>
        </div>
        {subscription ? (
          <div className="app-pricing-status">
            <span>Status</span>
            <strong>
              {currentPlanName} · {subscription.status}
            </strong>
          </div>
        ) : null}
      </div>

      {subscription?.plan === "trial" ? (
        <div className="app-trial-badge">
          <div>
            <strong>Trial access is active</strong>
            <span>
              You can use up to {subscription.max_tenants} workspaces and {subscription.max_messages_mo.toLocaleString()}
              {" "}messages per month during the 14-day evaluation window.
            </span>
          </div>
          <div className="app-trial-badge-value">
            {subscription.trial_days_remaining ?? 0}
            <small style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "rgba(10,10,15,0.5)", marginTop: "4px" }}>
              days left
            </small>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="app-callout danger">
          <div>
            <div className="callout-title">Subscription update failed</div>
            <div className="callout-body">{error}</div>
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="app-callout success">
          <div>
            <div className="callout-title">Subscription updated</div>
            <div className="callout-body">{success}</div>
          </div>
        </div>
      ) : null}

      <div className="app-pricing-grid">
        {PLAN_CARDS.map((card) => {
          const isCurrentPlan = subscription?.status === "active" && currentPlan === card.plan;
          const isEnterprise = card.plan === "enterprise";
          const buttonLabel = isEnterprise
            ? "Contact Sales"
            : isCurrentPlan
              ? "Current plan"
              : currentPlan === "enterprise"
                ? `Switch to ${card.name}`
                : subscription?.plan === "trial"
                  ? `Start with ${card.name}`
                  : `Choose ${card.name}`;

          return (
            <div
              key={card.plan}
              className={[
                "app-pricing-card",
                card.featured ? "featured" : "",
                isCurrentPlan ? "app-plan-active" : ""
              ].filter(Boolean).join(" ")}
            >
              <span className={`app-pricing-tag ${card.tagClassName}`}>{card.tag}</span>
              <h3 className="app-pricing-name">{card.name}</h3>
              <p className="app-pricing-price">
                {card.price}
                {card.priceSuffix ? <small> {card.priceSuffix}</small> : null}
              </p>
              <p className="app-pricing-subhead">{card.description}</p>
              <div className="app-pricing-divider" />
              <ul className="app-pricing-features">
                {card.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              {card.plan === "enterprise" ? (
                <a
                  className="app-btn-primary"
                  href="mailto:sales@aeroconcierge.com?subject=Enterprise%20Plan%20Inquiry"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {buttonLabel}
                </a>
              ) : (
                <button
                  type="button"
                  className={card.featured ? "app-btn-gold" : "app-btn-secondary"}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => handleSubscribe(card.plan === "starter" ? "starter" : "growth")}
                  disabled={isLoading || actionPlan !== null || isCurrentPlan}
                >
                  {actionPlan === card.plan ? "Updating..." : buttonLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="app-card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px"
        }}
      >
        {[
          {
            title: "Trial",
            desc: "14 days of full access, including up to 5 workspaces and 100,000 monthly messages."
          },
          {
            title: "Starter",
            desc: "Best for a single site that needs a branded concierge and a stable monthly cap."
          },
          {
            title: "Growth",
            desc: "Built for agencies or operators running multiple brands with higher traffic."
          },
          {
            title: "Enterprise",
            desc: "Use custom contracting when you need SSO, security review, or white-label delivery."
          }
        ].map((item) => (
          <div key={item.title}>
            <p
              style={{
                margin: "0 0 6px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.1rem",
                color: "#0a0a0f"
              }}
            >
              {item.title}
            </p>
            <p style={{ margin: 0, color: "rgba(10,10,15,0.58)", fontSize: "0.8rem", lineHeight: 1.6 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
