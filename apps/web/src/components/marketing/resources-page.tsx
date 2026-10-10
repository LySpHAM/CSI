import Link from "next/link";
import { ArrowRight, BookOpen, Code2, FileSpreadsheet, LifeBuoy, Workflow } from "lucide-react";
import { getTranslations } from "next-intl/server";

const resources = [
  { key: "gettingStarted", href: "/#steps", Icon: Workflow },
  { key: "surveys", href: "/#features", Icon: BookOpen },
  { key: "data", href: "/login", Icon: FileSpreadsheet },
  { key: "api", href: "/backend", Icon: Code2 },
  { key: "help", href: "/#faq", Icon: LifeBuoy },
] as const;

export async function ResourcesPage() {
  const t = await getTranslations("marketing.resourcesPage");
  const translate = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <div className="bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-wide text-emerald-700">{t("eyebrow")}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">{t("description")}</p>
        </header>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map(({ key, href, Icon }) => (
            <Link
              key={key}
              href={href}
              className="group flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-5 text-lg font-bold">{translate(`${key}.title`)}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{translate(`${key}.description`)}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                {translate(`${key}.action`)}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </div>

        <aside className="mt-10 rounded-2xl bg-[#103e32] px-6 py-8 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-9">
          <div>
            <h2 className="text-xl font-bold">{t("ctaTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">{t("ctaDescription")}</p>
          </div>
          <Link href="/register" className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#103e32] transition hover:bg-emerald-50 sm:mt-0">
            {t("ctaAction")}<ArrowRight className="size-4" aria-hidden />
          </Link>
        </aside>
      </section>
    </div>
  );
}
