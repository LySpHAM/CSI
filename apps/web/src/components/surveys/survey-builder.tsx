"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, apiUrl } from "@/lib/api/client";
import { createUuid } from "@/lib/uuid";
import { useCan, useCurrentWorkspace } from "@/lib/api/hooks";
import type { Question, Survey } from "@/lib/api/surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionControl } from "./question-control";
import { ImportPanel } from "./import-panel";
import { AdvancedSettings, LogicEditor } from "./logic-editor";
import { surveyPath } from "@/lib/survey-logic";
import { DistributionPanel } from "./distribution-panel";
import { TemplateLibrary } from "./template-library";
import { ArrowDown, ArrowUp, Circle, ContactRound, Grid2X2, Hash, Image, ListChecks, MessageSquare, Plus, Smile, SlidersHorizontal, Star, Upload } from "lucide-react";

const questionTypes = [
  ["rating", Star], ["csat", Smile], ["text", MessageSquare], ["single_choice", Circle],
  ["multi_choice", ListChecks], ["nps", Hash], ["picture_choice", Image], ["slider", SlidersHorizontal],
  ["ranking", ArrowDown], ["contact", ContactRound], ["upload", Upload], ["matrix", Grid2X2], ["datetime", Circle],
] as const;

function QuestionEditor({
  question: q,
  questions,
  onChange,
  onRemove,
}: {
  question: Question;
  questions: Question[];
  onChange: (q: Question) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("engine");
  const { setNodeRef, transform, transition, attributes, listeners } = useSortable({ id: q.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm [&_details]:border-slate-200 [&_input]:border-slate-300 [&_input]:bg-white [&_input]:text-slate-900 [&_select]:border-slate-300 [&_textarea]:border-slate-300 [&_textarea]:bg-white [&_textarea]:text-slate-900"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t("drag")}
          {...attributes}
          {...listeners}
          className="touch-none rounded-lg border px-3 py-2"
        >
          ⠿
        </button>
        <span>{t(`types.${q.type}`)}</span>
        <Button type="button" variant="outline" onClick={onRemove}>
          {t("remove")}
        </Button>
      </div>
      <label className="block space-y-1">
        <span>{t("questionTitle")}</span>
        <Input
          value={q.title.vi}
          onChange={(e) => onChange({ ...q, title: { ...q.title, vi: e.target.value } })}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={q.required}
          onChange={(e) => onChange({ ...q, required: e.target.checked })}
        />
        {t("required")}
      </label>
      <label className="block">
        {t("englishTitle")}
        <Input
          value={q.title.en || ""}
          onChange={(e) => onChange({ ...q, title: { ...q.title, en: e.target.value } })}
        />
      </label>
      <details className="rounded-lg border p-3">
        <summary>{t("quizQuestion")}</summary>
        <label className="block">
          {t("points")}
          <Input
            type="number"
            min={0}
            max={1000}
            value={q.points || 0}
            onChange={(e) => onChange({ ...q, points: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          {t("correctAnswer")}
          <Input
            value={
              typeof q.config.correct_answer === "string"
                ? q.config.correct_answer
                : JSON.stringify(q.config.correct_answer ?? "")
            }
            onChange={(e) => {
              let value: unknown = e.target.value;
              try {
                value = JSON.parse(e.target.value);
              } catch {}
              onChange({ ...q, config: { ...q.config, correct_answer: value } });
            }}
          />
        </label>
      </details>
      <LogicEditor question={q} questions={questions} onChange={onChange} />
      {q.type === "matrix" &&
        (["rows", "columns"] as const).map((key) => (
          <label key={key} className="block">
            {t(`matrixLabels.${key}`)}
            <textarea
              className="w-full rounded-lg border p-2"
              value={((q.config[key] as string[]) || []).join("\n")}
              onChange={(e) =>
                onChange({ ...q, config: { ...q.config, [key]: e.target.value.split("\n") } })
              }
            />
          </label>
        ))}
      {q.type === "text" && (
        <label>
          {t("maxLength")}
          <Input
            type="number"
            min={1}
            max={10000}
            value={Number(q.config.max_length || 5000)}
            onChange={(e) =>
              onChange({ ...q, config: { ...q.config, max_length: Number(e.target.value) } })
            }
          />
        </label>
      )}
      {(["single_choice", "multi_choice", "picture_choice", "ranking"] as string[]).includes(
        q.type,
      ) && (
        <label className="block space-y-1">
          <span>{t("choices")}</span>
          <textarea
            className="w-full rounded-lg border p-2"
            rows={4}
            value={q.options.map((o) => o.label.vi).join("\n")}
            onChange={(e) =>
              onChange({
                ...q,
                options: e.target.value.split("\n").map((label, i) => ({
                  value: q.options[i]?.value || `option-${createUuid()}`,
                  label: { vi: label },
                })),
              })
            }
          />
        </label>
      )}
    </div>
  );
}

function RichQuestionEditor({ question: q, index, total, onChange, onRemove, onMove, onDuplicate }: {
  question: Question; index: number; total: number; onChange: (q: Question) => void;
  onRemove: () => void; onMove: (direction: -1 | 1) => void; onDuplicate: () => void;
}) {
  const t = useTranslations("engine");
  const choices = ["single_choice", "multi_choice", "picture_choice", "ranking"].includes(q.type);
  return <article id={`question-${q.id}`} tabIndex={-1} className="scroll-mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
      <div className="flex items-center gap-2"><span className="font-mono text-xs text-slate-400">{String(index + 1).padStart(2, "0")}</span><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{t(`types.${q.type}`)}</span>{q.required && <span className="text-xs font-semibold text-rose-600">* {t("required")}</span>}</div>
      <div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={t("moveUpQuestion")} className="rounded-md border border-slate-200 p-1.5 text-slate-600 disabled:opacity-30"><ArrowUp className="size-4" /></button><button type="button" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={t("moveDownQuestion")} className="rounded-md border border-slate-200 p-1.5 text-slate-600 disabled:opacity-30"><ArrowDown className="size-4" /></button></div>
    </header>
    <Input aria-label={t("questionTitle")} value={q.title.vi} onChange={e => onChange({ ...q, title: { ...q.title, vi: e.target.value } })} className="h-auto border-0 bg-transparent px-0 py-1 text-base font-semibold text-slate-900 shadow-none focus-visible:ring-0" />
    <Input aria-label={t("questionDescriptionPlaceholder")} placeholder={t("questionDescriptionPlaceholder")} value={q.description.vi || ""} onChange={e => onChange({ ...q, description: { ...q.description, vi: e.target.value } })} className="border-0 bg-transparent px-0 text-sm text-slate-500 shadow-none focus-visible:ring-0" />
    {q.type === "rating" && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex gap-2">{Array.from({ length: Number(q.config.scale || 5) }, (_, i) => <span key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-500"><Star className="size-5 fill-current" /></span>)}</div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">{t("ratingScaleLabel")} {[3, 5, 7, 10].map(n => <button key={n} type="button" onClick={() => onChange({ ...q, config: { ...q.config, scale: n } })} className={`rounded px-2 py-1 ${Number(q.config.scale || 5) === n ? "bg-emerald-600 font-semibold text-white" : "bg-slate-200"}`}>{n} {t("stars")}</button>)}</div></div>}
    {q.type === "csat" && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="grid grid-cols-5 gap-2">{["😠", "🙁", "😐", "🙂", "😍"].map((face, i) => <div key={face} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3"><span className="text-xl">{face}</span><span className="text-center text-xs text-slate-600">{t(`satisfactionLabels.${i}` as Parameters<typeof t>[0])}</span></div>)}</div><p className="mt-3 text-xs text-slate-500">{t("satisfactionHint")}</p></div>}
    {q.type === "nps" && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="mb-3 text-sm text-slate-600">{t("npsScaleHint")}</p><div className="grid grid-cols-11 gap-1">{Array.from({ length: 11 }, (_, n) => <span key={n} className={`rounded-md border p-2 text-center text-xs font-semibold ${n < 7 ? "border-rose-200 bg-rose-50 text-rose-700" : n < 9 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{n}</span>)}</div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{t("npsLowLabel")}</span><span>{t("npsHighLabel")}</span></div></div>}
    {q.type === "text" && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><textarea disabled placeholder={t("textAnswerPlaceholder")} className="w-full rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500" rows={2} /><p className="mt-2 text-xs text-slate-500">{t("textAnswerHint")}</p></div>}
    {choices && <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">{q.options.map((option, i) => <div className="flex items-center gap-2" key={option.value}><Circle className="size-4 shrink-0 text-slate-400" /><Input aria-label={`${t("choices")} ${i + 1}`} className="border-slate-300 bg-white text-slate-900" value={option.label.vi} onChange={e => onChange({ ...q, options: q.options.map((o, j) => j === i ? { ...o, label: { ...o.label, vi: e.target.value } } : o) })} /><button type="button" aria-label={t("removeChoice")} onClick={() => onChange({ ...q, options: q.options.filter((_, j) => j !== i) })} className="px-1 text-lg text-slate-400 hover:text-rose-600">×</button></div>)}<Button type="button" variant="outline" className="h-8 border-slate-200 bg-white text-xs text-emerald-700" onClick={() => onChange({ ...q, options: [...q.options, { value: `option-${createUuid()}`, label: { vi: t("choiceA") } }] })}><Plus className="mr-1 size-3" />{t("addChoice")}</Button></div>}
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={q.required} onChange={e => onChange({ ...q, required: e.target.checked })} />{t("required")}</label><div className="flex items-center gap-4"><button type="button" onClick={onDuplicate} className="text-sm text-slate-500 hover:text-slate-900">▢ {t("duplicate")}</button><button type="button" onClick={onRemove} className="text-sm font-medium text-rose-600">⌫ {t("remove")}</button></div></footer>
  </article>;
}

export function SurveyBuilder({ id }: { id?: string }) {
  const t = useTranslations("engine");
  const tn = useTranslations("notifications");
  const router = useRouter();
  const { workspace } = useCurrentWorkspace();
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const query = useQuery({
    queryKey: ["survey", id],
    enabled: !!id,
    queryFn: () => api<Survey>(`/surveys/${id}`),
  });
  async function create() {
    if (!workspace) return;
    setCreating(true);
    setError("");
    try {
      const s = await api<Survey>("/surveys", {
        method: "POST",
        body: { workspace_id: workspace.id, title: t("untitled") },
      });
      toast.success(tn("surveyCreated"));
      router.replace(`/surveys/${s.id}`);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  }
  if (!id)
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-1 py-2">
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {workspace ? <TemplateLibrary workspaceId={workspace.id} onCreate={() => void create()} creating={creating} /> : <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">{t("workspaceRequired")}</div>}
      </div>
    );
  if (query.error) return <p role="alert">{query.error.message}</p>;
  if (!query.data) return <p role="status">{t("loading")}</p>;
  return <Editor key={id} initial={query.data} />;
}

function Editor({ initial }: { initial: Survey }) {
  const t = useTranslations("engine");
  const tn = useTranslations("notifications");
  const canEdit = useCan("survey:edit");
  const client = useQueryClient();
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [share, setShare] = useState<{ url: string; embed: string } | null>(null);
  const [branch, setBranch] = useState("");
  const [simulation, setSimulation] = useState<Record<string, unknown>>({});
  const [pendingQuestionFocus, setPendingQuestionFocus] = useState<string | null>(null);
  const latest = useRef(draft);
  useEffect(() => {
    if (window.location.hash !== "#response-import") return;
    requestAnimationFrame(() =>
      document.getElementById("response-import")?.scrollIntoView({ behavior: "smooth" }),
    );
  }, []);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);
  useEffect(() => {
    if (!pendingQuestionFocus) return;
    const target = document.getElementById(`question-${pendingQuestionFocus}`);
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      setPendingQuestionFocus(null);
    });
  }, [draft.questions, pendingQuestionFocus]);
  const version = useRef(initial.updated_at);
  const saved = useRef(JSON.stringify(initial));
  const chain = useRef<Promise<void>>(Promise.resolve());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const save = useCallback(() => {
    const run = async () => {
      const current = latest.current;
      if (JSON.stringify(current) === saved.current) return;
      setSaving(true);
      setError("");
      try {
        const result = await api<Survey>(`/surveys/${initial.id}`, {
          method: "PUT",
          body: { ...current, expected_updated_at: version.current },
        });
        version.current = result.updated_at;
        saved.current = JSON.stringify(current);
        await client.invalidateQueries({ queryKey: ["surveys"] });
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    };
    chain.current = chain.current.catch(() => {}).then(run);
    return chain.current;
  }, [initial.id, client]);
  useEffect(() => {
    if (!canEdit) return;
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [draft, save, canEdit]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (saved.current !== JSON.stringify(latest.current)) e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  function add(type: Question["type"]) {
    const id = createUuid();
    setPendingQuestionFocus(id);
    setDraft((d) => ({
      ...d,
      questions: [
        ...d.questions,
        {
          id,
          code: `q-${id}`,
          type,
          title: { vi: t(`types.${type}`) },
          description: {},
          required: false,
          config:
            type === "matrix"
              ? { rows: [t("choiceA"), t("choiceB")], columns: [t("choiceA"), t("choiceB")] }
              : {},
          logic: {},
          options: (
            ["single_choice", "multi_choice", "picture_choice", "ranking"] as string[]
          ).includes(type)
            ? [
                { value: "a", label: { vi: t("choiceA") } },
                { value: "b", label: { vi: t("choiceB") } },
              ]
            : [],
        },
      ],
    }));
  }
  async function action(name: "publish" | "close" | "duplicate") {
    try {
      await save();
      const result = await api<Survey>(`/surveys/${initial.id}/${name}`, { method: "POST" });
      if (name === "duplicate") {
        toast.success(tn("duplicated"));
        router.push(`/surveys/${result.id}`);
        return;
      }
      version.current = result.updated_at;
      setDraft((d) => ({ ...d, status: result.status }));
      toast.success(tn(name === "publish" ? "published" : "closed"));
      if (name === "publish") {
        try {
          setShare(
            await api(`/surveys/${initial.id}/share?${new URLSearchParams({ branch })}`),
          );
        } catch (e) {
          setError((e as Error).message);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function importQuestions(file: File | undefined) {
    if (!file) return;
    try {
      await save();
      const form = new FormData();
      form.append("file", file);
      const result = await api<Survey>(`/surveys/${initial.id}/questions/import`, {
        method: "POST",
        form,
      });
      version.current = result.updated_at;
      saved.current = JSON.stringify(result);
      setDraft(result);
      toast.success(tn("questionsImported"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="min-h-screen space-y-5 bg-slate-50 p-3 text-slate-900 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div><h1 className="text-2xl font-bold tracking-tight">{t("builder")}</h1><p className="mt-1 text-sm text-slate-500">{t(`statuses.${draft.status}`)} · {t("autosave")}{saving ? ` · ${t("saving")}` : ""}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPreview((p) => !p)}>
            {preview ? t("edit") : t("preview")}
          </Button>
          {canEdit && (
            <>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => {
                  void save().then(() => toast.success(tn("saved"))).catch(() => {});
                }}
              >
                {saving ? t("saving") : t("save")}
              </Button>
              <Button
                disabled={saving}
                onClick={() => {
                  void action("publish");
                }}
              >
                {t("publish")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void action("close");
                }}
              >
                {t("close")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void action("duplicate");
                }}
              >
                {t("duplicate")}
              </Button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}
      <p role="status">
        {t(`statuses.${draft.status}`)} · {t("autosave")}
      </p>
      <fieldset disabled={!canEdit} className="grid min-w-0 gap-5 border-0 p-0 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            {t("title")}
            <Input
              className="border-slate-300 bg-white text-slate-900"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="block">
            {t("description")}
            <textarea
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 shadow-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              value={draft.description || ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          </section>
          {!preview ? (
            <>
              <div className="flex items-center justify-between px-1"><h2 className="font-semibold">{t("questionList")} <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs">{draft.questions.length}</span></h2><span className="text-xs text-slate-500">{t("questionReorderHint")}</span></div>
              <DndContext
                sensors={sensors}
                onDragEnd={({ active, over }) => {
                  if (over && active.id !== over.id)
                    setDraft((d) => ({
                      ...d,
                      questions: arrayMove(
                        d.questions,
                        d.questions.findIndex((q) => q.id === active.id),
                        d.questions.findIndex((q) => q.id === over.id),
                      ),
                    }));
                }}
              >
                <SortableContext
                  items={draft.questions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {!draft.questions.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{t("emptyQuestions")}</div>}
                    {draft.questions.map((q, index) => (
                      <RichQuestionEditor
                        key={q.id}
                        question={q}
                        index={index}
                        total={draft.questions.length}
                        onChange={(question) =>
                          setDraft((d) => ({
                            ...d,
                            questions: d.questions.map((x) => (x.id === q.id ? question : x)),
                          }))
                        }
                        onRemove={() =>
                          setDraft((d) => ({
                            ...d,
                            questions: d.questions.filter((x) => x.id !== q.id),
                          }))
                        }
                        onMove={(direction) => setDraft((d) => {
                          const next = [...d.questions];
                          const target = index + direction;
                          if (target >= 0 && target < next.length) {
                            const current = next[index], other = next[target];
                            if (current && other) { next[index] = other; next[target] = current; }
                          }
                          return { ...d, questions: next };
                        })}
                        onDuplicate={() => setDraft((d) => { const copy = { ...q, id: createUuid(), code: `q-${createUuid()}`, options: q.options.map((option) => ({ ...option })) }; const next = [...d.questions]; next.splice(index + 1, 0, copy); return { ...d, questions: next }; })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="add-question-title">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="add-question-title" className="flex items-center gap-2 font-semibold"><Plus className="size-4 text-emerald-600" />{t("addQuestion")}</h2><span className="text-xs text-slate-500">{t("addQuestionHint")}</span></div>
                <div className="flex flex-wrap gap-2">{questionTypes.map(([type, Icon]) => <Button key={type} type="button" variant="outline" onClick={() => add(type)} className="h-8 rounded-full border-slate-200 bg-white px-3 text-xs text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"><Icon className="mr-1.5 size-3.5 text-slate-500" />{t(`types.${type}`)}</Button>)}</div>
              </section>
            </>
          ) : (
            <div
              className="space-y-4 rounded-xl p-5"
              style={{
                background: draft.theme.background,
                color: draft.theme.text,
                fontFamily: draft.theme.font,
                fontSize: draft.theme.font_size,
              }}
            >
              {surveyPath(draft.questions, simulation).map((q) => (
                <QuestionControl
                  key={q.id}
                  question={q}
                  value={simulation[q.code]}
                  onChange={(value) => setSimulation({ ...simulation, [q.code]: value })}
                />
              ))}
            </div>
          )}
        </div>
        <aside className="h-fit space-y-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm lg:sticky lg:top-5 [&_details]:rounded-xl [&_details]:border [&_details]:border-slate-200 [&_details]:p-3 [&_details]:text-sm [&_input]:border-slate-300 [&_input]:bg-white [&_input]:text-slate-900 [&_select]:border-slate-300 [&_select]:bg-white [&_select]:text-slate-900 [&_textarea]:border-slate-300 [&_textarea]:bg-white [&_textarea]:text-slate-900">
          <div className="border-b border-slate-100 pb-3"><h2 className="flex items-center gap-2 font-semibold"><span className="text-emerald-600">◉</span>{t("theme")}</h2><p className="mt-1 text-xs text-slate-500">{t("themeDescription")}</p></div>
          <AdvancedSettings survey={draft} onChange={setDraft} />
          <div className="space-y-3"><div className="flex items-center justify-between text-sm font-semibold text-slate-700"><span>{t("themeLabels.primary")}</span><span className="flex items-center gap-2"><input type="color" value={draft.theme.primary} onChange={(e) => setDraft({ ...draft, theme: { ...draft.theme, primary: e.target.value } })} className="size-9 rounded-lg border border-slate-300 bg-white p-1" /><code className="text-xs font-normal text-slate-500">{draft.theme.primary.toUpperCase()}</code></span></div><div className="flex gap-2">{["#059669", "#15803D", "#2563EB", "#4F46E5", "#111827", "#92400E"].map((color) => <button key={color} type="button" aria-label={`${t("themeLabels.primary")} ${color}`} onClick={() => setDraft({ ...draft, theme: { ...draft.theme, primary: color } })} className={`size-6 rounded-full border-2 ${draft.theme.primary.toLowerCase() === color.toLowerCase() ? "border-white ring-2 ring-emerald-500" : "border-transparent"}`} style={{ backgroundColor: color }} />)}</div></div>
          {(["background", "text"] as const).map((key) => <label key={key} className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700"><span>{t(`themeLabels.${key}`)}<small className="mt-1 block font-normal text-slate-500">{key === "background" ? t("surveyBackgroundHint") : t("surveyTextHint")}</small></span><span className="flex items-center gap-2"><input type="color" value={draft.theme[key]} onChange={(e) => setDraft({ ...draft, theme: { ...draft.theme, [key]: e.target.value } })} className="size-9 rounded-lg border border-slate-300 bg-white p-1" /><code className="text-xs font-normal text-slate-500">{draft.theme[key].toUpperCase()}</code></span></label>)}
          <div className="space-y-2"><p className="text-sm font-semibold text-slate-700">{t("buttonCorners")}</p><div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">{(["square", "soft", "round"] as const).map((style) => <button type="button" key={style} onClick={() => setDraft({ ...draft, settings: { ...draft.settings, button_style: style } })} className={`rounded-md px-2 py-1.5 text-xs font-semibold ${draft.settings.button_style === style ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-white"}`}>{t(`buttonStyles.${style}`)}</button>)}</div></div>
          <label className="block">
            {t("fontSize")}
            <Input
              className="border-slate-300 bg-white text-slate-900"
              type="number"
              min={14}
              max={24}
              value={draft.theme.font_size}
              onChange={(e) =>
                setDraft({ ...draft, theme: { ...draft.theme, font_size: Number(e.target.value) } })
              }
            />
          </label>
          <label className="block">
            {t("voucherCode")}
            <Input
              className="border-slate-300 bg-white text-slate-900"
              value={String((draft.settings.voucher as { code?: string } | undefined)?.code || "")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  settings: {
                    ...draft.settings,
                    voucher: { enabled: !!e.target.value, code: e.target.value || null },
                  },
                })
              }
            />
          </label>
          <label className="block">
            {t("branch")}
            <Input className="border-slate-300 bg-white text-slate-900" value={branch} onChange={(e) => setBranch(e.target.value)} />
          </label>
          <Button
            type="button"
            variant="outline"
            className="w-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            onClick={async () => {
              try {
                setShare(
                  await api(
                    `/surveys/${initial.id}/share?${new URLSearchParams({ branch })}`,
                  ),
                );
                toast.success(tn("shareCreated"));
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {t("share")}
          </Button>
          {share && (
            <div className="space-y-2 break-all">
              <a className="underline" href={share.url} target="_blank" rel="noreferrer">
                {share.url}
              </a>
              <div className="flex gap-3">
                {["png", "svg"].map((format) => (
                  <a
                    className="underline"
                    key={format}
                    href={apiUrl(
                      `/surveys/${initial.id}/qr?${new URLSearchParams({ format, branch })}`,
                    )}
                  >
                    {t("downloadQr", { format: format.toUpperCase() })}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </fieldset>
      {canEdit && <div className="grid gap-4 lg:grid-cols-2"><section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="font-semibold">▤ {t("importQuestions")}</h2><a className="text-sm font-medium text-emerald-700 underline" href={apiUrl("/surveys/question-import-template")}>{t("questionTemplate")}</a></div><p className="text-sm leading-relaxed text-slate-600">{t("replaceQuestions")}</p><label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-emerald-400 hover:bg-emerald-50"><span className="mb-2 text-2xl text-emerald-700">↑</span><span className="text-sm font-semibold">{t("dropQuestionFile")}</span><span className="mt-1 text-xs text-slate-500">{t("questionFileTypes")}</span><input className="sr-only" type="file" aria-label={t("importQuestions")} accept=".csv,.xlsx" onChange={(e) => { void importQuestions(e.target.files?.[0]); }} /></label></section><ImportPanel survey={draft} /></div>}
      {canEdit && <DistributionPanel survey={draft} />}
    </div>
  );
}
