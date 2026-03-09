export type PlatformNavItem = {
  key: string;
  label: string;
  path: string;
  icon: string;
};

export const appNavItems: PlatformNavItem[] = [
  { key: "overview", label: "Overview", path: "/platform/app/overview", icon: "OA" },
  { key: "site-setup", label: "Site Setup", path: "/platform/app/site-setup", icon: "SS" },
  { key: "chatbot", label: "My Chatbot", path: "/platform/app/chatbot", icon: "CB" },
  { key: "customization", label: "Customization", path: "/platform/app/customization", icon: "CU" },
  { key: "knowledge", label: "Knowledge Base", path: "/platform/app/knowledge", icon: "KB" },
  { key: "dns", label: "DNS Verification", path: "/platform/app/dns", icon: "DN" },
  { key: "widget", label: "Widget Code", path: "/platform/app/widget", icon: "WG" },
  { key: "account", label: "Account", path: "/platform/app/account", icon: "AC" },
  { key: "pricing", label: "Pricing", path: "/platform/app/pricing", icon: "PR" }
];
