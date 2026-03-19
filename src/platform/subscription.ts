import { useEffect, useState } from "react";

export type TrialCountdownState = {
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
  urgency: "normal" | "warning" | "expired";
  compact: string;
};

function getRemainingMs(trialEndsAt: string | null | undefined) {
  if (!trialEndsAt) {
    return 0;
  }

  const endsAt = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(endsAt)) {
    return 0;
  }

  return Math.max(0, endsAt - Date.now());
}

export function getTrialCountdownState(trialEndsAt: string | null | undefined): TrialCountdownState {
  const totalMs = getRemainingMs(trialEndsAt);
  const totalMinutes = Math.floor(totalMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const expired = totalMs <= 0;

  let urgency: TrialCountdownState["urgency"] = "normal";
  if (expired) {
    urgency = "expired";
  } else if (days <= 3) {
    urgency = "warning";
  }

  return {
    days,
    hours,
    minutes,
    expired,
    urgency,
    compact: [days, hours, minutes].map((part) => String(part).padStart(2, "0")).join(" : ")
  };
}

export function useTrialCountdown(trialEndsAt: string | null | undefined) {
  const [state, setState] = useState<TrialCountdownState>(() => getTrialCountdownState(trialEndsAt));

  useEffect(() => {
    setState(getTrialCountdownState(trialEndsAt));

    if (!trialEndsAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setState(getTrialCountdownState(trialEndsAt));
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [trialEndsAt]);

  return state;
}
