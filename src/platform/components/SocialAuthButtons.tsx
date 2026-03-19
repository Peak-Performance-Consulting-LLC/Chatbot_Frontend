import { getPlatformOauthUrl } from "@/lib/platformApi";

type SocialAuthButtonsProps = {
  disabled?: boolean;
  dividerLabel?: string;
  helperText?: string;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.703-1.568 2.684-3.874 2.684-6.616Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.179l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.713H.957v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC04"
        d="M3.964 10.709A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.169.282-1.709V4.959H.957A9 9 0 0 0 0 9c0 1.453.348 2.829.957 4.041l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.578c1.321 0 2.507.455 3.44 1.346l2.58-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.959l3.007 2.332C4.672 5.162 6.656 3.578 9 3.578Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.67 4.533-4.67 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.926-1.956 1.875v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073Z"
      />
      <path
        fill="#FFFFFF"
        d="M16.671 15.563l.532-3.49h-3.328V9.806c0-.95.465-1.875 1.956-1.875h1.513V4.978s-1.373-.235-2.686-.235c-2.741 0-4.533 1.663-4.533 4.67v2.66H7.078v3.49h3.047V24h3.749v-8.437h2.797Z"
      />
    </svg>
  );
}

const providers = [
  {
    id: "google" as const,
    label: "Continue with Google",
    shortLabel: "Google",
    icon: <GoogleIcon />,
    iconWrapClassName: "border-[#eceff3] bg-[#ffffff]",
    hoverClassName: "hover:border-[#d6dbe4] hover:bg-[#fcfcfd]"
  },
  {
    id: "facebook" as const,
    label: "Continue with Facebook",
    shortLabel: "Facebook",
    icon: <FacebookIcon />,
    iconWrapClassName: "border-[#e8eefc] bg-[#ffffff]",
    hoverClassName: "hover:border-[#cddcff] hover:bg-[#fbfcff]"
  }
];

export default function SocialAuthButtons({
  disabled = false,
  dividerLabel = "Or continue with",
  helperText
}: SocialAuthButtonsProps) {
  function startOauth(provider: "google" | "facebook") {
    if (disabled) {
      return;
    }

    window.location.assign(getPlatformOauthUrl(provider, undefined, window.location.origin));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#0a0a0f]/10" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a0a0f]/35">
          {dividerLabel}
        </span>
        <div className="h-px flex-1 bg-[#0a0a0f]/10" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            disabled={disabled}
            onClick={() => startOauth(provider.id)}
            className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#d9dde3] bg-white px-3 py-2 text-left text-[12px] font-semibold text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[56px] sm:justify-start sm:gap-3 sm:px-4 sm:py-3 ${provider.hoverClassName}`}
          >
            <span
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:h-9 sm:w-9 ${provider.iconWrapClassName}`}
              aria-hidden="true"
            >
              {provider.icon}
            </span>
            <span className="min-w-0 tracking-[-0.01em]">
              <span className="truncate text-[12px] font-semibold sm:hidden">{provider.shortLabel}</span>
              <span className="hidden sm:flex sm:flex-col sm:leading-[1.1]">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                  Continue with
                </span>
                <span className="mt-1 text-[13px] font-semibold text-[#111827]">
                  {provider.shortLabel}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {helperText ? <p className="text-center text-xs text-[#0a0a0f]/45">{helperText}</p> : null}
    </div>
  );
}
