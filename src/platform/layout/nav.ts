import { createElement, type ReactNode } from "react";
import {
  IconAccount,
  IconChatbot,
  IconCustomization,
  IconDns,
  IconKnowledge,
  IconOverview,
  IconPricing,
  IconSiteSetup,
  IconWidgetCode
} from "@/platform/components/PlatformIcons";

export type PlatformNavItem = {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
};

export const appNavItems: PlatformNavItem[] = [
  { key: "overview", label: "Overview", path: "/platform/app/overview", icon: createElement(IconOverview) },
  { key: "site-setup", label: "Site Setup", path: "/platform/app/site-setup", icon: createElement(IconSiteSetup) },
  { key: "chatbot", label: "My Chatbot", path: "/platform/app/chatbot", icon: createElement(IconChatbot) },
  { key: "customization", label: "Customization", path: "/platform/app/customization", icon: createElement(IconCustomization) },
  { key: "knowledge", label: "Knowledge Base", path: "/platform/app/knowledge", icon: createElement(IconKnowledge) },
  { key: "dns", label: "DNS Verification", path: "/platform/app/dns", icon: createElement(IconDns) },
  { key: "widget", label: "Widget Code", path: "/platform/app/widget", icon: createElement(IconWidgetCode) },
  { key: "account", label: "Account", path: "/platform/app/account", icon: createElement(IconAccount) },
  { key: "pricing", label: "Pricing", path: "/platform/app/pricing", icon: createElement(IconPricing) }
];
