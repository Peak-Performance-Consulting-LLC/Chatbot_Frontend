import { useEffect, useMemo, useState } from "react";
import { platformCreateSubscriptionCheckout, platformGetSubscription } from "@/lib/platformApi";
import { usePlatformAuth } from "@/platform/state/auth";
import { useTrialCountdown } from "@/platform/subscription";
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
    description: "Hosted Stripe Checkout for one travel brand with a clean monthly cap.",
    features: [
      "1 tenant workspace",
      "10,000 messages / month",
      "Flight + knowledge base concierge",
      "Standard email support",
      "Stripe-hosted recurring billing"
    ]
  },
  {
    plan: "growth",
    name: "Growth",
    tag: "Most Popular",
    tagClassName: "featured",
    price: "$299",
    priceSuffix: "/ month",
    description: "Recurring billing for multi-brand operators that need more volume and faster support.",
    featured: true,
    features: [
      "5 tenant workspaces",
      "100,000 messages / month",
      "Flights + hotels + cars + cruises",
      "Priority support",
      "Stripe-hosted recurring billing"
    ]
  },
  {
    plan: "enterprise",
    name: "Enterprise",
    tag: "Enterprise",
    tagClassName: "enterprise",
    price: "Custom",
    description: "Manual sales-assisted onboarding for larger deployments and commercial terms.",
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

function formatStatusLabel(status: PlatformSubscription["status"]) {
  switch (status) {
    case "past_due":
      return "Past due";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function formatDate(input: string | null | undefined) {
  if (!input) {
    return "N/A";
  }

  const value = new Date(input);
  if (!Number.isFinite(value.getTime())) {
    return "N/A";
  }

  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function PricingPage() {
  const { token, refresh, profile } = usePlatformAuth();
  const [subscription, setSubscription] = useState<PlatformSubscription | null>(profile?.subscription ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionPlan, setActionPlan] = useState<"starter" | "growth" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");
  const countdown = useTrialCountdown(subscription?.trial_ends_at);

  async function loadSubscription() {
    if (!token) {
      setSubscription(null);
      setIsLoading(false);
      return null;
    }

    const response = await platformGetSubscription(token);
    setSubscription(response.subscription);
    return response.subscription;
  }

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setIsLoading(true);
      setError("");

      try {
        const latest = await loadSubscription();
        if (!isMounted) {
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const checkoutState = params.get("checkout");
        const requestedPlan = params.get("plan");

        if (checkoutState === "cancel") {
          setInfo(
            requestedPlan
              ? `${formatPlanName(requestedPlan as PlatformSubscriptionPlan)} Checkout was canceled. Your current plan was not changed.`
              : "Checkout was canceled. Your current plan was not changed."
          );
        }

        if (
          checkoutState === "success" &&
          token &&
          (requestedPlan === "starter" || requestedPlan === "growth")
        ) {
          setInfo(`Waiting for Stripe confirmation for ${formatPlanName(requestedPlan)}...`);

          for (let attempt = 0; attempt < 8; attempt += 1) {
            const polled = attempt === 0 && latest ? latest : await platformGetSubscription(token).then((result) => result.subscription);

            if (!isMounted) {
              return;
            }

            setSubscription(polled);

            if (polled.plan === requestedPlan && polled.status === "active") {
              setInfo("");
              setSuccess(`${formatPlanName(requestedPlan)} is active. Stripe confirmed your payment.`);
              await refresh();
              break;
            }

            if (attempt < 7) {
              await new Promise((resolve) => window.setTimeout(resolve, 1500));
            } else {
              setInfo("Stripe checkout finished. We are still waiting for the billing webhook to confirm the plan.");
            }
          }
        }
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

    void run();

    return () => {
      isMounted = false;
    };
  }, [token, refresh]);

  async function handleCheckout(plan: "starter" | "growth") {
    if (!token) {
      return;
    }

    setActionPlan(plan);
    setError("");
    setSuccess("");
    setInfo("");

    try {
      const response = await platformCreateSubscriptionCheckout(token, plan);
      window.location.assign(response.checkout_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Stripe Checkout");
      setActionPlan(null);
    }
  }

  const currentPlan = subscription?.plan ?? null;
  const currentPlanName = currentPlan ? formatPlanName(currentPlan) : "Trial";
  const billingNote = useMemo(() => {
    if (!subscription) {
      return "";
    }

    if (subscription.plan === "trial") {
      return countdown.expired
        ? "Trial expired"
        : `Trial ends ${formatDate(subscription.trial_ends_at)}`;
    }

    if (subscription.cancel_at_period_end) {
      return `Cancels at period end on ${formatDate(subscription.current_period_end)}`;
    }

    return `Current period ends ${formatDate(subscription.current_period_end)}`;
  }, [countdown.expired, subscription]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Plans</p>
          <h2 className="app-h1">Stripe-backed pricing with a free 14-day trial</h2>
          <p className="app-lead">
            Trial starts instantly. Starter and Growth open hosted Stripe Checkout and activate only
            after payment is confirmed.
          </p>
        </div>
        {subscription ? (
          <div className="app-pricing-status">
            <span>Status</span>
            <strong>
              {currentPlanName} · {formatStatusLabel(subscription.status)}
            </strong>
          </div>
        ) : null}
      </div>

      {subscription?.plan === "trial" ? (
        <div className="app-trial-badge">
          <div>
            <strong>{countdown.expired ? "Trial access has expired" : "Trial access is active"}</strong>
            <span>
              {countdown.expired
                ? "Upgrade with Stripe Checkout to restore paid access and keep building workspaces."
                : `You can use up to ${subscription.max_tenants} workspaces and ${subscription.max_messages_mo.toLocaleString()} messages per month during the 14-day evaluation window.`}
            </span>
          </div>
          <div className="app-trial-badge-value">
            {countdown.days}
            <small
              style={{
                display: "block",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.75rem",
                color: "rgba(10,10,15,0.5)",
                marginTop: "4px"
              }}
            >
              days left
            </small>
          </div>
        </div>
      ) : null}

      {billingNote ? (
        <div className="app-callout info">
          <div>
            <div className="callout-title">Billing timeline</div>
            <div className="callout-body">{billingNote}</div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="app-callout danger">
          <div>
            <div className="callout-title">Checkout failed</div>
            <div className="callout-body">{error}</div>
          </div>
        </div>
      ) : null}

      {info ? (
        <div className="app-callout info">
          <div>
            <div className="callout-title">Billing update</div>
            <div className="callout-body">{info}</div>
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
          const buttonLabel =
            card.plan === "enterprise"
              ? "Contact Sales"
              : isCurrentPlan
                ? "Current plan"
                : "Continue to Checkout";

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
                  onClick={() => handleCheckout(card.plan === "starter" ? "starter" : "growth")}
                  disabled={isLoading || actionPlan !== null || isCurrentPlan}
                >
                  {actionPlan === card.plan ? "Redirecting..." : buttonLabel}
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
            desc: "Starts immediately with full access for 14 days and never touches Stripe."
          },
          {
            title: "Starter",
            desc: "Launches hosted Stripe Checkout and activates after payment confirmation."
          },
          {
            title: "Growth",
            desc: "Uses the same Stripe Checkout flow for higher workspace and message volume."
          },
          {
            title: "Enterprise",
            desc: "Handled manually with sales, onboarding, and custom commercial terms."
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
