import type { PlatformKnowledgeBase, PlatformDomainVerification } from "@/platform/types";

type DomainVerificationState = NonNullable<PlatformDomainVerification>["status"];

export function getDnsStatusLabel(status: DomainVerificationState | undefined) {
  switch (status) {
    case "verified":
      return "Verified";
    case "txt_not_found":
      return "TXT Record Not Found";
    case "txt_mismatch":
      return "TXT Record Mismatch";
    default:
      return "Pending DNS Verification";
  }
}

export function getDnsStatusTone(status: DomainVerificationState | undefined) {
  switch (status) {
    case "verified":
      return "success";
    case "txt_not_found":
    case "txt_mismatch":
      return "danger";
    default:
      return "warning";
  }
}

export function getDnsReminderMessage(verification: PlatformDomainVerification) {
  if (verification?.status === "verified") {
    return "DNS ownership is verified. Your website widget can now be installed on the live domain.";
  }

  if (verification?.status === "txt_not_found") {
    return "Please add the TXT verification record to your DNS settings to connect the chatbot widget to your website.";
  }

  if (verification?.status === "txt_mismatch") {
    return "Please update the TXT verification record so the value matches this workspace before installing the widget.";
  }

  return "Please add the TXT verification record to your DNS settings to connect the chatbot widget to your website.";
}

export function getKnowledgeStatusLabel(status: PlatformKnowledgeBase["status"] | undefined) {
  switch (status) {
    case "processing":
      return "Processing knowledge base";
    case "ready":
      return "Knowledge base ready";
    case "warning":
      return "Knowledge base needs review";
    case "error":
      return "Knowledge base failed";
    default:
      return "Knowledge base pending";
  }
}

export function getKnowledgeStatusTone(status: PlatformKnowledgeBase["status"] | undefined) {
  switch (status) {
    case "ready":
      return "success";
    case "warning":
      return "warning";
    case "error":
      return "danger";
    case "processing":
      return "info";
    default:
      return "warning";
  }
}
