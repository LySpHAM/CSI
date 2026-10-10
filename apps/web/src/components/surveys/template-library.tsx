"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  GraduationCap,
  HeartPulse,
  Hotel,
  Laptop,
  Search,
  ShoppingBag,
  Sparkles,
  Utensils,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Survey } from "@/lib/api/surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const categoryKeys = [
  "all",
  "restaurant",
  "hotel",
  "technology",
  "retail",
  "education",
  "health",
  "general",
  "humanResources",
] as const;
type Category = (typeof categoryKeys)[number];
type Template = { code: string; title: string; industry: string; rating: string; comment: string };

const industryByKey: Record<Category, string> = {
  all: "Tất cả",
  restaurant: "Nhà hàng",
  hotel: "Khách sạn",
  technology: "Công nghệ",
  retail: "Bán lẻ",
  education: "Giáo dục",
  health: "Y tế",
  general: "Tổng quát",
  humanResources: "Nhân sự",
};
const icons = {
  restaurant: Utensils,
  hotel: Hotel,
  it: Laptop,
  retail: ShoppingBag,
  education: GraduationCap,
  health: HeartPulse,
  nps: Sparkles,
  employees: UsersRound,
};

function IconForTemplate({ code, className = "size-4" }: { code: string; className?: string }) {
  const Icon = icons[code as keyof typeof icons] || Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}

export function TemplateLibrary({
  workspaceId,
  onCreate,
  creating,
}: {
  workspaceId: string;
  onCreate: () => void;
  creating: boolean;
}) {
  const t = useTranslations("engine");
  const tn = useTranslations("notifications");
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["templates"],
    queryFn: () => api<Template[]>("/templates"),
  });
  const filtered = useMemo(
    () =>
      (query.data || []).filter(
        (item) =>
          (category === "all" || item.industry === industryByKey[category]) &&
          `${item.title} ${item.industry}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      ),
    [query.data, category, search],
  );
  useEffect(() => {
    if (!filtered.some((item) => item.code === selectedCode)) {
      setSelectedCode(filtered[0]?.code || null);
    }
  }, [filtered, selectedCode]);
  const selected = filtered.find((item) => item.code === selectedCode) || null;

  async function useTemplate(code: string) {
    setBusy(true);
    setError("");
    try {
      const survey = await api<Survey>(`/templates/${code}/use`, {
        method: "POST",
        body: { workspace_id: workspaceId },
      });
      toast.success(tn("templateCreated"));
      router.push(`/surveys/${survey.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("create")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("templateLibraryDescription")}
          </p>
        </div>
        <Button onClick={onCreate} disabled={creating}>
          {creating ? t("creating") : `＋ ${t("createNew")}`}
        </Button>
      </header>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <section className="grid gap-6 lg:grid-cols-[172px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_310px]">
        <aside className="space-y-2 lg:col-span-1">
          <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("filterByIndustry")}
          </h2>
          {categoryKeys.map((item) => {
            const count =
              item === "all"
                ? query.data?.length || 0
                : query.data?.filter((template) => template.industry === industryByKey[item]).length || 0;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  category === item
                    ? "bg-emerald-900 font-semibold text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span>{t(`templateCategories.${item}`)}</span>
                <span className="text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </aside>

        <div className="min-w-0 space-y-4 lg:col-span-1">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-xl font-semibold">{t("templates")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("templateLibraryDescription")}</p>
            </div>
            <label className="relative w-full sm:w-56">
              <span className="sr-only">{t("searchTemplates")}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchTemplates")}
                className="pl-9"
              />
            </label>
          </div>

          {query.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-xl border bg-muted/40" />
              ))}
            </div>
          ) : query.error ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground" role="status">
              {(query.error as Error).message}
            </div>
          ) : filtered.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((template) => {
                const active = selectedCode === template.code;
                return (
                  <article
                    key={template.code}
                    className={`flex min-h-36 flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-emerald-400 ${
                      active ? "border-2 border-emerald-900 shadow-sm" : "border-slate-200"
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedCode(template.code)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold leading-snug">{template.title}</h3>
                        <IconForTemplate code={template.code} className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {template.industry} · {t("templateQuestionCount", { count: 2 })} · ~2 phút
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{template.rating}</p>
                    </button>
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">{t("templateQuestionCount", { count: 2 })}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          void useTemplate(template.code);
                        }}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {t("useTemplate")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              {t("noTemplatesFound")}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-xl border bg-white p-4 shadow-sm lg:col-span-2 xl:sticky xl:top-5 xl:col-span-1">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{t("templatePreview")}</span>
                <span>{selected.industry} · CSAT · Ẩn thực & Phục vụ</span>
              </div>
              <h2 className="mt-3 text-lg font-bold">{selected.title}</h2>
              <p className="mt-1 border-b pb-3 text-xs text-muted-foreground">
                {t("previewIndustry", { industry: selected.industry })} · {t("templateQuestionCount", { count: 2 })} · ~2 phút
              </p>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold">{t("sampleQuestions")}</span>
                  <span className="text-muted-foreground">2 {t("displayed")}</span>
                </div>
                <div className="divide-y rounded-lg border">
                  <div className="p-3">
                    <p className="text-sm font-medium">01. {selected.rating}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("ratingQuestionHint")}</p>
                    <div className="mt-3 flex gap-2" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <span key={score} className="grid size-7 place-items-center rounded-full border text-xs text-slate-500">{score}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium">02. {selected.comment}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("textQuestionHint")}</p>
                    <div className="mt-3 h-12 rounded-md border bg-slate-50" aria-hidden="true" />
                  </div>
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={() => void useTemplate(selected.code)} disabled={busy}>
                {t("useNamedTemplate", { title: selected.title })} <ArrowRight className="ml-2 size-4" />
              </Button>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("selectTemplatePreview")}</p>
          )}
        </aside>
      </section>
    </div>
  );
}
