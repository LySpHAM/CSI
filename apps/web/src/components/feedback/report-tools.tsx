"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarClock, Download, Mail, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { useCan } from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";

export function ReportTools({ workspaceId, filter }: { workspaceId: string; filter: string }) {
  const t = useTranslations("engagement"),
    tn = useTranslations("notifications"),
    client = useQueryClient();
  const canExport = useCan("data:export");
  const [row, setRow] = useState("channel"),
    [column, setColumn] = useState("sentiment"),
    [value, setValue] = useState("count");
  const [emails, setEmails] = useState("");
  const [cadence, setCadence] = useState("week");
  const [error, setError] = useState("");
  const pivot = useQuery({
    queryKey: ["pivot", filter, row, column, value],
    queryFn: () =>
      api<{ row: string; column: string; value: number | null }[]>(
        `/analytics/pivot?${filter}&row=${row}&column=${column}&value=${value}`,
      ),
  });
  const questions = useQuery({
    queryKey: ["per-question", filter],
    queryFn: () =>
      api<
        {
          survey_id: string;
          code: string;
          title: Record<string, string>;
          type: string;
          answered: number;
          average?: number;
          nps?: number;
          distribution?: { value: unknown; count: number }[];
        }[]
      >(`/analytics/per-question?${filter}`),
  });
  const schedules = useQuery({
    queryKey: ["schedules", workspaceId],
    enabled: canExport,
    queryFn: () =>
      api<{ id: string; recipients: string[]; cadence: string; enabled: boolean }[]>(
        `/report-schedules?workspace_id=${workspaceId}`,
      ),
  });
  const pivotRows = [...new Set((pivot.data || []).map((cell) => cell.row))];
  const pivotColumns = [...new Set((pivot.data || []).map((cell) => cell.column))];
  const pivotValues = new Map<string, number | null>(
    (pivot.data || []).map((cell) => [`${cell.row}\u0000${cell.column}`, cell.value] as const),
  );
  const isCount = value === "count";
  const totalForRow = (row: string) =>
    pivotColumns.reduce((sum, column) => sum + (pivotValues.get(`${row}\u0000${column}`) || 0), 0);
  const totalForColumn = (column: string) =>
    pivotRows.reduce((sum, row) => sum + (pivotValues.get(`${row}\u0000${column}`) || 0), 0);
  async function schedule() {
    try {
      await api("/report-schedules", {
        method: "POST",
        body: {
          workspace_id: workspaceId,
          recipients: emails.split(/[\s,;]+/).filter(Boolean),
          cadence,
          next_run_at: new Date(Date.now() + 60000).toISOString(),
          filters: Object.fromEntries(new URLSearchParams(filter)),
        },
      });
      await client.invalidateQueries({ queryKey: ["schedules"] });
      toast.success(tn("scheduleCreated"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t("perQuestion")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("perQuestionDescription")}</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{questions.data?.length || 0} {t("questionsCount")}</span>
        </div>
        <div className="space-y-2">
          {questions.data?.map((q, index) => {
            const distribution = q.distribution || [];
            const total = distribution.reduce((sum, item) => sum + item.count, 0);
            const max = Math.max(1, ...distribution.map((item) => item.count));
            return (
              <details key={`${q.survey_id}:${q.code}`} className="group rounded-xl border border-border/70 bg-background">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-semibold text-primary">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{q.title.vi}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{t("answered", { count: q.answered })}{q.average != null && ` · ${t("average")}: ${q.average.toFixed(2)}`}{q.nps != null && ` · NPS: ${q.nps.toFixed(1)}`}</span>
                  </span>
                  {q.average != null && <span className="hidden shrink-0 text-amber-500 sm:flex" aria-label={`${q.average.toFixed(2)} / 5`}>{Array.from({ length: 5 }, (_, i) => <span key={i}>{q.average! >= i + 1 ? "★" : "☆"}</span>)}</span>}
                  <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
                </summary>
                {distribution.length > 0 && <div className="space-y-2 border-t border-border/70 px-4 py-4">{distribution.map((item, i) => <div key={i} className="grid grid-cols-[3rem_minmax(0,1fr)_3rem_3rem] items-center gap-3 text-xs"><span className="text-muted-foreground">{String(item.value)}</span><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(item.count / max) * 100}%` }} /></div><span className="text-right tabular-nums">{Math.round((item.count / Math.max(1, total)) * 100)}%</span><span className="text-right text-muted-foreground tabular-nums">{item.count}</span></div>)}</div>}
              </details>
            );
          })}
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t("pivot")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("pivotDescription")}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => {
            const rows = [
              [t(`dimensions.${row}` as Parameters<typeof t>[0]), ...pivotColumns, t("grandTotal")],
              ...pivotRows.map((pivotRow) => [pivotRow, ...pivotColumns.map((heading) => String(pivotValues.get(`${pivotRow}\u0000${heading}`) ?? "")), isCount ? String(totalForRow(pivotRow)) : ""]),
            ];
            const csv = rows.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
            const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "analytics-pivot.csv";
            link.click();
            URL.revokeObjectURL(url);
          }}><Download className="size-4" aria-hidden />{t("downloadPivot")}</Button>
        </div>
        <div className="grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-3">
          {[
            [row, setRow, "row"],
            [column, setColumn, "column"],
          ].map(([selected, setter, label]) => (
            <label key={String(label)} className="text-xs font-medium">
              {t(String(label) as Parameters<typeof t>[0])}
              <select
                className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={String(selected)}
                onChange={(e) => (setter as (v: string) => void)(e.target.value)}
              >
                {["channel", "survey", "branch", "sentiment"].map((d) => (
                  <option key={d} value={d}>
                    {t(`dimensions.${d}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="text-xs font-medium">
            {t("value")}
            <select
              className="mt-1 block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            >
              {["count", "rating", "csat"].map((d) => (
                <option key={d} value={d}>
                  {t(`values.${d}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[38rem] text-sm">
            <thead className="bg-muted/70">
              <tr>
                <th className="p-3 text-left font-semibold">{t(`dimensions.${row}` as Parameters<typeof t>[0])}</th>
                {pivotColumns.map((heading) => <th key={heading} className="p-3 text-right font-semibold">{heading}</th>)}
                <th className="bg-muted p-3 text-right font-semibold">{t("grandTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {pivotRows.map((pivotRow) => (
                <tr key={pivotRow} className="border-t border-border/60 even:bg-muted/20">
                  <td className="p-3 font-medium">{pivotRow}</td>
                  {pivotColumns.map((heading) => {
                    const cell = pivotValues.get(`${pivotRow}\u0000${heading}`);
                    return <td key={heading} className="p-3 text-right tabular-nums">{cell == null ? <span className="text-muted-foreground">–</span> : isCount ? cell.toLocaleString() : cell.toFixed(2)}</td>;
                  })}
                  <td className="bg-muted/30 p-3 text-right font-semibold tabular-nums">{isCount ? totalForRow(pivotRow).toLocaleString() : "–"}</td>
                </tr>
              ))}
            </tbody>
            {pivotRows.length > 0 && <tfoot className="border-t-2 border-border bg-muted/70 font-semibold"><tr><th className="p-3 text-left">{t("grandTotal")}</th>{pivotColumns.map((heading) => <td key={heading} className="p-3 text-right tabular-nums">{isCount ? totalForColumn(heading).toLocaleString() : "–"}</td>)}<td className="p-3 text-right text-primary tabular-nums">{isCount ? pivotRows.reduce((sum, pivotRow) => sum + totalForRow(pivotRow), 0).toLocaleString() : "–"}</td></tr></tfoot>}
          </table>
        </div>
      </section>
      {canExport && (
        <section id="report-schedule" className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="border-b border-border/70 pb-4">
            <h2 className="flex items-center gap-3 text-lg font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary"><CalendarClock className="size-5" aria-hidden /></span>{t("schedule")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("scheduleDescription")}</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(17rem,0.85fr)_minmax(0,1.3fr)]">
          <div className="space-y-4 rounded-xl border border-border/70 bg-background p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide">{t("newSchedule")}</h3>
          <label className="block space-y-1.5 text-xs font-medium">
            {t("emails")}
            <textarea
              className="block min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
          </label>
          <select
            aria-label={t("cadence")}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
          >
            {["day", "week", "month"].map((c) => (
              <option key={c} value={c}>
                {t(`cadences.${c}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </select>
          <Button
            className="w-full gap-2 rounded-lg"
            onClick={() => {
              void schedule();
            }}
          >
            <Plus className="size-4" aria-hidden />
            {t("createSchedule")}
          </Button>
          {error && <p role="alert">{error}</p>}
          </div>
          <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide">{t("activeSchedules", { count: schedules.data?.filter((s) => s.enabled).length || 0 })}</h3>
          {schedules.data
            ?.filter((s) => s.enabled)
            .map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 p-4">
                <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                <div className="min-w-0 flex-1"><p className="font-medium">{t(`cadences.${s.cadence}` as Parameters<typeof t>[0])}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="size-3.5" aria-hidden />{s.recipients.join(", ")}</p></div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("stopSchedule")}
                  title={t("stopSchedule")}
                  onClick={async () => {
                    try {
                      await api(`/report-schedules/${s.id}`, { method: "DELETE" });
                      await client.invalidateQueries({ queryKey: ["schedules"] });
                      toast.success(tn("scheduleDeleted"));
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          {schedules.data?.every((s) => !s.enabled) && <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{t("noActiveSchedules")}</p>}
          </div>
          </div>
        </section>
      )}
    </div>
  );
}
