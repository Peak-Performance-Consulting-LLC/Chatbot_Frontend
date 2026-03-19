import { Link } from "react-router-dom";
import { useTrialCountdown } from "@/platform/subscription";
import type { PlatformSubscription } from "@/platform/types";

function padCounterPart(value: number) {
  return String(value).padStart(2, "0");
}

function formatTrialEndDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

export function TrialUpgradeBanner({ subscription }: { subscription: PlatformSubscription }) {
  const countdown = useTrialCountdown(subscription.trial_ends_at);
  const bannerClassName = ["app-trial-banner", `is-${countdown.urgency}`].join(" ");
  const counterClassName = ["app-trial-banner-counter", `is-${countdown.urgency}`].join(" ");
  const endsOnLabel = formatTrialEndDate(subscription.trial_ends_at);

  const title = countdown.expired
    ? "Trial access is paused"
    : `Trial ends in ${countdown.days} day${countdown.days === 1 ? "" : "s"}`;
  const body = countdown.expired
    ? "Upgrade to Starter or Growth to restore your workspace access."
    : `${subscription.max_messages_mo.toLocaleString()} visitor messages per month across ${subscription.max_tenants} workspaces while your trial is active.`;
  const statusLabel = countdown.expired
    ? "Expired"
    : countdown.urgency === "warning"
      ? "Ending soon"
      : "Trial window";
  const counterParts = [
    { label: "d", value: padCounterPart(countdown.days) },
    { label: "h", value: padCounterPart(countdown.hours) },
    { label: "m", value: padCounterPart(countdown.minutes) }
  ];

  return (
    <div className={bannerClassName}>
      <div className="app-trial-banner-copy">
        <div className="app-trial-banner-head">
          <span className="app-trial-banner-status">
            <span className="app-trial-banner-status-dot" aria-hidden="true" />
            {statusLabel}
          </span>
          {endsOnLabel ? <span className="app-trial-banner-date">Ends {endsOnLabel}</span> : null}
        </div>
        <div className="app-trial-banner-title-row">
          <strong>{title}</strong>
          <div className={counterClassName} aria-label="Trial countdown">
            {counterParts.map((part) => (
              <span key={part.label} className="app-trial-banner-counter-cell">
                <span className="app-trial-banner-counter-value">{part.value}</span>
                <span className="app-trial-banner-counter-cell-label">{part.label}</span>
              </span>
            ))}
          </div>
        </div>
        <p>{body}</p>
      </div>
      <Link className="app-trial-banner-cta app-btn-gold" to="/platform/app/pricing">
        Upgrade
      </Link>
    </div>
  );
}
