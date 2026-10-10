"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardList, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCan, useCurrentWorkspace, useSession } from "@/lib/api/hooks";

export function WelcomeHome() {
  const t = useTranslations("app.home");
  const { data: session } = useSession();
  const { workspace } = useCurrentWorkspace();
  const canCreate = useCan("survey:edit");
  const name = session?.user.full_name.trim() || session?.user.email || "";
  const cards = [
    {
      href: "/surveys/new",
      title: t("createTitle"),
      description: t("createDescription"),
      icon: Plus,
      tone: "bg-emerald-100 text-emerald-800",
    },
    {
      href: "/surveys",
      title: t("surveysTitle"),
      description: t("surveysDescription"),
      icon: ClipboardList,
      tone: "bg-sky-100 text-sky-800",
    },
    {
      href: "/reports",
      title: t("reportsTitle"),
      description: t("reportsDescription"),
      icon: BarChart3,
      tone: "bg-violet-100 text-violet-800",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="brand-forest relative isolate overflow-hidden rounded-[2rem] shadow-soft">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-40 size-[30rem] rounded-full bg-[#54c79b]/15 blur-3xl"
        />
        <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-14 lg:py-16">
          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#a4f5d5]">
              <Sparkles aria-hidden className="size-3.5" />
              {t("eyebrow")}
            </p>
            <h1 className="max-w-2xl text-3xl leading-tight font-bold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
              {t("greeting", { name })}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {t("subtitle")}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {canCreate && (
                <Button
                  size="lg"
                  className="bg-[#b8efd5] text-[#103e32] hover:bg-[#d1f7e3]"
                  asChild
                >
                  <Link href="/surveys/new">
                    <Plus aria-hidden />
                    {t("createAction")}
                  </Link>
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                asChild
              >
                <Link href="/surveys">
                  {t("surveysAction")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm sm:p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-[#a4f5d5] uppercase">
              {t("workspaceLabel")}
            </p>
            <p className="mt-2 truncate text-xl font-semibold text-white">
              {workspace?.name || session?.tenant.name}
            </p>
            <div className="my-5 h-px bg-white/15" />
            <ol className="space-y-4">
              {[t("stepCreate"), t("stepCollect"), t("stepAnalyze")].map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-bold text-[#a4f5d5]">
                    0{index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="home-shortcuts-title" className="space-y-4">
        <div>
          <h2 id="home-shortcuts-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            {t("shortcutsTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("shortcutsDescription")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(({ href, title, description, icon: Icon, tone }, index) => (
            <Link
              key={title}
              href={href}
              className="group rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`grid size-11 place-items-center rounded-xl ${tone}`}>
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="text-sm font-semibold tabular-nums text-muted-foreground/70">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                {t("openAction")}
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
