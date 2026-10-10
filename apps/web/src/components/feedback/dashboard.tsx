"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  Download,
  MessageSquare,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { api, apiUrl } from "@/lib/api/client";
import { useCan, useCurrentWorkspace } from "@/lib/api/hooks";
import type { Page, Survey } from "@/lib/api/surveys";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ReportTools } from "./report-tools";
import { Input } from "@/components/ui/input";

type Overview = {
  total_responses: number;
  csat: number | null;
  completion_rate: number | null;
  analyzed_texts: number;
  urgent_responses: number;
  sentiments: Record<string, { count: number; percent: number | null }>;
};
type Trend = { date: string; responses: number; csat: number | null };
type TopicTrend = { date: string; topic_id: string; count: number };
type Word = { word: string; sentiment: string; count: number };
type Export = {
  id: string;
  status: string;
  ready: boolean;
  error_message: string | null;
  filename?: string | null;
};

export function Dashboard() {
  const t = useTranslations("dashboard");
  const tn = useTranslations("notifications");
  const toolsT = useTranslations("engagement");
  const { workspace } = useCurrentWorkspace();
  const client = useQueryClient();
  const canExport = useCan("data:export");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [surveyId, setSurveyId] = useState("");
  const [channel, setChannel] = useState("");
  const [period, setPeriod] = useState("week");
  const [job, setJob] = useState<string | null>(null);
  const [error, setError] = useState("");
  const hasDashboardFilters = Boolean(start || end || surveyId || channel || period !== "week");
  const params = new URLSearchParams({ workspace_id: workspace?.id || "" });
  if (start) params.set("start", new Date(`${start}T00:00:00`).toISOString());
  if (end) params.set("end", new Date(`${end}T00:00:00`).toISOString());
  if (surveyId) params.set("survey_id", surveyId);
  if (channel) params.set("channel", channel);
  const filter = params.toString();
  const overview = useQuery({
    queryKey: ["overview", filter],
    enabled: !!workspace,
    queryFn: () => api<Overview>(`/analytics/overview?${filter}`),
    refetchInterval: 20000,
  });
  const trends = useQuery({
    queryKey: ["trends", filter, period],
    enabled: !!workspace,
    queryFn: () => api<Trend[]>(`/analytics/trends?${filter}&period=${period}`),
    refetchInterval: 20000,
  });
  const topics = useQuery({
    queryKey: ["topic-trends", filter, period],
    enabled: !!workspace,
    queryFn: () => api<TopicTrend[]>(`/analytics/topics?${filter}&period=${period}`),
    refetchInterval: 20000,
  });
  const catalog = useQuery({
    queryKey: ["topics", workspace?.id],
    enabled: !!workspace,
    queryFn: () =>
      api<{ topics: { id: string; name: string; color: string }[] }>(
        `/workspaces/${workspace!.id}/topics`,
      ),
  });
  const words = useQuery({
    queryKey: ["wordcloud", filter],
    enabled: !!workspace,
    queryFn: () => api<Word[]>(`/analytics/wordcloud?${filter}`),
    refetchInterval: 20000,
  });
  const surveys = useQuery({
    queryKey: ["survey-options", workspace?.id],
    enabled: !!workspace,
    queryFn: () => api<Page<Survey>>(`/surveys?workspace_id=${workspace!.id}&page_size=100`),
  });
  const report = useQuery({
    queryKey: ["export", job],
    enabled: !!job,
    queryFn: () => api<Export>(`/exports/${job}`),
    refetchInterval: (q) =>
      ["done", "failed"].includes(q.state.data?.status || "") ? false : 2000,
  });
  useEffect(() => {
    if (report.data?.ready) toast.success(tn("exportReady"));
  }, [job, report.data?.ready, tn]);
  useEffect(() => {
    if (!workspace) return;
    const stream = new EventSource(apiUrl(`/analytics/events?${filter}`), {
      withCredentials: true,
    });
    stream.addEventListener("overview", (e) => {
      try {
        client.setQueryData(["overview", filter], JSON.parse((e as MessageEvent).data));
      } catch {}
    });
    stream.addEventListener("expired", () => stream.close());
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [filter, workspace, client]);
  async function exportReport(kind: string) {
    setError("");
    try {
      const result = await api<Export>("/exports", {
        method: "POST",
        body: { kind, filters: Object.fromEntries(params) },
      });
      setJob(result.id);
      toast.info(t("exportPending"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function downloadFile(path: string, filename: string) {
    setError("");
    try {
      const blob = await api<Blob>(path);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(tn("downloaded"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function clearDashboardFilters() {
    setStart("");
    setEnd("");
    setSurveyId("");
    setChannel("");
    setPeriod("week");
  }
  const data = overview.data;
  const percent = (value: number | null | undefined) =>
    value == null ? "—" : `${Math.round(value * 100)}%`;
  const sentimentSlices = [
    { key: "positive", count: data?.sentiments.positive?.count ?? 0, color: "var(--positive)" },
    { key: "negative", count: data?.sentiments.negative?.count ?? 0, color: "var(--negative)" },
    { key: "neutral", count: data?.sentiments.neutral?.count ?? 0, color: "var(--neutral)" },
  ];
  const sentimentTotal = sentimentSlices.reduce((sum, slice) => sum + slice.count, 0);
  const positiveCount = sentimentSlices.find((slice) => slice.key === "positive")?.count ?? 0;
  const negativeCount = sentimentSlices.find((slice) => slice.key === "negative")?.count ?? 0;
  const positiveEnd = sentimentTotal ? (positiveCount / sentimentTotal) * 100 : 0;
  const negativeEnd = sentimentTotal ? ((positiveCount + negativeCount) / sentimentTotal) * 100 : 0;
  const sentimentChart = sentimentTotal
    ? `conic-gradient(var(--positive) 0% ${positiveEnd}%, var(--negative) ${positiveEnd}% ${negativeEnd}%, var(--neutral) ${negativeEnd}% 100%)`
    : "conic-gradient(var(--muted) 0% 100%)";
  const maximum = Math.max(1, ...(trends.data || []).map((row) => row.responses));
  const latestTrend = trends.data?.at(-1);
  const previousTrend = trends.data?.at(-2);
  const responseChange =
    latestTrend && previousTrend ? latestTrend.responses - previousTrend.responses : null;
  const qualityTrend = (trends.data || []).filter(
    (row): row is Trend & { csat: number } => row.csat !== null,
  );
  const firstQualityPeriod = qualityTrend.at(0);
  const lastQualityPeriod = qualityTrend.at(-1);
  const qualityChange =
    firstQualityPeriod && lastQualityPeriod && qualityTrend.length > 1
      ? lastQualityPeriod.csat - firstQualityPeriod.csat
      : null;
  const buckets = [...new Set((topics.data || []).map((row) => row.date))].sort();
  const latest = buckets.at(-1);
  const previous = buckets.at(-2);
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        actions={
          canExport && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() =>
                  void downloadFile(`/responses/export?${filter}`, "customer-responses.xlsx")
                }
              >
                <Download className="size-4" aria-hidden />
                {t("exportResponses")}
              </Button>
              {["xlsx", "pdf"].map((kind) => (
                <Button
                  key={kind}
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    void exportReport(kind);
                  }}
                >
                  {t("export", { kind: kind.toUpperCase() })}
                </Button>
              ))}
              <Button
                className="gap-2 rounded-xl"
                onClick={() => document.getElementById("report-schedule")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Settings2 className="size-4" aria-hidden />
                {toolsT("schedule")}
              </Button>
            </div>
          )
        }
      />
      <section aria-label={t("filters")} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <SlidersHorizontal className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold tracking-tight">{t("filters")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("filterDescription")}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1.35fr)_repeat(3,minmax(10rem,1fr))_auto]">
          <fieldset className="min-w-0 space-y-1.5">
            <legend className="text-xs font-medium">{t("dateRange")}</legend>
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-10 min-w-0 rounded-lg bg-background" aria-label={t("start")} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <Input className="h-10 min-w-0 rounded-lg bg-background" aria-label={t("end")} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </fieldset>
          <label className="block min-w-0 space-y-1.5 text-xs font-medium">
            <span>{t("reportScope")}</span>
            <select className="h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-sm" value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
              <option value="">{t("allSurveys")}</option>
              {surveys.data?.items.map((s) => <option value={s.id} key={s.id}>{s.title}</option>)}
            </select>
          </label>
          <label className="block min-w-0 space-y-1.5 text-xs font-medium">
            <span>{t("channel")}</span>
            <select className="h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-sm" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">{t("allChannels")}</option>
              {["link", "qr", "embed", "email", "kiosk", "zalo", "import"].map((c) => <option value={c} key={c}>{t(`channels.${c}` as Parameters<typeof t>[0])}</option>)}
            </select>
          </label>
          <label className="block min-w-0 space-y-1.5 text-xs font-medium">
            <span>{t("period")}</span>
            <select className="h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-sm" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {["week", "month", "quarter"].map((p) => <option value={p} key={p}>{t(`periods.${p}` as Parameters<typeof t>[0])}</option>)}
            </select>
          </label>
          <Button type="button" variant="outline" className="h-10 self-end rounded-lg" disabled={!hasDashboardFilters} onClick={clearDashboardFilters}>
            <RotateCcw className="size-4" aria-hidden />
            {t("clearFilters")}
          </Button>
        </div>
      </section>
      <div className="min-w-0 space-y-6">
          {(error || overview.error || report.error) && (
            <p role="alert">{error || overview.error?.message || report.error?.message}</p>
          )}
          {overview.isLoading && <p role="status">{t("loading")}</p>}
          {report.data && (
            <div role="status" className="rounded-xl border p-4">
              {report.data.ready ? (
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    void downloadFile(
                      `/exports/${job}/download`,
                      report.data.filename || `report-${job}.xlsx`,
                    )
                  }
                >
                  {t("download")}
                </button>
              ) : report.data.status === "failed" ? (
                t("exportFailed")
              ) : (
                t("exportPending")
              )}
              {report.data.error_message && <p>{report.data.error_message}</p>}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {[
              { label: "total", value: data?.total_responses ?? "—", Icon: MessageSquare, tone: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
              { label: "csat", value: data?.csat?.toFixed(2) ?? "—", Icon: Star, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
              { label: "urgent", value: data?.urgent_responses ?? "—", Icon: AlertTriangle, tone: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
              { label: "completion", value: percent(data?.completion_rate), Icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
            ].map(({ label, value, Icon, tone }) => (
              <article key={label} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{t(label as Parameters<typeof t>[0])}</p>
                  <span className={`grid size-9 place-items-center rounded-xl ${tone}`}><Icon className="size-4" aria-hidden /></span>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
                {label === "csat" && <div className="mt-2 flex text-amber-500" aria-label={`${value} / 5`}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-4 ${data?.csat && data.csat >= i + 1 ? "fill-current" : ""}`} aria-hidden />)}
                </div>}
                {label === "completion" && <div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, (data?.completion_rate || 0) * 100))}%` }} /></div>}
              </article>
            ))}
          </div>
          <section aria-labelledby="sentiment-distribution-title" className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div>
              <h2 id="sentiment-distribution-title" className="text-lg font-semibold tracking-tight">
                {t("sentimentsTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("sentimentsNote")}</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.2fr)]">
              <article className="flex flex-col items-center justify-center gap-5 rounded-xl border bg-card p-5 sm:flex-row lg:flex-col">
                <div
                  role="img"
                  aria-label={sentimentSlices
                    .map(
                      ({ key, count }) =>
                        `${t(`sentiments.${key}` as Parameters<typeof t>[0])}: ${count}`,
                    )
                    .join(", ")}
                  className="grid size-44 shrink-0 place-items-center rounded-full"
                  style={{ background: sentimentChart }}
                >
                  <div className="grid size-28 place-content-center rounded-full bg-card text-center shadow-inner">
                    <strong className="text-2xl leading-tight">{sentimentTotal}</strong>
                    <span className="text-xs text-muted-foreground">{t("total")}</span>
                  </div>
                </div>
                <ul className="w-full space-y-3">
                  {sentimentSlices.map(({ key, count, color }) => (
                    <li key={key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          aria-hidden
                          className="size-2.5 rounded-full"
                          style={{ background: color }}
                        />
                        {t(`sentiments.${key}` as Parameters<typeof t>[0])}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {sentimentTotal ? `${Math.round((count / sentimentTotal) * 100)}%` : "0%"}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="grid content-center gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
                {sentimentSlices.map(({ key, count }) => (
                  <div
                    key={key}
                    className={
                      key === "positive"
                        ? "text-positive-ink"
                        : key === "negative"
                          ? "text-negative-ink"
                          : "text-muted-foreground"
                    }
                  >
                    <p>{t(`sentiments.${key}` as Parameters<typeof t>[0])}</p>
                    <strong className="text-2xl">{percent(data?.sentiments[key]?.percent)}</strong>
                    <p>{count}</p>
                  </div>
                ))}
              </article>
            </div>
          </section>
          <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h2 className="text-xl font-semibold">{t("trends")}</h2>
            <div className="rounded-xl bg-muted/40 p-4">
              <h3 className="font-medium">{t("comparisonTitle")}</h3>
              {latestTrend && previousTrend && responseChange !== null ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(previousTrend.date).toLocaleDateString("vi-VN")} →{" "}
                    {new Date(latestTrend.date).toLocaleDateString("vi-VN")}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {responseChange > 0 ? "+" : ""}
                    {responseChange} {t("responsesChange")}
                  </span>
                  <span
                    className={
                      responseChange > 0
                        ? "font-medium text-positive-ink"
                        : responseChange < 0
                          ? "font-medium text-negative-ink"
                          : "font-medium text-muted-foreground"
                    }
                  >
                    {t(
                      responseChange > 0
                        ? "increased"
                        : responseChange < 0
                          ? "decreased"
                          : "unchanged",
                    )}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{t("comparisonUnavailable")}</p>
              )}
            </div>
            {trends.data?.length === 0 && <p>{t("empty")}</p>}
            <div className="flex h-56 items-end gap-2 overflow-x-auto pb-8">
              {trends.data?.map((row) => (
                <div
                  key={row.date}
                  className="relative flex h-full min-w-12 flex-1 items-end"
                  title={`${new Date(row.date).toLocaleDateString("vi-VN")}: ${row.responses}`}
                >
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${Math.max(2, (row.responses / maximum) * 100)}%` }}
                  >
                    <span className="block text-center text-sm text-primary-foreground">
                      {row.responses}
                    </span>
                  </div>
                  <span className="absolute -bottom-7 w-full text-center text-xs">
                    {new Date(row.date).toLocaleDateString("vi-VN", {
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold">{t("qualityTrend")}</h2>
              <p className="text-sm text-muted-foreground">{t("qualityTrendDescription")}</p>
            </div>
            {qualityTrend.length > 0 ? (
              <div className="overflow-x-auto">
                <svg
                  viewBox="0 0 640 250"
                  role="img"
                  aria-label={t("qualityTrend")}
                  className="h-64 w-full min-w-[520px]"
                >
                  {[1, 2, 3, 4, 5].map((value) => {
                    const y = 190 - value * 30;
                    return (
                      <g key={value}>
                        <line
                          x1="48"
                          x2="620"
                          y1={y}
                          y2={y}
                          stroke="currentColor"
                          strokeOpacity="0.12"
                        />
                        <text
                          x="34"
                          y={y + 4}
                          textAnchor="end"
                          className="fill-muted-foreground text-[11px]"
                        >
                          {value}
                        </text>
                      </g>
                    );
                  })}
                  {qualityTrend.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={qualityTrend
                        .map((row, index) => {
                          const x = 48 + (index / (qualityTrend.length - 1)) * 572;
                          return `${x},${190 - row.csat * 30}`;
                        })
                        .join(" ")}
                    />
                  )}
                  {qualityTrend.map((row, index) => {
                    const x =
                      qualityTrend.length === 1
                        ? 48
                        : 48 + (index / (qualityTrend.length - 1)) * 572;
                    const y = 190 - row.csat * 30;
                    const tickStep = Math.max(1, Math.ceil(qualityTrend.length / 6));
                    const showDate = index % tickStep === 0 || index === qualityTrend.length - 1;
                    return (
                      <g key={row.date}>
                        <circle cx={x} cy={y} r="5" fill="var(--primary)">
                          <title>{`${new Date(row.date).toLocaleDateString("vi-VN")}: ${row.csat.toFixed(2)}`}</title>
                        </circle>
                        {showDate && (
                          <text
                            x={x}
                            y="218"
                            textAnchor="middle"
                            className="fill-muted-foreground text-[10px]"
                          >
                            {new Date(row.date).toLocaleDateString("vi-VN", {
                              month: "2-digit",
                              day: "2-digit",
                            })}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("qualityTrendUnavailable")}</p>
            )}
            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              <h3 className="font-medium">{t("overallAssessment")}</h3>
              {qualityChange !== null ? (
                <p className="mt-1 text-muted-foreground">
                  {qualityChange > 0.05
                    ? t("qualityImproved", { delta: qualityChange.toFixed(2) })
                    : qualityChange < -0.05
                      ? t("qualityDeclined", { delta: Math.abs(qualityChange).toFixed(2) })
                      : t("qualityStable")}
                </p>
              ) : (
                <p className="mt-1 text-muted-foreground">{t("qualityAssessmentUnavailable")}</p>
              )}
            </div>
          </section>
          </div>
          <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h2 className="text-xl font-semibold">{t("topics")}</h2>
            <p className="text-sm text-muted-foreground">{t("anomalyNote")}</p>
            {catalog.data?.topics.map((topic) => {
              const current =
                topics.data?.find((r) => r.topic_id === topic.id && r.date === latest)?.count || 0;
              const before =
                topics.data?.find((r) => r.topic_id === topic.id && r.date === previous)?.count ||
                0;
              return (
                <div key={topic.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-background p-4">
                  <span className="size-3 rounded-full" style={{ background: topic.color }} />
                  <Link href={`/responses?topic_id=${topic.id}`} className="underline">
                    {topic.name}
                  </Link>
                  <span>{current}</span>
                  {previous && current >= 5 && current > before * 2 && (
                    <span className="text-urgent-ink">{t("spike")}</span>
                  )}
                  <div className="flex items-end gap-1">
                    {buckets.map((date) => (
                      <span
                        key={date}
                        className="w-4 rounded-t"
                        title={`${date}: ${topics.data?.find((r) => r.topic_id === topic.id && r.date === date)?.count || 0}`}
                        style={{
                          background: topic.color,
                          height: Math.max(
                            2,
                            Math.min(
                              40,
                              (topics.data?.find((r) => r.topic_id === topic.id && r.date === date)
                                ?.count || 0) * 2,
                            ),
                          ),
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
          <div className="grid gap-4 md:grid-cols-2">
            {["positive", "negative"].map((sentiment) => (
              <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm" key={sentiment}>
                <h2 className="border-b border-border/70 pb-3 text-lg font-semibold tracking-tight">
                  {t(sentiment === "positive" ? "praise" : "complaints")}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {words.data
                    ?.filter((w) => w.sentiment === sentiment)
                    .map((w) => (
                      <Link
                        className={
                          sentiment === "positive"
                            ? "rounded-full border border-positive/25 bg-positive-soft px-3 py-1.5 font-medium text-positive-ink"
                            : "rounded-full border border-negative/25 bg-negative-soft px-3 py-1.5 font-medium text-negative-ink"
                        }
                        style={{ fontSize: Math.min(34, 14 + Math.log2(w.count + 1) * 3) }}
                        key={w.word}
                        href={`/responses?search=${encodeURIComponent(w.word)}&sentiment=${sentiment}`}
                        title={String(w.count)}
                      >
                        {w.word.replaceAll("_", " ")}
                      </Link>
                    ))}
                </div>
              </section>
            ))}
          </div>
          {workspace && <ReportTools workspaceId={workspace.id} filter={filter} />}
        </div>
    </div>
  );
}
