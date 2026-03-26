import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function IconOverview(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </BaseIcon>
  );
}

export function IconSiteSetup(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v3" />
      <path d="M12 18.5v3" />
      <path d="M4.9 4.9l2.1 2.1" />
      <path d="M17 17l2.1 2.1" />
      <path d="M2.5 12h3" />
      <path d="M18.5 12h3" />
      <path d="M4.9 19.1l2.1-2.1" />
      <path d="M17 7l2.1-2.1" />
    </BaseIcon>
  );
}

export function IconKnowledge(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <ellipse cx="12" cy="5.5" rx="6.5" ry="2.5" />
      <path d="M5.5 5.5v6c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-6" />
      <path d="M5.5 11.5v6c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-6" />
    </BaseIcon>
  );
}

export function IconDns(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3l7 3.6v5.4c0 4.8-2.9 8.5-7 9.9-4.1-1.4-7-5.1-7-9.9V6.6L12 3z" />
      <path d="M9.5 12.2l1.8 1.8 3.7-4.3" />
    </BaseIcon>
  );
}

export function IconChatbot(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20.5 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-4.5 4.5V5.5A2.5 2.5 0 0 1 7 3h11a2.5 2.5 0 0 1 2.5 2.5z" />
    </BaseIcon>
  );
}

export function IconLeads(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16.5" cy="9.5" r="2" />
      <path d="M3.5 18.5c1.1-2.6 2.9-4 5.5-4 2.6 0 4.4 1.4 5.5 4" />
      <path d="M14.5 18.5c.7-1.8 2-2.8 3.8-2.8 1.2 0 2.2.4 3.2 1.4" />
    </BaseIcon>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z" />
      <path d="M4 13h4l1.4 2h5.2l1.4-2H20" />
    </BaseIcon>
  );
}

export function IconCustomization(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17 3.2 3.2 0 0 0 0-6.4h-1.1a2.2 2.2 0 1 1 0-4.4H12a3.1 3.1 0 0 0 0-6.2z" />
      <circle cx="7.2" cy="10" r="1" />
      <circle cx="9.6" cy="6.9" r="1" />
      <circle cx="14.3" cy="6.4" r="1" />
    </BaseIcon>
  );
}

export function IconWidgetCode(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 8l-4 4 4 4" />
      <path d="M16 8l4 4-4 4" />
      <path d="M13.5 5.5L10.5 18.5" />
    </BaseIcon>
  );
}

export function IconAccount(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.8-3.1 4.2-4.7 7-4.7s5.2 1.6 7 4.7" />
    </BaseIcon>
  );
}

export function IconPricing(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4v16" />
      <path d="M16 7.5c0-1.6-1.8-2.8-4-2.8S8 5.9 8 7.5s1.8 2.6 4 2.6 4 1 4 2.6-1.8 2.8-4 2.8-4-1.2-4-2.8" />
    </BaseIcon>
  );
}

export function IconDocs(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 4.5h9.5a2.5 2.5 0 0 1 2.5 2.5v12.5H8.5A2.5 2.5 0 0 0 6 22" />
      <path d="M6 4.5v17.5" />
      <path d="M8.5 7.5h6" />
      <path d="M8.5 11h6" />
      <path d="M8.5 14.5h4" />
    </BaseIcon>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </BaseIcon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </BaseIcon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6.5 9.5L12 15l5.5-5.5" />
    </BaseIcon>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10 17H6.5A2.5 2.5 0 0 1 4 14.5v-9A2.5 2.5 0 0 1 6.5 3H10" />
      <path d="M14 16l5-4-5-4" />
      <path d="M9 12h10" />
    </BaseIcon>
  );
}

export function IconSupport(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 1 15 0v1.5a2 2 0 0 1-2 2H16" />
      <path d="M4.5 13.5H4a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2h.5" />
      <path d="M19.5 13.5H20a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-.5" />
      <path d="M12 19.5v1" />
      <path d="M9.5 21h5" />
    </BaseIcon>
  );
}

export function IconWorkspace(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="4.5" width="17" height="14" rx="2.5" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </BaseIcon>
  );
}

export function IconTenants(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="2.5" y="10" width="8" height="11" rx="1.5" />
      <rect x="13.5" y="10" width="8" height="11" rx="1.5" />
      <path d="M6 10V6.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 6.5V10" />
      <path d="M9 21v-5a3 3 0 0 1 6 0v5" />
    </BaseIcon>
  );
}

export function IconTeam(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="8" cy="9" r="2.2" />
      <circle cx="15.8" cy="8" r="1.8" />
      <path d="M4.2 18c.9-2.2 2.4-3.4 4.5-3.4S12.2 15.8 13 18" />
      <path d="M13.8 18c.6-1.5 1.7-2.3 3.2-2.3 1 0 1.9.4 2.8 1.2" />
    </BaseIcon>
  );
}

export function IconQueue(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4.5" width="16" height="4.5" rx="1.2" />
      <rect x="4" y="10" width="12" height="4.5" rx="1.2" />
      <rect x="4" y="15.5" width="9" height="4" rx="1.2" />
    </BaseIcon>
  );
}
