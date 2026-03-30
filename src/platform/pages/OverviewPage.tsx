import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { platformGetAnalytics } from "@/lib/platformApi";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import { getDnsReminderMessage, getDnsStatusLabel, getKnowledgeStatusLabel } from "@/platform/status";
import { usePlatformAuth } from "@/platform/state/auth";
import type {
  PlatformAnalyticsRange,
  PlatformAnalyticsResponse,
  PlatformAnalyticsSummary
} from "@/platform/types";

const RANGE_OPTIONS: Array<{ value: PlatformAnalyticsRange; label: string }> = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "billing_cycle", label: "Billing cycle" }
];

const CHART_COLORS = {
  gold: "#c9a96e",
  goldSoft: "rgba(201, 169, 110, 0.18)",
  teal: "#1a5c5c",
  tealSoft: "rgba(26, 92, 92, 0.14)",
  charcoal: "#0a0a0f",
  red: "#c74b4b",
  grid: "rgba(10, 10, 15, 0.08)"
};

const PIE_COLORS = ["#c9a96e", "#1a5c5c", "#7a6640", "#d2b78c", "#8b9d9d"];

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0
  }).format(value);
}

function formatExactNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatBucketLabel(bucketStart: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${bucketStart}T00:00:00.000Z`));
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "No data";
  }

  return `${Math.round(value * 100)}%`;
}

function formatDuration(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "No data";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(1)} s`;
}

function formatSeconds(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "No data";
  }

  if (value < 60) {
    return `${value}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}m ${seconds}s`;
}

function formatUtilization(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "No data";
  }

  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function buildQuotaRatio(summary: PlatformAnalyticsSummary) {
  if (!summary.message_quota_limit) {
    return 0;
  }

  return Math.min(1, summary.message_quota_used / summary.message_quota_limit);
}

function AnalyticsTooltip({
  active,
  label,
  payload
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#0a0a0f]/10 bg-white/95 px-3 py-2 shadow-xl backdrop-blur">
      {label ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07840]">
          {label}
        </p>
      ) : null}
      <div className="mt-2 space-y-1.5">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-[#0a0a0f]/60">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color ?? CHART_COLORS.charcoal }}
              />
              {item.name}
            </span>
            <span className="font-semibold text-[#0a0a0f]">
              {formatExactNumber(Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard(input: {
  label: string;
  value: string;
  note: string;
  accent?: "default" | "warning";
}) {
  const accentClass =
    input.accent === "warning"
      ? "border-[#c74b4b]/15 bg-[#fff6f6]"
      : "border-[#0a0a0f]/08 bg-white";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a0a0f]/42">
        {input.label}
      </p>
      <strong className="mt-2 block font-[family-name:var(--font-display)] text-[1.9rem] font-light leading-none text-[#0a0a0f]">
        {input.value}
      </strong>
      <p className="mt-2 text-sm text-[#0a0a0f]/55">{input.note}</p>
    </div>
  );
}

function EmptyAnalyticsState() {
  return (
    <div className="rounded-3xl border border-dashed border-[#c9a96e]/40 bg-white/70 px-6 py-10 text-center shadow-sm">
      <span className="inline-flex rounded-full border border-[#c9a96e]/30 bg-[#fffaf1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07840]">
        Usage starts after first visitor conversation
      </span>
      <h3 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-light text-[#0a0a0f]">
        No live analytics yet
      </h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-[#0a0a0f]/55">
        Once visitors begin chatting on your site or in the preview widget, this dashboard will
        populate with messages, tokens, response time, and workspace activity.
      </p>
    </div>
  );
}

export default function OverviewPage() {
  const { selectedTenant, token } = usePlatformAuth();
  const [range, setRange] = useState<PlatformAnalyticsRange>("7d");
  const [analytics, setAnalytics] = useState<PlatformAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  useEffect(() => {
    const tenantId = selectedTenant?.tenant_id;
    if (!token || !tenantId) {
      return;
    }

    let disposed = false;

    async function load(showLoader: boolean) {
      if (showLoader) {
        setAnalyticsLoading(true);
      }

      try {
        const next = await platformGetAnalytics(token, {
          range,
          tenantId,
          timezone
        });
        if (!disposed) {
          setAnalytics(next);
          setAnalyticsError("");
        }
      } catch (error) {
        if (!disposed) {
          setAnalyticsError(error instanceof Error ? error.message : "Failed to load analytics");
        }
      } finally {
        if (!disposed) {
          setAnalyticsLoading(false);
        }
      }
    }

    void load(true);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load(false);
      }
    }, 60_000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [range, selectedTenant?.tenant_id, timezone, token]);

  const trendData = useMemo(
    () =>
      analytics?.account.trend.map((point) => ({
        ...point,
        label: formatBucketLabel(point.bucket_start)
      })) ?? [],
    [analytics]
  );

  const workspaceTrendData = useMemo(
    () =>
      analytics?.workspace?.trend.map((point) => ({
        ...point,
        label: formatBucketLabel(point.bucket_start)
      })) ?? [],
    [analytics]
  );

  const workspaceBarData = useMemo(
    () =>
      analytics?.account.workspaces.slice(0, 5).map((row) => ({
        ...row,
        shortName: row.name.length > 18 ? `${row.name.slice(0, 18)}...` : row.name
      })) ?? [],
    [analytics]
  );

  if (!selectedTenant) {
    return <WorkspaceCreateForm />;
  }

  const profile = selectedTenant.business_profile;
  const currentRole = selectedTenant.workspace_role ?? "viewer";
  const isWorkspaceScopedRole =
    currentRole === "agent" || currentRole === "supervisor" || currentRole === "viewer";
  const domainVerification = selectedTenant.domain_verification;
  const knowledgeBase = selectedTenant.knowledge_base;
  const widgetReady = selectedTenant.widget?.enabled === true;

  const checklist = [
    { done: Boolean(selectedTenant.allowed_domains?.[0]), label: "Tenant domain configured" },
    { done: domainVerification?.status === "verified", label: "DNS ownership verified" },
    {
      done: knowledgeBase.status === "ready" || knowledgeBase.status === "warning",
      label: "Knowledge base indexed"
    },
    { done: widgetReady, label: "Widget ready for website install" }
  ];
  const completedSteps = checklist.filter((item) => item.done).length;
  const progress = Math.round((completedSteps / checklist.length) * 100);

  const kpis = [
    { label: "Primary domain", value: selectedTenant.allowed_domains?.[0] || "Not configured" },
    { label: "DNS status", value: getDnsStatusLabel(domainVerification?.status) },
    { label: "Knowledge base", value: getKnowledgeStatusLabel(knowledgeBase.status) },
    { label: "Website widget", value: widgetReady ? "Ready to install" : "Blocked until DNS" },
    { label: "Services enabled", value: profile.supported_services.join(", ") || "flights" },
    { label: "Specialist number", value: profile.support_phone || "Not configured" }
  ];

  const activeScope = isWorkspaceScopedRole ? analytics?.workspace ?? null : analytics?.account ?? null;
  const activeSummary = activeScope?.summary ?? null;
  const activeTrendData = isWorkspaceScopedRole ? workspaceTrendData : trendData;
  const serviceMix = activeScope?.services ?? [];
  const topIntents = activeScope?.intents.slice(0, 4) ?? [];
  const hasUsage =
    (activeSummary?.messages_total ?? 0) > 0 ||
    (activeSummary?.tokens_total ?? 0) > 0;

  const quotaRatio = activeSummary ? buildQuotaRatio(activeSummary) : 0;
  const quotaAccent = quotaRatio >= 0.8 ? "warning" : "default";
  const tokenTrackingStartedAt = formatDateTime(analytics?.token_tracking_started_at ?? null);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">
          <span className="h-px w-5 bg-[#c9a96e]" /> Control Center
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-light text-[#0a0a0f] sm:text-3xl">
          Overview
        </h2>
        <p className="mt-1 text-sm text-[#0a0a0f]/50">
          Track onboarding status, live usage, and readiness before pushing the concierge to your
          public website.
        </p>
      </div>

      {/* <div className="rounded-2xl border border-[#1a5c5c]/15 bg-gradient-to-br from-[#1a5c5c]/[0.06] to-[#c9a96e]/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">
              Launch readiness
            </span>
            <strong className="mt-1 block text-lg font-semibold text-[#0a0a0f]">
              {completedSteps} of {checklist.length} steps completed
            </strong>
            <p className="mt-0.5 text-sm text-[#0a0a0f]/50">
              Your concierge is almost ready for production deployment.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0a0a0f]/08">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1a5c5c] to-[#2a8080] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <Link
            to="/platform/app/site-setup"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-[#0a0a0f] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#1a5c5c] sm:self-center"
          >
            Continue setup →
          </Link>
        </div>
      </div> */}

      {domainVerification?.status !== "verified" && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="mt-0.5 text-amber-500">⚠</span>
          <div>
            <strong className="text-sm font-semibold text-amber-800">
              {getDnsStatusLabel(domainVerification?.status)}
            </strong>
            <p className="mt-0.5 text-sm text-amber-700">
              {getDnsReminderMessage(domainVerification)}
            </p>
          </div>
        </div>
      )}

      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-3xl border border-[#0a0a0f]/08 bg-white/90 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07840]">
                Usage Analytics
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-light leading-none text-[#0a0a0f]">
                {isWorkspaceScopedRole ? "Live workspace activity" : "Live account and workspace activity"}
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-[#0a0a0f]/55">
                {isWorkspaceScopedRole
                  ? "Messages, tokens, visitors, quota usage, and response performance for the selected workspace update automatically every minute while this page is visible."
                  : "Messages, tokens, visitors, quota usage, and workspace health update automatically every minute while this page is visible."}
              </p>
              {tokenTrackingStartedAt ? (
                <p className="mt-3 text-xs text-[#0a0a0f]/45">
                  Token tracking started on {tokenTrackingStartedAt}. Older activity may show
                  message volume without token totals.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => {
                const active = option.value === range;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-[#0a0a0f] text-white shadow-md"
                        : "border border-[#0a0a0f]/10 bg-[#faf8f4] text-[#0a0a0f]/65 hover:border-[#c9a96e]/35 hover:text-[#0a0a0f]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {analyticsLoading && !analytics ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl border border-[#0a0a0f]/06 bg-[#faf8f4]"
                />
              ))}
            </div>
          ) : analyticsError ? (
            <div className="rounded-2xl border border-[#c74b4b]/15 bg-[#fff6f6] px-5 py-4 text-sm text-[#9c3a3a]">
              {analyticsError}
            </div>
          ) : analytics ? (
            <>
              {activeSummary ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <MetricCard
                    label="Conversations"
                    value={formatCompactNumber(activeSummary.conversations)}
                    note={`${formatExactNumber(activeSummary.unique_visitors)} unique visitors in this window`}
                  />
                  <MetricCard
                    label="Messages"
                    value={formatCompactNumber(activeSummary.messages_total)}
                    note={`${formatExactNumber(activeSummary.user_messages)} user / ${formatExactNumber(activeSummary.assistant_messages)} assistant`}
                  />
                  <MetricCard
                    label="Tokens used"
                    value={formatCompactNumber(activeSummary.tokens_total)}
                    note={`${formatExactNumber(activeSummary.tokens_exact)} exact and ${formatExactNumber(activeSummary.tokens_estimated)} estimated`}
                  />
                  <MetricCard
                    label="Unique visitors"
                    value={formatCompactNumber(activeSummary.unique_visitors)}
                    note="Distinct device IDs across visitor conversations"
                  />
                  {isWorkspaceScopedRole ? (
                    <MetricCard
                      label="Knowledge hit rate"
                      value={formatPercent(activeScope?.knowledge_hit_rate ?? null)}
                      note="Knowledge-assisted responses inside this workspace"
                    />
                  ) : (
                    <MetricCard
                      label="Active workspaces"
                      value={formatCompactNumber(analytics.account.health.workspaces_total)}
                      note={`${analytics.account.health.dns_verified_count} DNS verified / ${analytics.account.health.knowledge_ready_count} knowledge ready`}
                    />
                  )}
                  <MetricCard
                    label="Message quota used"
                    value={`${formatCompactNumber(activeSummary.message_quota_used)} / ${formatCompactNumber(activeSummary.message_quota_limit)}`}
                    note={`${Math.round(quotaRatio * 100)}% of the current billing allowance`}
                    accent={quotaAccent}
                  />
                  <MetricCard
                    label="VIP conversations"
                    value={formatCompactNumber(activeSummary.vip_conversations)}
                    note="Visitor-tagged VIP handoffs in this range"
                  />
                  <MetricCard
                    label="Avg first response"
                    value={formatSeconds(activeSummary.avg_first_response_seconds)}
                    note="From handoff request to first agent reply"
                  />
                  <MetricCard
                    label="Avg handle time"
                    value={formatSeconds(activeSummary.avg_handle_seconds)}
                    note="From assignment to closed conversation"
                  />
                  <MetricCard
                    label="Agent utilization"
                    value={formatUtilization(activeSummary.agent_utilization_ratio)}
                    note="Active assigned chats / configured queue capacity"
                  />
                  <MetricCard
                    label="CSAT"
                    value={
                      activeSummary.csat_avg_rating === null
                        ? "No data"
                        : `${activeSummary.csat_avg_rating.toFixed(2)} / 5`
                    }
                    note={`${formatExactNumber(activeSummary.csat_responses)} responses`}
                  />
                </div>
              ) : null}

              {!hasUsage ? (
                <EmptyAnalyticsState />
              ) : (
                <>
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
                    <div className="rounded-3xl border border-[#0a0a0f]/08 bg-[#fffdf9] p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07840]">
                            {isWorkspaceScopedRole ? "Workspace Trend" : "Messages vs Tokens"}
                          </p>
                          <h4 className="mt-1 text-lg font-semibold text-[#0a0a0f]">
                            {isWorkspaceScopedRole ? `${selectedTenant.name || profile.bot_name || "Workspace"} usage trend` : "Usage trend"}
                          </h4>
                        </div>
                        <span className="text-xs text-[#0a0a0f]/45">Dynamic by selected range</span>
                      </div>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={activeTrendData}>
                            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                            <XAxis
                              dataKey="label"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "rgba(10,10,15,0.45)", fontSize: 11 }}
                            />
                            <YAxis
                              yAxisId="messages"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "rgba(10,10,15,0.45)", fontSize: 11 }}
                            />
                            <YAxis
                              yAxisId="tokens"
                              orientation="right"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "rgba(10,10,15,0.45)", fontSize: 11 }}
                              tickFormatter={(value) => formatCompactNumber(Number(value))}
                            />
                            <Tooltip content={<AnalyticsTooltip />} />
                            <Bar
                              yAxisId="messages"
                              dataKey="messages_total"
                              name="Messages"
                              fill={CHART_COLORS.gold}
                              radius={[10, 10, 0, 0]}
                              maxBarSize={28}
                            />
                            <Area
                              yAxisId="tokens"
                              type="monotone"
                              dataKey="tokens_total"
                              name="Tokens"
                              stroke={CHART_COLORS.teal}
                              fill={CHART_COLORS.tealSoft}
                              strokeWidth={2.4}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07840]">
                            {isWorkspaceScopedRole ? "Token Source Breakdown" : "Workspace Usage"}
                          </p>
                          <h4 className="mt-1 text-lg font-semibold text-[#0a0a0f]">
                            {isWorkspaceScopedRole ? "Where token accounting comes from" : "Top workspaces by message volume"}
                          </h4>
                        </div>
                      </div>
                      {isWorkspaceScopedRole ? (
                        <div className="space-y-3">
                          {(activeScope?.token_sources ?? []).map((source) => (
                            <div key={source.key}>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#0a0a0f]/62">{source.label}</span>
                                <span className="font-semibold text-[#0a0a0f]">
                                  {formatCompactNumber(source.value)}
                                </span>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#faf8f4]">
                                <div
                                  className={`h-full rounded-full ${
                                    source.key === "estimated" ? "bg-[#c74b4b]" : "bg-[#1a5c5c]"
                                  }`}
                                  style={{ width: `${Math.max(4, Math.round(source.share * 100))}%` }}
                                />
                              </div>
                            </div>
                          ))}
                          <div className="rounded-2xl bg-[#faf8f4] px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a0a0f]/42">
                              Response speed
                            </p>
                            <strong className="mt-2 block text-2xl font-semibold text-[#0a0a0f]">
                              {formatDuration(activeScope?.avg_response_ms ?? null)}
                            </strong>
                            <p className="mt-2 text-sm text-[#0a0a0f]/52">
                              Measured from assistant generation start to final text in this workspace
                            </p>
                          </div>
                        </div>
                      ) : workspaceBarData.length === 0 ? (
                        <div className="rounded-2xl bg-[#faf8f4] px-4 py-6 text-sm text-[#0a0a0f]/50">
                          Workspace usage will appear here after conversations start.
                        </div>
                      ) : (
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={workspaceBarData} layout="vertical">
                              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
                              <XAxis
                                type="number"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: "rgba(10,10,15,0.45)", fontSize: 11 }}
                              />
                              <YAxis
                                type="category"
                                dataKey="shortName"
                                tickLine={false}
                                axisLine={false}
                                width={110}
                                tick={{ fill: "rgba(10,10,15,0.55)", fontSize: 11 }}
                              />
                              <Tooltip content={<AnalyticsTooltip />} />
                              <Bar
                                dataKey="messages_total"
                                name="Messages"
                                fill={CHART_COLORS.teal}
                                radius={[0, 10, 10, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                    <div className="rounded-3xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07840]">
                            Service Mix
                          </p>
                          <h4 className="mt-1 text-lg font-semibold text-[#0a0a0f]">
                            {isWorkspaceScopedRole
                              ? "Assistant intent and service distribution for this workspace"
                              : "Assistant intent and service distribution"}
                          </h4>
                        </div>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="h-[220px]">
                          {serviceMix.length === 0 ? (
                            <div className="flex h-full items-center justify-center rounded-2xl bg-[#faf8f4] px-4 text-center text-sm text-[#0a0a0f]/50">
                              Service mix appears after tracked assistant turns are recorded.
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={serviceMix}
                                  dataKey="value"
                                  nameKey="label"
                                  innerRadius={52}
                                  outerRadius={78}
                                  paddingAngle={3}
                                  stroke="none"
                                >
                                  {serviceMix.map((entry, index) => (
                                    <Cell
                                      key={entry.key}
                                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip content={<AnalyticsTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {serviceMix.slice(0, 4).map((item, index) => (
                              <div
                                key={item.key}
                                className="rounded-2xl bg-[#faf8f4] px-4 py-3"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                  />
                                  <span className="text-sm font-medium text-[#0a0a0f]">
                                    {item.label}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs text-[#0a0a0f]/52">
                                  {formatExactNumber(item.value)} turns
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="rounded-2xl border border-[#0a0a0f]/08 bg-[#fffdf9] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a0a0f]/42">
                              Top intents
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {topIntents.length > 0 ? (
                                topIntents.map((item) => (
                                  <span
                                    key={item.key}
                                    className="rounded-full border border-[#0a0a0f]/10 bg-white px-3 py-1.5 text-sm text-[#0a0a0f]/68"
                                  >
                                    {item.label} · {formatExactNumber(item.value)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-[#0a0a0f]/50">
                                  Intent mix appears after tracked turns are recorded.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
                      <div className="mb-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07840]">
                          {isWorkspaceScopedRole ? "Workspace Performance" : "Operations Health"}
                        </p>
                        <h4 className="mt-1 text-lg font-semibold text-[#0a0a0f]">
                          {isWorkspaceScopedRole ? "Selected workspace operational health" : "Readiness across workspaces"}
                        </h4>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(isWorkspaceScopedRole
                          ? [
                              {
                                label: "DNS status",
                                value: domainVerification?.status === "verified" ? "Verified" : "Pending",
                                note: getDnsReminderMessage(domainVerification)
                              },
                              {
                                label: "Knowledge base",
                                value: getKnowledgeStatusLabel(knowledgeBase.status),
                                note: knowledgeBase.message || "Current ingestion and answer state"
                              },
                              {
                                label: "Widget status",
                                value: widgetReady ? "Ready" : "Blocked",
                                note: widgetReady
                                  ? "Live install is available for this workspace"
                                  : "Widget unlocks once DNS is verified"
                              },
                              {
                                label: "Avg response",
                                value: activeSummary?.avg_response_ms
                                  ? formatDuration(activeSummary.avg_response_ms)
                                  : "No data",
                                note: "Measured from assistant generation start to final text"
                              }
                            ]
                          : [
                              {
                                label: "DNS verified",
                                value: analytics.account.health.dns_verified_count,
                                note: `${analytics.account.health.workspaces_total} total workspaces`
                              },
                              {
                                label: "Knowledge ready",
                                value: analytics.account.health.knowledge_ready_count,
                                note: "Ready or warning states included"
                              },
                              {
                                label: "Widget ready",
                                value: analytics.account.health.widget_ready_count,
                                note: "Live install available after DNS"
                              },
                              {
                                label: "Avg response",
                                value: analytics.account.summary.avg_response_ms
                                  ? formatDuration(analytics.account.summary.avg_response_ms)
                                  : "No data",
                                note: "Measured from assistant generation start to final text"
                              }
                            ]).map((item) => (
                          <div
                            key={item.label}
                            className="rounded-2xl bg-[#faf8f4] px-4 py-4"
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0a0a0f]/42">
                              {item.label}
                            </p>
                            <strong className="mt-2 block text-2xl font-semibold text-[#0a0a0f]">
                              {typeof item.value === "number"
                                ? formatCompactNumber(item.value)
                                : item.value}
                            </strong>
                            <p className="mt-2 text-sm text-[#0a0a0f]/52">{item.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!isWorkspaceScopedRole && analytics.workspace ? (
                    <div className="rounded-3xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07840]">
                            Selected Workspace
                          </p>
                          <h4 className="mt-1 text-2xl font-semibold text-[#0a0a0f]">
                            {analytics.workspace.name}
                          </h4>
                          <p className="mt-1 text-sm text-[#0a0a0f]/55">
                            Workspace-specific usage inside the currently selected control center
                            tenant.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            {
                              label: "Messages",
                              value: formatCompactNumber(analytics.workspace.summary.messages_total)
                            },
                            {
                              label: "Tokens",
                              value: formatCompactNumber(analytics.workspace.summary.tokens_total)
                            },
                            {
                              label: "Visitors",
                              value: formatCompactNumber(analytics.workspace.summary.unique_visitors)
                            },
                            {
                              label: "Knowledge hit rate",
                              value: formatPercent(analytics.workspace.knowledge_hit_rate)
                            },
                            {
                              label: "First response",
                              value: formatSeconds(analytics.workspace.summary.avg_first_response_seconds)
                            },
                            {
                              label: "Handle time",
                              value: formatSeconds(analytics.workspace.summary.avg_handle_seconds)
                            },
                            {
                              label: "Utilization",
                              value: formatUtilization(analytics.workspace.summary.agent_utilization_ratio)
                            },
                            {
                              label: "CSAT",
                              value:
                                analytics.workspace.summary.csat_avg_rating === null
                                  ? "No data"
                                  : `${analytics.workspace.summary.csat_avg_rating.toFixed(2)} / 5`
                            }
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-2xl border border-[#0a0a0f]/08 bg-[#faf8f4] px-4 py-3"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a0a0f]/42">
                                {item.label}
                              </p>
                              <strong className="mt-1 block text-base font-semibold text-[#0a0a0f]">
                                {item.value}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_320px]">
                        <div className="rounded-2xl border border-[#0a0a0f]/08 bg-[#fffdf9] p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-[#0a0a0f]">
                              Workspace trend
                            </p>
                            <span className="text-xs text-[#0a0a0f]/45">
                              {RANGE_OPTIONS.find((item) => item.value === range)?.label}
                            </span>
                          </div>
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={workspaceTrendData}>
                                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                                <XAxis
                                  dataKey="label"
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fill: "rgba(10,10,15,0.45)", fontSize: 11 }}
                                />
                                <YAxis
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fill: "rgba(10,10,15,0.45)", fontSize: 11 }}
                                />
                                <Tooltip content={<AnalyticsTooltip />} />
                                <Bar
                                  dataKey="messages_total"
                                  name="Messages"
                                  fill={CHART_COLORS.gold}
                                  radius={[10, 10, 0, 0]}
                                  maxBarSize={26}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="tokens_total"
                                  name="Tokens"
                                  stroke={CHART_COLORS.teal}
                                  fill={CHART_COLORS.goldSoft}
                                  strokeWidth={2}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#0a0a0f]/08 bg-[#faf8f4] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a07840]">
                            Token source breakdown
                          </p>
                          <div className="mt-3 space-y-3">
                            {analytics.workspace.token_sources.map((source) => (
                              <div key={source.key}>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-[#0a0a0f]/62">{source.label}</span>
                                  <span className="font-semibold text-[#0a0a0f]">
                                    {formatCompactNumber(source.value)}
                                  </span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                                  <div
                                    className={`h-full rounded-full ${
                                      source.key === "estimated" ? "bg-[#c74b4b]" : "bg-[#1a5c5c]"
                                    }`}
                                    style={{ width: `${Math.max(4, Math.round(source.share * 100))}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-5 rounded-2xl bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a0a0f]/42">
                              Response speed
                            </p>
                            <strong className="mt-1 block text-lg font-semibold text-[#0a0a0f]">
                              {formatDuration(analytics.workspace.avg_response_ms)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#0a0a0f]/50">
            Workspace details
          </h3>
          <dl className="grid grid-cols-2 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-[#faf8f4] px-4 py-3">
                <dt className="text-[11px] uppercase tracking-wider text-[#0a0a0f]/40">
                  {kpi.label}
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold text-[#0a0a0f]">
                  {kpi.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#0a0a0f]/08 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#0a0a0f]/50">
              Launch checklist
            </h3>
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      item.done
                        ? "bg-[#1a5c5c]/10 text-[#1a5c5c]"
                        : "bg-[#0a0a0f]/06 text-[#0a0a0f]/30"
                    }`}
                  >
                    {item.done ? "✓" : "·"}
                  </span>
                  <span
                    className={`text-sm ${
                      item.done ? "text-[#0a0a0f]" : "text-[#0a0a0f]/40"
                    }`}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Portal preview",
                note: "Test the chatbot inside this dashboard before DNS verification."
              },
              {
                label: "Website install",
                note: "Live widget/embed is blocked until the DNS TXT record is verified."
              }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#0a0a0f]/08 bg-white p-4 shadow-sm"
              >
                <strong className="block text-sm font-semibold text-[#0a0a0f]">
                  {item.label}
                </strong>
                <p className="mt-1 text-xs text-[#0a0a0f]/50">{item.note}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Site Setup", to: "/platform/app/site-setup" },
              { label: "Verify DNS", to: "/platform/app/dns" },
              { label: "Widget Code", to: "/platform/app/widget" }
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="rounded-lg border border-[#0a0a0f]/10 bg-white px-4 py-2 text-sm font-medium text-[#0a0a0f]/70 shadow-sm transition hover:border-[#1a5c5c]/30 hover:text-[#1a5c5c]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
