import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

const plans = [
  {
    code: "free",
    price: 0,
    limits: [1, 3, 5, 500],
    features: [],
  },
  {
    code: "pro",
    price: 490_000,
    limits: [5, 15, 100, 20_000],
    features: ["logic", "quiz", "pdf", "invites"],
  },
  {
    code: "business",
    price: 1_990_000,
    limits: [50, 200, 2_000, 500_000],
    features: ["logic", "quiz", "pdf", "invites", "pivot", "scheduled", "tickets"],
  },
] as const;

export async function PricingPage() {
  const t = await getTranslations("marketing.pricingPage");
  const translate = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <div className="bg-slate-50 text-slate-900">
      <section className="px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-20">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-wide text-emerald-700">{t("eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">{t("description")}</p>
          <p className="mx-auto mt-6 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm leading-6 text-amber-950">
            {t("notice")}
          </p>
        </header>

        <div className="mx-auto mt-10 grid max-w-6xl items-stretch gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const featured = plan.code === "pro";
            return (
              <article
                key={plan.code}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm sm:p-7 ${
                  featured ? "border-emerald-500 ring-2 ring-emerald-500/15" : "border-slate-200"
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
                    <Sparkles className="size-3.5" aria-hidden />{t("recommended")}
                  </span>
                )}
                <h2 className="text-xl font-bold">{translate(`plans.${plan.code}.name`)}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{translate(`plans.${plan.code}.description`)}</p>
                <p className="mt-6 text-3xl font-bold tracking-tight">
                  {plan.price === 0 ? t("freePrice") : `${plan.price.toLocaleString("vi-VN")} ₫`}
                  {plan.price > 0 && <span className="ml-1 text-sm font-medium text-slate-500">{t("perMonth")}</span>}
                </p>
                <Button className="mt-5 w-full" variant={featured ? "default" : "outline"} asChild>
                  <Link href={plan.code === "free" ? "/register" : "/login?next=%2Fbilling"}>
                    {translate(`plans.${plan.code}.action`)}<ArrowRight className="size-4" />
                  </Link>
                </Button>

                <div className="mt-7 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold">{t("limitsTitle")}</h3>
                  <ul className="mt-3 space-y-3">
                    {plan.limits.map((value, index) => (
                      <li key={index} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-slate-600">{translate(`limits.${index}`)}</span>
                        <span className="shrink-0 font-semibold tabular-nums">{value.toLocaleString("vi-VN")}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold">{t("featuresTitle")}</h3>
                  <ul className="mt-3 space-y-2.5">
                    {(plan.features.length ? plan.features : ["core"]).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm leading-5 text-slate-600">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
                        {translate(`features.${feature}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mx-auto mt-6 max-w-5xl text-center text-xs leading-5 text-slate-500">{t("footnote")}</p>
      </section>
    </div>
  );
}
