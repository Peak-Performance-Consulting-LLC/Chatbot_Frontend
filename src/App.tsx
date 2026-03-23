import { Suspense, lazy, useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

// Widget & shell — loaded once
const ChatWidget = lazy(() =>
  import("@/components/ChatWidget").then((module) => ({ default: module.ChatWidget }))
);
const PlatformShell = lazy(() => import("@/platform/layout/PlatformShell"));

// Platform pages — eagerly prefetched once shell mounts (see prefetchPlatformRoutes)
const AccountPage = lazy(() => import("@/platform/pages/AccountPage"));
const ChatbotPage = lazy(() => import("@/platform/pages/ChatbotPage"));
const CustomizationPage = lazy(() => import("@/platform/pages/CustomizationPage"));
const DnsPage = lazy(() => import("@/platform/pages/DnsPage"));
const DocumentationPage = lazy(() => import("@/platform/pages/DocumentationPage"));
const KnowledgePage = lazy(() => import("@/platform/pages/KnowledgePage"));
const LandingPage = lazy(() => import("@/platform/pages/LandingPage"));
const LoginPage = lazy(() => import("@/platform/pages/LoginPage"));
const OverviewPage = lazy(() => import("@/platform/pages/OverviewPage"));
const PricingPage = lazy(() => import("@/platform/pages/PricingPage"));
const ResetPasswordPage = lazy(() => import("@/platform/pages/ResetPasswordPage"));
const SiteSetupPage = lazy(() => import("@/platform/pages/SiteSetupPage"));
const SignupPage = lazy(() => import("@/platform/pages/SignupPage"));
const TenantManagementPage = lazy(() => import("@/platform/pages/TenantManagementPage"));
const WidgetCodePage = lazy(() => import("@/platform/pages/WidgetCodePage"));

/** Kick off chunk downloads as soon as the authenticated shell is first shown. */
function prefetchPlatformRoutes() {
  void import("@/platform/pages/AccountPage");
  void import("@/platform/pages/ChatbotPage");
  void import("@/platform/pages/CustomizationPage");
  void import("@/platform/pages/DnsPage");
  void import("@/platform/pages/DocumentationPage");
  void import("@/platform/pages/KnowledgePage");
  void import("@/platform/pages/OverviewPage");
  void import("@/platform/pages/PricingPage");
  void import("@/platform/pages/SiteSetupPage");
  void import("@/platform/pages/TenantManagementPage");
  void import("@/platform/pages/WidgetCodePage");
}

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

  // Kick off prefetching as soon as we know the user is authenticated
  useEffect(() => {
    if (token) {
      prefetchPlatformRoutes();
    }
  }, [token]);

  if (!token && !loading) {
    return <Navigate to="/platform/login" replace />;
  }

  // PlatformShell itself handles the inner-page Suspense boundary
  // so sidebar + topbar stay mounted during all navigations
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
    // Outer Suspense only covers the initial shell + public pages
    // Platform page-to-page transitions are handled by PlatformShell's inner Suspense
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<HomeEntryPage />} />
        <Route path="/demo" element={<WidgetDemoPage />} />
        <Route path="/platform" element={<PlatformIndex />} />
        <Route path="/platform/reset-password" element={<ResetPasswordPage />} />

        <Route element={<RequirePlatformGuest />}>
          <Route path="/platform/login" element={<LoginPage />} />
          <Route path="/platform/signup" element={<SignupPage />} />
        </Route>

        {/* PlatformShell owns the inner Suspense — pages load inside the shell without flash */}
        <Route path="/platform/app" element={<RequirePlatformAuth />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="site-setup" element={<SiteSetupPage />} />
          <Route path="tenants" element={<TenantManagementPage />} />
          <Route path="chatbot" element={<ChatbotPage />} />
          <Route path="customization" element={<CustomizationPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="dns" element={<DnsPage />} />
          <Route path="widget" element={<WidgetCodePage />} />
          <Route path="docs" element={<DocumentationPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="pricing" element={<PricingPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
