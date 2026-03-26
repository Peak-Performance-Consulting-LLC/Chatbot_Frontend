import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { platformAcceptTeamInvitation } from "@/lib/platformApi";
import { appNavSections, appPrimaryNavItems, type PlatformNavItem } from "@/platform/layout/nav";
import { TrialUpgradeBanner } from "@/platform/components/TrialUpgradeBanner";
import PlatformLogo from "@/platform/components/PlatformLogo";
import { IconChevronDown, IconClose, IconLogout, IconMenu, IconSupport } from "@/platform/components/PlatformIcons";
import { usePlatformAuth } from "@/platform/state/auth";

/** Shimmer skeleton shown inside the content area while a lazy page chunk loads. */
function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden>
      {/* Breadcrumb + title */}
      <div className="space-y-2">
        <div className="h-2.5 w-24 rounded-full bg-[#0a0a0f]/08" />
        <div className="h-7 w-48 rounded-xl bg-[#0a0a0f]/08" />
        <div className="h-3 w-72 rounded-full bg-[#0a0a0f]/06" />
      </div>
      {/* Stat cards row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-[#0a0a0f]/06" />
        ))}
      </div>
      {/* Main content block */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="h-80 rounded-2xl bg-[#0a0a0f]/06" />
        <div className="space-y-4">
          <div className="h-36 rounded-2xl bg-[#0a0a0f]/06" />
          <div className="h-36 rounded-2xl bg-[#0a0a0f]/06" />
        </div>
      </div>
    </div>
  );
}

export default function PlatformShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, profile, selectedTenantId, selectedTenant, selectTenant, logout, loading, refresh } = usePlatformAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const inviteHandledRef = useRef<string | null>(null);
  const tenantSelectRef = useRef<HTMLSelectElement | null>(null);
  const backendUrl = import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:3000";
  const currentRole = selectedTenant?.workspace_role ?? "viewer";
  const allNavItems = useMemo(
    () => [...appPrimaryNavItems, ...appNavSections.flatMap((section) => section.items)],
    []
  );
  const visiblePrimaryNavItems = useMemo(
    () =>
      appPrimaryNavItems.filter((item) => !item.allowedRoles || item.allowedRoles.includes(currentRole)),
    [currentRole]
  );
  const visibleNavSections = useMemo(
    () =>
      appNavSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.allowedRoles || item.allowedRoles.includes(currentRole))
        }))
        .filter((section) => section.items.length > 0),
    [currentRole]
  );
  const visibleNavItems = useMemo(
    () => [...visiblePrimaryNavItems, ...visibleNavSections.flatMap((section) => section.items)],
    [visiblePrimaryNavItems, visibleNavSections]
  );
  const activeNavItem = visibleNavItems.find((item) => location.pathname.startsWith(item.path));
  const activeSectionLabel = activeNavItem?.label || "Dashboard";
  const shouldShowTrialBanner =
    profile?.subscription?.plan === "trial" &&
    (profile.subscription.status === "active" || profile.subscription.status === "expired");

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setExpandedSections((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;

      visibleNavSections.forEach((section) => {
        const sectionHasActiveItem = section.items.some((item) => location.pathname.startsWith(item.path));
        const prevValue = prev[section.key];
        const shouldExpand =
          typeof prevValue === "boolean" ? prevValue || sectionHasActiveItem : sectionHasActiveItem;
        next[section.key] = shouldExpand;
        if (prevValue !== shouldExpand) {
          changed = true;
        }
      });

      for (const key of Object.keys(prev)) {
        if (!(key in next)) {
          changed = true;
          break;
        }
      }

      return changed ? next : prev;
    });
  }, [location.pathname, visibleNavSections]);

  useEffect(() => {
    if (!location.pathname.startsWith("/platform/app/")) {
      return;
    }
    const currentItem = allNavItems.find((item) => location.pathname.startsWith(item.path));
    if (!currentItem) {
      return;
    }
    if (currentItem.allowedRoles && !currentItem.allowedRoles.includes(currentRole)) {
      navigate("/platform/app/overview", { replace: true });
    }
  }, [location.pathname, currentRole, navigate, allNavItems]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const params = new URLSearchParams(location.search);
    const inviteToken = params.get("invite")?.trim();
    if (!inviteToken || inviteHandledRef.current === inviteToken) {
      return;
    }

    inviteHandledRef.current = inviteToken;
    setInviteStatus("Accepting workspace invitation...");
    platformAcceptTeamInvitation(token, inviteToken, backendUrl)
      .then(async () => {
        await refresh();
        setInviteStatus("Workspace invitation accepted.");
      })
      .catch((error) => {
        setInviteStatus(error instanceof Error ? error.message : "Invitation acceptance failed.");
      })
      .finally(() => {
        params.delete("invite");
        const nextSearch = params.toString();
        navigate(
          { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
          { replace: true }
        );
      });
  }, [token, location.pathname, location.search, navigate, backendUrl, refresh]);

  const renderNavItem = (item: PlatformNavItem, className = "") => {
    const itemIsActive = location.pathname.startsWith(item.path);
    return (
      <NavLink
        key={item.key}
        to={item.path}
        onClick={() => setIsSidebarOpen(false)}
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150
          ${isActive
            ? "bg-gradient-to-r from-[#c9a96e]/14 to-[#c9a96e]/6 text-[#e8d5a8] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            : "text-white/55 hover:bg-white/[0.06] hover:text-white/85"
          } ${className}`.trim()
        }
      >
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-[17px] transition-all duration-150 ${
            itemIsActive
              ? "border-[#c9a96e]/20 bg-[#c9a96e]/12 text-[#c9a96e]"
              : "border-white/[0.06] bg-white/[0.03] text-white/65 group-hover:border-white/[0.1] group-hover:bg-white/[0.05] group-hover:text-white/90"
          }`}
        >
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#faf8f4] font-[family-name:var(--font-body)]">

      {/* ── Backdrop ─────────────────────────────── */}
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#0a0a0f]/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
          tabIndex={-1}
        />
      )}

      {/* ── Sidebar ──────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col
          border-r border-white/[0.06] bg-[#0a0a0f] text-white shadow-[0_18px_50px_rgba(10,10,15,0.18)]
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          lg:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-5">
          <div className="flex pl-0 flex-shrink-0 items-center justify-center  text-[18px] text-[#c9a96e]">
            <PlatformLogo className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <strong className="block truncate text-sm font-semibold tracking-tight text-white">
              AeroConcierge
            </strong>
            <p className="text-[11px] text-white/40 tracking-wider uppercase">Platform Console</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-md p-1 text-white/40 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <IconClose />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          <div className="space-y-1.5">
            {visiblePrimaryNavItems.map((item) => renderNavItem(item))}
          </div>

          {visibleNavSections.length > 0 ? <div className="mx-2 border-t border-white/[0.06]" /> : null}

          <div className="space-y-1.5">
            {visibleNavSections.map((section) => {
              const isExpanded = expandedSections[section.key] ?? false;
              const sectionHasActiveItem = section.items.some((item) => location.pathname.startsWith(item.path));
              return (
                <div key={section.key} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSections((prev) => ({ ...prev, [section.key]: !(prev[section.key] ?? false) }))
                    }
                    aria-expanded={isExpanded}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-all duration-150 ${
                      sectionHasActiveItem
                        ? "bg-white/[0.06] text-[#e8d5a8]"
                        : "text-white/55 hover:bg-white/[0.06] hover:text-white/85"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-[13px] ${
                          sectionHasActiveItem
                            ? "border-[#c9a96e]/20 bg-[#c9a96e]/12 text-[#c9a96e]"
                            : "border-white/[0.06] bg-white/[0.03] text-white/60 group-hover:border-white/[0.1] group-hover:text-white/85"
                        }`}
                      >
                        {section.icon}
                      </span>
                      <span className="truncate text-xs font-semibold uppercase tracking-[0.13em]">{section.label}</span>
                    </span>
                    <span
                      className={`text-[11px] transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-white/65" : "text-white/35"
                      }`}
                    >
                      <IconChevronDown />
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="space-y-1 pl-3">
                      {section.items.map((item) => renderNavItem(item))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-3 py-4 space-y-2.5">
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1a5c5c]/20 text-[15px] text-[#2a8080]">
              <IconSupport />
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs font-semibold text-white/70">Need Help?</strong>
              <p className="truncate text-[11px] text-white/40">support@aeroconcierge.com</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { logout(); navigate("/platform/login"); }}
            className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm font-medium text-white/55 transition hover:border-white/[0.1] hover:bg-white/[0.06] hover:text-white/85"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[15px] text-white/60">
              <IconLogout />
            </span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────── */}
      <section className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden lg:pl-[264px]">

        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#0a0a0f]/[0.07] bg-[#faf8f4]/90 px-3 py-2.5 backdrop-blur-md sm:px-6 sm:py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#0a0a0f]/10 bg-white text-[#0a0a0f]/60 shadow-sm transition hover:border-[#0a0a0f]/20 hover:text-[#0a0a0f] lg:hidden"
            >
              <IconMenu />
            </button>

            <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#0a0a0f]/8 bg-white shadow-sm text-[#c9a96e]">
                <PlatformLogo className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-semibold tracking-tight text-[#0a0a0f]">
                  AeroConcierge
                </strong>
              </div>
            </div>

            <div className="hidden min-w-0 lg:block">
              <span className="block text-[11px] font-medium uppercase tracking-widest text-[#a07840]">Dashboard</span>
              <h1 className="truncate text-base font-semibold text-[#0a0a0f] sm:text-lg">
                {activeSectionLabel}
              </h1>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {profile?.tenants?.length ? (
              <label
                className={`relative flex min-w-0 max-w-[182px] items-center rounded-full border bg-white/92 pl-3 pr-9 py-2 text-sm shadow-sm transition sm:max-w-[260px] sm:pl-3.5 sm:pr-10 ${
                  loading
                    ? "border-[#0a0a0f]/8 opacity-70"
                    : "border-[#0a0a0f]/10 hover:border-[#0a0a0f]/18"
                }`}
              >
                <span className="mr-2 hidden flex-shrink-0 text-[11px] font-medium text-[#0a0a0f]/42 sm:block">
                  Workspace
                </span>
                <select
                  ref={tenantSelectRef}
                  value={selectedTenantId || ""}
                  onChange={(e) => selectTenant(e.target.value)}
                  disabled={loading}
                  className="min-w-0 w-full cursor-pointer appearance-none bg-transparent pr-2 text-[13px] font-medium text-[#0a0a0f] focus:outline-none disabled:cursor-not-allowed sm:pr-4 sm:text-sm"
                  aria-label="Select workspace"
                >
                  {(profile?.tenants ?? []).map((t) => (
                    <option key={t.tenant_id} value={t.tenant_id}>{t.name || t.tenant_id}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    tenantSelectRef.current?.focus();
                    tenantSelectRef.current?.click();
                  }}
                  disabled={loading}
                  aria-label="Open workspace selector"
                  className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[12px] text-[#0a0a0f]/34 transition hover:text-[#0a0a0f]/60 disabled:cursor-not-allowed sm:right-3 sm:h-6 sm:w-6 sm:text-[13px]"
                >
                  <IconChevronDown />
                </button>
              </label>
            ) : (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                No workspace yet
              </span>
            )}
          </div>
        </header>

        {shouldShowTrialBanner && profile?.subscription ? (
          <div className="px-4 pt-4 sm:px-6">
            <TrialUpgradeBanner subscription={profile.subscription} />
          </div>
        ) : null}
        {inviteStatus ? (
          <div className="px-4 pt-4 sm:px-6">
            <div className="rounded-xl border border-[#0a0a0f]/10 bg-white px-4 py-3 text-sm text-[#0a0a0f]/75">
              {inviteStatus}
            </div>
          </div>
        ) : null}

        {/* Page Content — inner Suspense keeps sidebar + topbar mounted during transitions */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </section>
    </div>
  );
}
