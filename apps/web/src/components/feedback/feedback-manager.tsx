"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  MessageSquareText,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
import { api, apiUrl } from "@/lib/api/client";
import { useCan, useCurrentWorkspace, useSession } from "@/lib/api/hooks";
import type { Choice, Page, Survey } from "@/lib/api/surveys";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { SavedFilters } from "./saved-filters";

type Feedback = {
  id: string;
  response_id: string;
  text: string;
  rating: number | null;
  sentiment: string | null;
  sentiment_score: number | null;
  topic_ids: string[];
  is_urgent: boolean;
  urgent_reasons: string[];
  channel: string;
  responded_at: string;
  status: string;
  note: string | null;
  updated_at: string;
  is_verified: boolean;
};
type Topic = { id: string; name: string };
type ResponseRecord = {
  id: string;
  survey_id: string;
  submitted_at: string;
  rating: number | null;
  csat: number | null;
  nps: number | null;
  channel: string;
  answers: {
    question_code: string;
    question_type: string;
    title: Record<string, string>;
    value: unknown;
  }[];
};
type ResponseDetailData = {
  id: string;
  survey_title: string;
  submitted_at: string;
  status: string;
  channel: string;
  language: string;
  rating: number | null;
  csat: number | null;
  nps: number | null;
  score: number | null;
  duration_seconds: number | null;
  respondent: Record<string, unknown>;
  source_params: Record<string, unknown>;
  answers: {
    question_code: string;
    question_type: string;
    title: Record<string, string>;
    options: Choice[];
    value: unknown;
    sentiment: string | null;
    sentiment_score: number | null;
    is_urgent: boolean | null;
  }[];
};
type History = {
  id: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  reason: string;
  reverted_at: string | null;
  review_status: string;
};

export function FeedbackManager() {
  const t = useTranslations("feedbackManager");
  const tn = useTranslations("notifications");
  const { data: session } = useSession();
  const { workspace } = useCurrentWorkspace();
  const client = useQueryClient();
  const canEdit = useCan("label:edit");
  const canExport = useCan("data:export");
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [topic, setTopic] = useState("");
  const [surveyId, setSurveyId] = useState("");
  const [rating, setRating] = useState("");
  const [questionCode, setQuestionCode] = useState("");
  const [answerValue, setAnswerValue] = useState("");
  useEffect(() => {
    // Restore URL filters after hydration; the URL is external browser state.
    queueMicrotask(() => {
      const p = new URLSearchParams(window.location.search);
      setSearch(p.get("search") || "");
      setSentiment(p.get("sentiment") || "");
      setTopic(p.get("topic_id") || "");
      setSurveyId(p.get("survey_id") || "");
      setRating(p.get("rating") || "");
      setQuestionCode(p.get("answer_question_code") || "");
      setAnswerValue(p.get("answer_value") || "");
    });
  }, []);
  const [channel, setChannel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [sort, setSort] = useState("urgent");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const params = new URLSearchParams({
    workspace_id: workspace?.id || "",
    page: String(page),
    search,
    sort,
  });
  if (sentiment) params.set("sentiment", sentiment);
  if (surveyId) params.set("survey_id", surveyId);
  if (urgent) params.set("urgent", "true");
  if (topic) params.set("topic_id", topic);
  if (channel) params.set("channel", channel);
  if (start) params.set("start", new Date(`${start}T00:00:00`).toISOString());
  if (end) params.set("end", new Date(`${end}T00:00:00`).toISOString());
  const query = useQuery({
    queryKey: ["feedback", workspace?.id, params.toString()],
    enabled: !!workspace,
    queryFn: () => api<Page<Feedback>>(`/responses?${params}`),
  });
  const topics = useQuery({
    queryKey: ["topics", workspace?.id],
    enabled: !!workspace,
    queryFn: () => api<{ topics: Topic[] }>(`/workspaces/${workspace!.id}/topics`),
  });
  const surveys = useQuery({
    queryKey: ["feedback-surveys", workspace?.id],
    enabled: !!workspace,
    queryFn: () => api<Page<Survey>>(`/surveys?workspace_id=${workspace!.id}&page_size=100`),
  });
  const selectedSurvey = useQuery({
    queryKey: ["feedback-survey", surveyId],
    enabled: !!surveyId,
    queryFn: () => api<Survey>(`/surveys/${surveyId}`),
  });
  const answerQuestions = (selectedSurvey.data?.questions || []).filter((q) =>
    ["rating", "csat", "nps", "single_choice", "multi_choice", "picture_choice"].includes(q.type),
  );
  const selectedQuestion = answerQuestions.find((q) => q.code === questionCode);
  const answerOptions = selectedQuestion
    ? ["rating", "csat"].includes(selectedQuestion.type)
      ? [1, 2, 3, 4, 5].map((value) => ({
          value: String(value),
          label: `${"★".repeat(value)} ${value}`,
        }))
      : selectedQuestion.type === "nps"
        ? Array.from({ length: 11 }, (_, value) => ({ value: String(value), label: String(value) }))
        : selectedQuestion.options.map((option) => ({
            value: option.value,
            label: option.label.vi || option.label.en || option.value,
          }))
    : [];
  const showResponseRecords = !!rating || (!!questionCode && !!answerValue);
  const recordParams = new URLSearchParams({
    workspace_id: workspace?.id || "",
    page: String(page),
  });
  if (surveyId) recordParams.set("survey_id", surveyId);
  if (rating) recordParams.set("rating", rating);
  if (questionCode && answerValue) {
    recordParams.set("answer_question_code", questionCode);
    recordParams.set("answer_value", answerValue);
  }
  const responseRecords = useQuery({
    queryKey: ["response-records", workspace?.id, recordParams.toString()],
    enabled: !!workspace && showResponseRecords,
    queryFn: () => api<Page<ResponseRecord>>(`/responses/records?${recordParams}`),
  });
  const quality = useQuery({
    queryKey: ["quality", workspace?.id],
    enabled: !!workspace,
    queryFn: () =>
      api<{ total: number; verified: number; corrected: number; correction_rate: number | null }>(
        `/model-quality?workspace_id=${workspace!.id}`,
      ),
  });
  useEffect(() => {
    if (!selected) return;
    const move = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select,[contenteditable]")) return;
      const items = query.data?.items || [];
      const index = items.findIndex((r) => r.id === selected);
      if (e.key === "n") {
        const next = items[index + 1];
        if (next) {
          setSelected(next.id);
          setSelectedResponseId(next.response_id);
        }
      }
      if (e.key === "p") {
        const previous = items[index - 1];
        if (previous) {
          setSelected(previous.id);
          setSelectedResponseId(previous.response_id);
        }
      }
    };
    window.addEventListener("keydown", move);
    return () => window.removeEventListener("keydown", move);
  }, [selected, query.data]);
  async function bulk() {
    try {
      await api("/responses/bulk-corrections", {
        method: "POST",
        body: { ids: checked, correction: { is_urgent: false, reason: t("bulkReason") } },
      });
      setChecked([]);
      await client.invalidateQueries({ queryKey: ["feedback"] });
      toast.success(tn("bulkUpdated"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const hasFilters = Boolean(
    search ||
    sentiment ||
    urgent ||
    topic ||
    surveyId ||
    rating ||
    questionCode ||
    answerValue ||
    channel ||
    start ||
    end,
  );
  function clearFilters() {
    setSearch("");
    setSentiment("");
    setUrgent(false);
    setTopic("");
    setSurveyId("");
    setRating("");
    setQuestionCode("");
    setAnswerValue("");
    setChannel("");
    setStart("");
    setEnd("");
    setPage(1);
    setChecked([]);
  }
  const activeTotal = showResponseRecords ? responseRecords.data?.total : query.data?.total;
  const controlClass =
    "h-11 w-full rounded-xl border border-border/80 bg-background px-3 text-sm shadow-sm transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/10 bg-card px-4 py-3 shadow-soft">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <MessageSquareText className="size-4.5" />
            </span>
            <span>
              <strong className="block text-lg leading-5 tabular-nums">{activeTotal ?? "—"}</strong>
              <span className="text-xs text-muted-foreground">{t("responseCountLabel")}</span>
            </span>
          </div>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]">
        <aside aria-label={t("filtersHeading")}>
          <section className="overflow-hidden rounded-3xl border border-primary/10 bg-card shadow-soft">
            <div className="flex flex-col items-start gap-4 border-b border-border/70 bg-gradient-to-r from-primary-soft/70 via-card to-card px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <SlidersHorizontal className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold tracking-tight">{t("filtersHeading")}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t("filtersDescription")}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasFilters}
                onClick={clearFilters}
                className="self-start rounded-xl"
              >
                <RotateCcw className="size-4" />
                {t("clearFilters")}
              </Button>
            </div>

            <div className="grid gap-x-4 gap-y-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-1">
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("search")}</span>
                <span className="relative block">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    className="h-11 rounded-xl pl-9"
                    placeholder={t("search")}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </span>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("surveyFilter")}</span>
                <select
                  aria-label={t("surveyFilter")}
                  className={controlClass}
                  value={surveyId}
                  onChange={(e) => {
                    setSurveyId(e.target.value);
                    setQuestionCode("");
                    setAnswerValue("");
                    setPage(1);
                  }}
                >
                  <option value="">{t("allSurveys")}</option>
                  {surveys.data?.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("ratingFilter")}</span>
                <select
                  aria-label={t("ratingFilter")}
                  className={controlClass}
                  value={rating}
                  onChange={(e) => {
                    setRating(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("allRatings")}</option>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {"★".repeat(value)} ({value})
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("answerQuestion")}</span>
                <select
                  aria-label={t("answerQuestion")}
                  className={controlClass}
                  value={questionCode}
                  disabled={!surveyId || selectedSurvey.isLoading}
                  onChange={(e) => {
                    setQuestionCode(e.target.value);
                    setAnswerValue("");
                    setPage(1);
                  }}
                >
                  <option value="">{t("chooseQuestion")}</option>
                  {answerQuestions.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.title.vi || item.title.en || item.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("answerValue")}</span>
                <select
                  aria-label={t("answerValue")}
                  className={controlClass}
                  value={answerValue}
                  disabled={!selectedQuestion}
                  onChange={(e) => {
                    setAnswerValue(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("chooseAnswer")}</option>
                  {answerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("sentiment")}</span>
                <select
                  aria-label={t("sentiment")}
                  className={controlClass}
                  value={sentiment}
                  onChange={(e) => {
                    setSentiment(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("allSentiments")}</option>
                  {["positive", "negative", "neutral"].map((s) => (
                    <option value={s} key={s}>
                      {t(`sentiments.${s}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("topics")}</span>
                <select
                  aria-label={t("topics")}
                  className={controlClass}
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("allTopics")}</option>
                  {topics.data?.topics.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("channel")}</span>
                <select
                  aria-label={t("channel")}
                  className={controlClass}
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("allChannels")}</option>
                  {["link", "qr", "email", "embed", "kiosk", "import"].map((c) => (
                    <option value={c} key={c}>
                      {t(`channels.${c}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("sort")}</span>
                <select
                  aria-label={t("sort")}
                  className={controlClass}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {["urgent", "newest", "oldest", "confidence"].map((s) => (
                    <option value={s} key={s}>
                      {t(`sorts.${s}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("start")}</span>
                <span className="relative block">
                  <CalendarDays className="absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    className="h-11 rounded-xl pl-9"
                    aria-label={t("start")}
                    type="date"
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value);
                      setPage(1);
                    }}
                  />
                </span>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>{t("end")}</span>
                <span className="relative block">
                  <CalendarDays className="absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    className="h-11 rounded-xl pl-9"
                    aria-label={t("end")}
                    type="date"
                    value={end}
                    onChange={(e) => {
                      setEnd(e.target.value);
                      setPage(1);
                    }}
                  />
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-xl border border-border/80 bg-background px-3 text-sm transition hover:border-primary/30">
                <input
                  className="size-4 accent-primary"
                  type="checkbox"
                  checked={urgent}
                  onChange={(e) => {
                    setUrgent(e.target.checked);
                    setPage(1);
                  }}
                />
                <span className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-urgent-ink" />
                  {t("urgentOnly")}
                </span>
              </label>
            </div>
          </section>
        </aside>

        <div className="min-w-0 space-y-6">
          {(error || query.error) && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error || query.error?.message}
            </p>
          )}
          <section className="overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-soft">
            <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Filter className="size-4.5" />
                </span>
                <div>
                  <h2 className="font-semibold">
                    {showResponseRecords ? t("answerMatches") : t("title")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {activeTotal === undefined
                      ? t("loading")
                      : t("responseCount", { count: activeTotal })}
                  </p>
                </div>
              </div>
              {!showResponseRecords && !!checked.length && canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void bulk();
                  }}
                  className="rounded-xl"
                >
                  {t("bulkClear", { count: checked.length })}
                </Button>
              )}
              {showResponseRecords && (
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary">
                  <Star className="size-3.5 fill-current" />
                  {rating ? `${rating}/5` : t("answerValue")}
                </span>
              )}
            </div>
            {showResponseRecords ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <caption className="sr-only">{t("answerMatches")}</caption>
                  <thead className="bg-muted/45 text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      {["responseId", "answerValue", "rating", "channel", "time"].map((key) => (
                        <th className="px-5 py-3 text-left font-semibold" key={key}>
                          {t(key as Parameters<typeof t>[0])}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {responseRecords.data?.items.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          setSelected(null);
                          setSelectedResponseId(row.id);
                        }}
                        className="cursor-pointer transition hover:bg-primary/[.04]"
                      >
                        <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                          <button
                            className="underline decoration-primary/30 underline-offset-4 hover:text-primary"
                            aria-label={`${t("detail")} ${row.id.slice(0, 8)}`}
                          >
                            {row.id.slice(0, 8)}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          {row.answers.map((answer) => {
                            const title =
                              answer.title.vi || answer.title.en || answer.question_code;
                            const value = Array.isArray(answer.value)
                              ? answer.value.join(", ")
                              : String(answer.value ?? "—");
                            return (
                              <div key={answer.question_code}>
                                <span className="text-muted-foreground">{title}: </span>
                                <span className="font-medium">{value}</span>
                              </div>
                            );
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-700">
                            <Star className="size-3.5 fill-current" />
                            {row.rating ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {t(`channels.${row.channel}` as Parameters<typeof t>[0])}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                          {new Date(row.submitted_at).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {responseRecords.isLoading && (
                  <p role="status" className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {t("loading")}
                  </p>
                )}
                {responseRecords.error && (
                  <p role="alert" className="px-5 py-10 text-center text-sm text-destructive">
                    {responseRecords.error.message}
                  </p>
                )}
                {responseRecords.data?.total === 0 && (
                  <div className="px-5 py-12 text-center">
                    <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                      <MessageSquareText className="size-5" />
                    </span>
                    <p className="mt-3 font-medium">{t("empty")}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-sm">
                  <caption className="sr-only">{t("title")}</caption>
                  <thead className="bg-muted/45 text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      {["select", "text", "rating", "sentiment", "topics", "channel", "time"].map(
                        (key) => (
                          <th
                            className="px-4 py-3 text-left font-semibold first:pl-5 last:pr-5"
                            key={key}
                          >
                            {t(key as Parameters<typeof t>[0])}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {query.data?.items.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition hover:bg-primary/[.025] ${row.is_urgent ? "bg-urgent-soft/35" : ""}`}
                      >
                        <td className="px-4 py-4 pl-5">
                          <input
                            type="checkbox"
                            aria-label={t("selectRow")}
                            className="size-4 accent-primary"
                            checked={checked.includes(row.id)}
                            onChange={(e) =>
                              setChecked(
                                e.target.checked
                                  ? [...checked, row.id]
                                  : checked.filter((id) => id !== row.id),
                              )
                            }
                          />
                        </td>
                        <td className="max-w-md px-4 py-4">
                          <button
                            className="line-clamp-2 text-left leading-6 font-medium decoration-primary/40 underline-offset-4 hover:text-primary hover:underline"
                            onClick={() => {
                              setSelected(row.id);
                              setSelectedResponseId(row.response_id);
                            }}
                          >
                            {row.is_urgent && <span className="mr-1 text-urgent-ink">⚠</span>}
                            {row.text}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-700">
                            <Star className="size-3.5 fill-current" />
                            {row.rating ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.sentiment === "positive" ? "bg-positive-soft text-positive-ink" : row.sentiment === "negative" ? "bg-negative-soft text-negative-ink" : "bg-muted text-muted-foreground"}`}
                          >
                            {row.sentiment
                              ? t(`sentiments.${row.sentiment}` as Parameters<typeof t>[0])
                              : t("pending")}
                            {row.sentiment_score !== null && (
                              <span className="ml-1 opacity-70">
                                {Math.round(row.sentiment_score * 100)}%
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex max-w-48 flex-wrap gap-1">
                            {row.topic_ids
                              .map((id) => topics.data?.topics.find((q) => q.id === id)?.name)
                              .filter((name): name is string => Boolean(name))
                              .map((name) => (
                                <span
                                  key={name}
                                  className="rounded-md bg-primary-soft/70 px-2 py-0.5 text-xs text-primary"
                                >
                                  {name}
                                </span>
                              ))}
                            {!row.topic_ids.length && (
                              <span className="text-xs text-muted-foreground">
                                {t("unclassified")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {t(`channels.${row.channel}` as Parameters<typeof t>[0])}
                        </td>
                        <td className="px-4 py-4 pr-5 whitespace-nowrap text-muted-foreground">
                          {new Date(row.responded_at).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {query.isLoading && (
                  <p role="status" className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {t("loading")}
                  </p>
                )}
                {query.data?.total === 0 && (
                  <div className="px-5 py-12 text-center">
                    <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                      <MessageSquareText className="size-5" />
                    </span>
                    <p className="mt-3 font-medium">{t("empty")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3 border-t border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-muted-foreground">
                {t("pageSummary", { page, pages: Math.max(1, Math.ceil((activeTotal || 0) / 20)) })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page === 1}
                  onClick={() => {
                    setPage(page - 1);
                    setChecked([]);
                  }}
                >
                  <ChevronLeft className="size-4" />
                  {t("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={activeTotal === undefined || page * 20 >= activeTotal}
                  onClick={() => {
                    setPage(page + 1);
                    setChecked([]);
                  }}
                >
                  {t("next")}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
      {session && workspace && (
        <SavedFilters
          key={`${session.tenant.id}:${workspace.id}`}
          scope={`${session.user.id}:${session.tenant.id}:${workspace.id}`}
          values={{
            search,
            sentiment,
            urgent: String(urgent),
            topic,
            channel,
            start,
            end,
            sort,
            survey_id: surveyId,
            rating,
            answer_question_code: questionCode,
            answer_value: answerValue,
          }}
          apply={(value) => {
            setSearch(value.search || "");
            setSentiment(value.sentiment || "");
            setUrgent(value.urgent === "true");
            setTopic(value.topic || "");
            setChannel(value.channel || "");
            setStart(value.start || "");
            setEnd(value.end || "");
            setSort(value.sort || "urgent");
            setSurveyId(value.survey_id || "");
            setRating(value.rating || "");
            setQuestionCode(value.answer_question_code || "");
            setAnswerValue(value.answer_value || "");
            setPage(1);
            setChecked([]);
          }}
        />
      )}
      <section className="flex flex-col gap-4 rounded-2xl border border-primary/10 bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">{t("quality")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("qualityNote")}
            </p>
          </div>
        </div>
        {quality.data && (
          <p className="shrink-0 rounded-xl bg-muted/60 px-4 py-2 text-sm">
            {t("qualityCounts", {
              total: quality.data.total,
              verified: quality.data.verified,
              corrected: quality.data.corrected,
            })}
          </p>
        )}
        {canExport && workspace && (
          <div className="flex shrink-0 gap-2">
            {["csv", "jsonl"].map((format) => (
              <a
                key={format}
                className="underline"
                href={apiUrl(
                  `/model-quality/dataset?workspace_id=${workspace.id}&format=${format}`,
                )}
              >
                {t("dataset", { format: format.toUpperCase() })}
              </a>
            ))}
          </div>
        )}
      </section>
      <Sheet
        open={!!selectedResponseId}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setSelectedResponseId(null);
          }
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t("detail")}</SheetTitle>
          </SheetHeader>
          {selectedResponseId && (
            <ResponseDetail
              key={selectedResponseId}
              id={selectedResponseId}
              analysisId={selected || undefined}
              topics={topics.data?.topics || []}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ResponseDetail({
  id,
  analysisId,
  topics,
}: {
  id: string;
  analysisId?: string;
  topics: Topic[];
}) {
  const t = useTranslations("feedbackManager");
  const query = useQuery({
    queryKey: ["response-record-detail", id],
    queryFn: () => api<ResponseDetailData>(`/responses/records/${id}`),
  });
  if (query.error)
    return (
      <p role="alert" className="px-5 text-sm text-destructive">
        {query.error.message}
      </p>
    );
  if (!query.data)
    return (
      <p role="status" className="px-5 text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );

  const response = query.data;
  const formatValue = (value: unknown, options: Choice[]) => {
    const values = Array.isArray(value) ? value : [value];
    const labels = values.map((item) => {
      const option = options.find((candidate) => candidate.value === String(item));
      if (option) return option.label.vi || option.label.en || option.value;
      return typeof item === "object" && item !== null
        ? JSON.stringify(item, null, 2)
        : String(item ?? "—");
    });
    return labels.join(", ");
  };
  const metadata = [
    [t("submittedAt"), new Date(response.submitted_at).toLocaleString("vi-VN")],
    [t("responseStatus"), response.status],
    [t("channel"), t(`channels.${response.channel}` as Parameters<typeof t>[0])],
    [t("language"), response.language.toUpperCase()],
    ...(response.duration_seconds !== null
      ? [[t("duration"), `${response.duration_seconds}s`]]
      : []),
  ];
  const respondent = Object.entries(response.respondent || {}).filter(
    ([, value]) => value !== null && value !== "",
  );
  const source = Object.entries(response.source_params || {}).filter(
    ([, value]) => value !== null && value !== "",
  );

  return (
    <div className="space-y-6 px-5 pb-6">
      <header className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary-soft/70 to-card p-4">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          {t("surveyResponse")}
        </p>
        <h3 className="mt-1 text-lg leading-snug font-bold">{response.survey_title}</h3>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">ID: {response.id}</p>
      </header>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metadata.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted/55 p-3">
            <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-semibold">{value}</dd>
          </div>
        ))}
        {[
          [t("rating"), response.rating],
          [t("csat"), response.csat],
          [t("nps"), response.nps],
        ]
          .filter(([, value]) => value !== null)
          .map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-3"
            >
              <dt className="text-[11px] font-medium text-amber-800/70">{label}</dt>
              <dd className="mt-1 flex items-center gap-1 text-sm font-bold text-amber-800">
                <Star className="size-3.5 fill-current" />
                {value}
              </dd>
            </div>
          ))}
      </dl>

      {respondent.length > 0 && (
        <section className="rounded-2xl border p-4">
          <h3 className="text-sm font-semibold">{t("respondent")}</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {respondent.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{key}</dt>
                <dd className="mt-0.5 text-sm font-medium break-words">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {source.length > 0 && (
        <section className="rounded-2xl border p-4">
          <h3 className="text-sm font-semibold">{t("responseSource")}</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {source.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{key}</dt>
                <dd className="mt-0.5 text-sm font-medium">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("questionAnswers")}</h3>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {response.answers.length}
          </span>
        </div>
        {response.answers.length === 0 ? (
          <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            {t("noAnswers")}
          </p>
        ) : (
          <ol className="space-y-3">
            {response.answers.map((answer, index) => (
              <li
                key={answer.question_code}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 font-semibold">
                      {answer.title.vi || answer.title.en || answer.question_code}
                    </p>
                    <p className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap">
                      {formatValue(answer.value, answer.options)}
                    </p>
                    {(answer.sentiment || answer.is_urgent) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {answer.sentiment && (
                          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                            {t(`sentiments.${answer.sentiment}` as Parameters<typeof t>[0])}
                            {answer.sentiment_score !== null &&
                              ` · ${Math.round(answer.sentiment_score * 100)}%`}
                          </span>
                        )}
                        {answer.is_urgent && (
                          <span className="rounded-full bg-urgent-soft px-2.5 py-1 text-xs font-semibold text-urgent-ink">
                            {t("urgent")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {analysisId && (
        <section className="border-t pt-5">
          <h3 className="mb-3 text-sm font-semibold">{t("labelReview")}</h3>
          <FeedbackDetail id={analysisId} topics={topics} />
        </section>
      )}
    </div>
  );
}

function FeedbackDetail({ id, topics }: { id: string; topics: Topic[] }) {
  const t = useTranslations("feedbackManager");
  const query = useQuery({
    queryKey: ["feedback-detail", id],
    queryFn: () => api<Feedback>(`/responses/${id}`),
  });
  if (query.error) return <p role="alert">{query.error.message}</p>;
  if (!query.data) return <p role="status">{t("loading")}</p>;
  return <CorrectionForm key={query.data.updated_at} row={query.data} topics={topics} />;
}

function CorrectionForm({ row, topics }: { row: Feedback; topics: Topic[] }) {
  const t = useTranslations("feedbackManager");
  const tn = useTranslations("notifications");
  const client = useQueryClient();
  const canEdit = useCan("label:edit");
  const canApprove = useCan("label:approve");
  const [sentiment, setSentiment] = useState(row.sentiment || "neutral");
  const [selectedTopics, setSelectedTopics] = useState(row.topic_ids);
  const [urgent, setUrgent] = useState(row.is_urgent);
  const [note, setNote] = useState(row.note || "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useQuery({
    queryKey: ["history", row.id],
    queryFn: () => api<History[]>(`/analyses/${row.id}/corrections`),
  });
  async function perform(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "POST", body });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["feedback"] }),
        client.invalidateQueries({ queryKey: ["feedback-detail", row.id] }),
        client.invalidateQueries({ queryKey: ["history", row.id] }),
        client.invalidateQueries({ queryKey: ["quality"] }),
      ]);
      toast.success(tn("correctionSaved"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4 px-5 pb-5">
      <p className="whitespace-pre-wrap">{row.text}</p>
      <p>{row.urgent_reasons.join(", ")}</p>
      <p>{t("shortcuts")}</p>
      <fieldset disabled={!canEdit || busy} className="space-y-4">
        <label className="block">
          {t("sentiment")}
          <select
            className="block w-full rounded-lg border p-2"
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
          >
            {["positive", "negative", "neutral"].map((s) => (
              <option key={s} value={s}>
                {t(`sentiments.${s}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
        </label>
        <div>
          {topics.map((topic) => (
            <label className="flex gap-2" key={topic.id}>
              <input
                type="checkbox"
                checked={selectedTopics.includes(topic.id)}
                onChange={(e) =>
                  setSelectedTopics(
                    e.target.checked
                      ? [...selectedTopics, topic.id]
                      : selectedTopics.filter((id) => id !== topic.id),
                  )
                }
              />
              {topic.name}
            </label>
          ))}
        </div>
        <label className="flex gap-2">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          {t("urgent")}
        </label>
        <label className="block">
          {t("note")}
          <textarea
            className="w-full rounded-lg border p-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <label className="block">
          {t("reason")}
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <Button
          onClick={() => {
            void perform(`/analyses/${row.id}/corrections`, {
              sentiment,
              topic_ids: selectedTopics,
              is_urgent: urgent,
              note,
              reason,
              expected_updated_at: row.updated_at,
            });
          }}
        >
          {t("save")}
        </Button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <h3 className="font-semibold">{t("history")}</h3>
      {history.data?.map((h) => (
        <div key={h.id} className="space-y-2 rounded-lg border p-3">
          <p>
            {t(`fields.${h.field}` as Parameters<typeof t>[0])}: {JSON.stringify(h.old_value)} →{" "}
            {JSON.stringify(h.new_value)}
          </p>
          <p>{h.reason}</p>
          {!h.reverted_at && canEdit && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                void perform(`/corrections/${h.id}/undo`);
              }}
            >
              {t("undo")}
            </Button>
          )}
          {h.review_status === "pending" && canApprove && (
            <Button
              disabled={busy}
              onClick={() => {
                void perform(`/corrections/${h.id}/review?approved=true`);
              }}
            >
              {t("approve")}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
