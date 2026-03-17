import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

const ChatWidget = lazy(() =>
  import("@/components/ChatWidget").then((module) => ({ default: module.ChatWidget }))
);
const PlatformShell = lazy(() => import("@/platform/layout/PlatformShell"));
const AccountPage = lazy(() => import("@/platform/pages/AccountPage"));
const ChatbotPage = lazy(() => import("@/platform/pages/ChatbotPage"));
const CustomizationPage = lazy(() => import("@/platform/pages/CustomizationPage"));
const DnsPage = lazy(() => import("@/platform/pages/DnsPage"));
const KnowledgePage = lazy(() => import("@/platform/pages/KnowledgePage"));
const LandingPage = lazy(() => import("@/platform/pages/LandingPage"));
const LoginPage = lazy(() => import("@/platform/pages/LoginPage"));
const OverviewPage = lazy(() => import("@/platform/pages/OverviewPage"));
const PricingPage = lazy(() => import("@/platform/pages/PricingPage"));
const SiteSetupPage = lazy(() => import("@/platform/pages/SiteSetupPage"));
const SignupPage = lazy(() => import("@/platform/pages/SignupPage"));
const WidgetCodePage = lazy(() => import("@/platform/pages/WidgetCodePage"));

function RouteLoader() {
  return <div className="min-h-screen bg-[#faf8f4]" />;
}

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

function RequirePlatformGuest() {
  const { token } = usePlatformAuth();

  if (token) {
    return <Navigate to="/platform/app/overview" replace />;
  }

  return <Outlet />;
}

function PlatformIndex() {
  const { token } = usePlatformAuth();
  return <Navigate to={token ? "/platform/app/overview" : "/platform/login"} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<HomeEntryPage />} />
        <Route path="/demo" element={<WidgetDemoPage />} />
        <Route path="/platform" element={<PlatformIndex />} />

        <Route element={<RequirePlatformGuest />}>
          <Route path="/platform/login" element={<LoginPage />} />
          <Route path="/platform/signup" element={<SignupPage />} />
        </Route>

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
    </Suspense>
  );
}
