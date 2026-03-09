import { Navigate, Route, Routes } from "react-router-dom";
import { ChatWidget } from "@/components/ChatWidget";
import PlatformShell from "@/platform/layout/PlatformShell";
import AccountPage from "@/platform/pages/AccountPage";
import ChatbotPage from "@/platform/pages/ChatbotPage";
import CustomizationPage from "@/platform/pages/CustomizationPage";
import DnsPage from "@/platform/pages/DnsPage";
import KnowledgePage from "@/platform/pages/KnowledgePage";
import LandingPage from "@/platform/pages/LandingPage";
import LoginPage from "@/platform/pages/LoginPage";
import OverviewPage from "@/platform/pages/OverviewPage";
import PricingPage from "@/platform/pages/PricingPage";
import SiteSetupPage from "@/platform/pages/SiteSetupPage";
import SignupPage from "@/platform/pages/SignupPage";
import WidgetCodePage from "@/platform/pages/WidgetCodePage";
import { usePlatformAuth } from "@/platform/state/auth";

function WidgetDemoPage() {
  const params = new URLSearchParams(window.location.search);
  const tenantFromQuery = params.get("tenant_id") ?? undefined;
  const backendFromQuery = params.get("backend_url") ?? undefined;

  return (
    <div className="demo-page">
      <section className="hero">
        <p className="eyebrow">Multi-tenant concierge widget</p>
        <h1>Travel support + live deals, deployed on Vercel</h1>
        <p>
          This frontend is the reusable chat widget host. Configure tenant ID per website with
          <code>{" <ChatWidget tenantId=\"vacationvista\" /> "}</code> or a host mapping.
        </p>
      </section>

      <ChatWidget tenantId={tenantFromQuery || import.meta.env.VITE_TENANT_ID} backendUrl={backendFromQuery} />
    </div>
  );
}

function HomeEntryPage() {
  const params = new URLSearchParams(window.location.search);
  const isEmbedMode = params.get("embed") === "1";
  const isPlatformMode = params.get("platform") === "1";
  const tenantFromQuery = params.get("tenant_id") ?? undefined;
  const backendFromQuery = params.get("backend_url") ?? undefined;

  if (isPlatformMode) {
    return <Navigate to="/platform" replace />;
  }

  if (isEmbedMode) {
    return (
      <ChatWidget
        tenantId={tenantFromQuery || import.meta.env.VITE_TENANT_ID}
        backendUrl={backendFromQuery}
        embedded
      />
    );
  }

  return <LandingPage />;
}

function RequirePlatformAuth() {
  const { token, loading } = usePlatformAuth();

  if (!token && !loading) {
    return <Navigate to="/platform/login" replace />;
  }

  return <PlatformShell />;
}

function PlatformIndex() {
  const { token } = usePlatformAuth();
  return <Navigate to={token ? "/platform/app/overview" : "/platform/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeEntryPage />} />
      <Route path="/demo" element={<WidgetDemoPage />} />
      <Route path="/platform" element={<PlatformIndex />} />
      <Route path="/platform/login" element={<LoginPage />} />
      <Route path="/platform/signup" element={<SignupPage />} />

      <Route path="/platform/app" element={<RequirePlatformAuth />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="site-setup" element={<SiteSetupPage />} />
        <Route path="chatbot" element={<ChatbotPage />} />
        <Route path="customization" element={<CustomizationPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="dns" element={<DnsPage />} />
        <Route path="widget" element={<WidgetCodePage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="pricing" element={<PricingPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
