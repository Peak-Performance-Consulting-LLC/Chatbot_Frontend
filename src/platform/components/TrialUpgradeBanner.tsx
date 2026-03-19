import { Link } from "react-router-dom";
import { useTrialCountdown } from "@/platform/subscription";
import type { PlatformSubscription } from "@/platform/types";

export function TrialUpgradeBanner({ subscription }: { subscription: PlatformSubscription }) {
  const countdown = useTrialCountdown(subscription.trial_ends_at);
  const bannerClassName = ["app-trial-banner", `is-${countdown.urgency}`].join(" ");

  const title = countdown.expired
    ? "Your trial has expired"
    : "Your trial is active";
  const body = countdown.expired
    ? "Upgrade to Starter or Growth to keep creating workspaces and continue using paid platform access."
    : `Upgrade before the timer runs out to keep your ${subscription.max_tenants}-workspace access uninterrupted.`;

  return (
    <div className={bannerClassName}>
      <div className="app-trial-banner-copy">
        <span className="app-trial-banner-pill">Trial</span>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>

      <div className="app-trial-banner-counter" aria-label="Trial countdown">
        <span className="app-trial-banner-counter-value">{countdown.compact}</span>
        <span className="app-trial-banner-counter-label">
          {countdown.expired ? "Upgrade required" : "Days : Hours : Minutes"}
        </span>
      </div>

      <Link className="app-btn-gold" to="/platform/app/pricing">
        Upgrade now
      </Link>
    </div>
  );
}
