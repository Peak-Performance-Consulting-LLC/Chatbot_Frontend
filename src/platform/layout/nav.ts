import { createElement, type ReactNode } from "react";
import {
  IconAccount,
  IconChatbot,
  IconCustomization,
  IconDns,
  IconDocs,
  IconInbox,
  IconKnowledge,
  IconLeads,
  IconOverview,
  IconPricing,
  IconQueue,
  IconSiteSetup,
  IconTeam,
  IconTenants,
  IconWidgetCode
} from "@/platform/components/PlatformIcons";
import type { WorkspaceMemberRole } from "@/platform/types";

export type PlatformNavItem = {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
  allowedRoles?: WorkspaceMemberRole[];
};

export type PlatformNavSection = {
  key: string;
  label: string;
  icon: ReactNode;
  items: PlatformNavItem[];
};

export const appPrimaryNavItems: PlatformNavItem[] = [
  {
    key: "overview",
    label: "Overview",
    path: "/platform/app/overview",
    icon: createElement(IconOverview),
    allowedRoles: ["owner", "admin", "supervisor"]
  },
  {
    key: "inbox",
    label: "Agent Inbox",
    path: "/platform/app/inbox",
    icon: createElement(IconInbox),
    allowedRoles: ["owner", "admin", "supervisor", "agent"]
  },
  {
    key: "chatbot",
    label: "My Chatbot",
    path: "/platform/app/chatbot",
    icon: createElement(IconChatbot),
    allowedRoles: ["owner", "admin"]
  },
  {
    key: "supervisor",
    label: "Supervisor",
    path: "/platform/app/supervisor",
    icon: createElement(IconOverview),
    allowedRoles: ["owner", "admin", "supervisor"]
  }
];

export const appNavSections: PlatformNavSection[] = [
  {
    key: "workspace-admin",
    label: "Workspace Admin",
    icon: createElement(IconTenants),
    items: [
      {
        key: "tenants",
        label: "Tenant Management",
        path: "/platform/app/tenants",
        icon: createElement(IconTenants),
        allowedRoles: ["owner", "admin"]
      },
      {
        key: "team",
        label: "Team",
        path: "/platform/app/team",
        icon: createElement(IconTeam),
        allowedRoles: ["owner", "admin", "supervisor", "agent"]
      },
      {
        key: "queues",
        label: "Queues",
        path: "/platform/app/queues",
        icon: createElement(IconQueue),
        allowedRoles: ["owner", "admin", "supervisor"]
      },
      {
        key: "leads",
        label: "Captured Users",
        path: "/platform/app/leads",
        icon: createElement(IconLeads),
        allowedRoles: ["owner", "admin"]
      }
    ]
  },
  {
    key: "setup-content",
    label: "Setup & Content",
    icon: createElement(IconSiteSetup),
    items: [
      {
        key: "site-setup",
        label: "Site Setup",
        path: "/platform/app/site-setup",
        icon: createElement(IconSiteSetup),
        allowedRoles: ["owner", "admin"]
      },
      {
        key: "dns",
        label: "DNS Verification",
        path: "/platform/app/dns",
        icon: createElement(IconDns),
        allowedRoles: ["owner", "admin"]
      },
      {
        key: "widget",
        label: "Widget Code",
        path: "/platform/app/widget",
        icon: createElement(IconWidgetCode),
        allowedRoles: ["owner", "admin"]
      },
      {
        key: "knowledge",
        label: "Knowledge Base",
        path: "/platform/app/knowledge",
        icon: createElement(IconKnowledge),
        allowedRoles: ["owner", "admin"]
      },
      {
        key: "customization",
        label: "Customization",
        path: "/platform/app/customization",
        icon: createElement(IconCustomization),
        allowedRoles: ["owner", "admin"]
      }
    ]
  },
  {
    key: "account-billing",
    label: "Account & Billing",
    icon: createElement(IconAccount),
    items: [
      {
        key: "docs",
        label: "Documentation",
        path: "/platform/app/docs",
        icon: createElement(IconDocs),
        allowedRoles: ["owner", "admin", "supervisor"]
      },
      {
        key: "account",
        label: "Account",
        path: "/platform/app/account",
        icon: createElement(IconAccount),
        allowedRoles: ["owner", "admin", "supervisor"]
      },
      {
        key: "pricing",
        label: "Pricing",
        path: "/platform/app/pricing",
        icon: createElement(IconPricing),
        allowedRoles: ["owner", "admin"]
      }
    ]
  }
];
