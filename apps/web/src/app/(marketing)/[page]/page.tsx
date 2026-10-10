import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Mail,
  MessageSquareText,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateSurveyCta } from "@/components/marketing/create-survey-cta";
import { PricingPage } from "@/components/marketing/pricing-page";
import { ResourcesPage } from "@/components/marketing/resources-page";
import { ComingSoonState } from "@/components/feedback/states";

// Các trang nội dung tĩnh chưa xây dựng — trỏ tới giai đoạn sẽ hoàn thiện để không có link chết.
const PLANNED_PAGES = {
  pricing: { stage: 13, title: "marketing.nav.pricing" },
  templates: { stage: 11, title: "marketing.footer.templates" },
  docs: { stage: 14, title: "marketing.footer.docs" },
  about: { stage: 14, title: "marketing.footer.about" },
  privacy: { stage: 14, title: "marketing.footer.privacy" },
  terms: { stage: 14, title: "marketing.footer.terms" },
  "employee-surveys": { stage: 0, title: "marketing.nav.mega.people.title" },
  "customer-surveys": { stage: 0, title: "marketing.nav.mega.customer.title" },
} as const;

type PlannedPage = keyof typeof PLANNED_PAGES;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PLANNED_PAGES).map((page) => ({ page }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const t = await getTranslations();
  return { title: t(PLANNED_PAGES[page as PlannedPage].title) };
}

export default async function PlannedContentPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const entry = PLANNED_PAGES[page as PlannedPage];
  const t = await getTranslations();
  const translate = (key: string) => t(key as Parameters<typeof t>[0]);

  if (page === "pricing") return <PricingPage />;
  if (page === "docs") return <ResourcesPage />;

  if (page === "employee-surveys" || page === "customer-surveys") {
    const isEmployee = page === "employee-surveys";
    const copy = page === "employee-surveys"
      ? {
          eyebrow: translate("marketing.intros.employee.eyebrow"),
          title: translate("marketing.intros.employee.title"),
          description: translate("marketing.intros.employee.description"),
          benefits: [
            { title: translate("marketing.intros.employee.benefit1.title"), text: translate("marketing.intros.employee.benefit1.text") },
            { title: translate("marketing.intros.employee.benefit2.title"), text: translate("marketing.intros.employee.benefit2.text") },
            { title: translate("marketing.intros.employee.benefit3.title"), text: translate("marketing.intros.employee.benefit3.text") },
          ],
          cta: translate("marketing.intros.employee.cta"),
          overviewTitle: translate("marketing.intros.employee.overviewTitle"),
          overviewText: translate("marketing.intros.employee.overviewText"),
          panelTitle: translate("marketing.intros.employee.panelTitle"),
          info1Title: translate("marketing.intros.employee.info1Title"),
          info1Text: translate("marketing.intros.employee.info1Text"),
          info2Title: translate("marketing.intros.employee.info2Title"),
          info2Text: translate("marketing.intros.employee.info2Text"),
          processEyebrow: translate("marketing.intros.employee.processEyebrow"),
          processTitle: translate("marketing.intros.employee.processTitle"),
          processDescription: translate("marketing.intros.employee.processDescription"),
          steps: [
            [translate("marketing.intros.employee.step1Title"), translate("marketing.intros.employee.step1Text")],
            [translate("marketing.intros.employee.step2Title"), translate("marketing.intros.employee.step2Text")],
            [translate("marketing.intros.employee.step3Title"), translate("marketing.intros.employee.step3Text")],
            [translate("marketing.intros.employee.step4Title"), translate("marketing.intros.employee.step4Text")],
          ],
          workflowTitle: translate("marketing.intros.employee.workflowTitle"),
          workflow1: translate("marketing.intros.employee.workflow1"),
          workflow2: translate("marketing.intros.employee.workflow2"),
          workflow3: translate("marketing.intros.employee.workflow3"),
          workflowNote: translate("marketing.intros.employee.workflowNote"),
          formatsEyebrow: translate("marketing.intros.employee.formatsEyebrow"),
          formatsTitle: translate("marketing.intros.employee.formatsTitle"),
          formatsDescription: translate("marketing.intros.employee.formatsDescription"),
          channels: [translate("marketing.intros.employee.channel1"), translate("marketing.intros.employee.channel2"), translate("marketing.intros.employee.channel3")],
          featureTitle: translate("marketing.intros.employee.featureTitle"),
          featureText: translate("marketing.intros.employee.featureText"),
          points: [translate("marketing.intros.employee.point1"), translate("marketing.intros.employee.point2"), translate("marketing.intros.employee.point3")],
        }
      : {
          eyebrow: translate("marketing.intros.customer.eyebrow"),
          title: translate("marketing.intros.customer.title"),
          description: translate("marketing.intros.customer.description"),
          benefits: [
            { title: translate("marketing.intros.customer.benefit1.title"), text: translate("marketing.intros.customer.benefit1.text") },
            { title: translate("marketing.intros.customer.benefit2.title"), text: translate("marketing.intros.customer.benefit2.text") },
            { title: translate("marketing.intros.customer.benefit3.title"), text: translate("marketing.intros.customer.benefit3.text") },
          ],
          cta: translate("marketing.intros.customer.cta"),
          overviewTitle: translate("marketing.intros.customer.overviewTitle"),
          overviewText: translate("marketing.intros.customer.overviewText"),
          panelTitle: translate("marketing.intros.customer.panelTitle"),
          info1Title: translate("marketing.intros.customer.info1Title"),
          info1Text: translate("marketing.intros.customer.info1Text"),
          info2Title: translate("marketing.intros.customer.info2Title"),
          info2Text: translate("marketing.intros.customer.info2Text"),
          processEyebrow: translate("marketing.intros.customer.processEyebrow"),
          processTitle: translate("marketing.intros.customer.processTitle"),
          processDescription: translate("marketing.intros.customer.processDescription"),
          steps: [
            [translate("marketing.intros.customer.step1Title"), translate("marketing.intros.customer.step1Text")],
            [translate("marketing.intros.customer.step2Title"), translate("marketing.intros.customer.step2Text")],
            [translate("marketing.intros.customer.step3Title"), translate("marketing.intros.customer.step3Text")],
            [translate("marketing.intros.customer.step4Title"), translate("marketing.intros.customer.step4Text")],
          ],
          workflowTitle: translate("marketing.intros.customer.workflowTitle"),
          workflow1: translate("marketing.intros.customer.workflow1"),
          workflow2: translate("marketing.intros.customer.workflow2"),
          workflow3: translate("marketing.intros.customer.workflow3"),
          workflowNote: translate("marketing.intros.customer.workflowNote"),
          formatsEyebrow: translate("marketing.intros.customer.formatsEyebrow"),
          formatsTitle: translate("marketing.intros.customer.formatsTitle"),
          formatsDescription: translate("marketing.intros.customer.formatsDescription"),
          channels: [translate("marketing.intros.customer.channel1"), translate("marketing.intros.customer.channel2"), translate("marketing.intros.customer.channel3")],
          featureTitle: translate("marketing.intros.customer.featureTitle"),
          featureText: translate("marketing.intros.customer.featureText"),
          points: [translate("marketing.intros.customer.point1"), translate("marketing.intros.customer.point2"), translate("marketing.intros.customer.point3")],
        };
    const topics = isEmployee
      ? [1, 2, 3, 4, 5].map((n) => t(`marketing.nav.mega.people.item${n}` as Parameters<typeof t>[0]))
      : [1, 2, 3, 4, 5].map((n) => t(`marketing.nav.mega.customer.item${n}` as Parameters<typeof t>[0]));
    const stepIcons = [ClipboardCheck, Mail, CheckCircle2, BarChart3];
    const channelIcons = isEmployee ? [Mail, MessageSquareText, QrCode] : [QrCode, Mail, Smartphone];
    return (
      <div className="bg-white text-slate-800">
        <section className="mx-auto max-w-6xl px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16">
          <header className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{copy.eyebrow}</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{copy.title}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">{copy.description}</p>
          </header>

          <div id="overview" className="mt-12 grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
            <nav aria-label={copy.eyebrow} className="space-y-1">
              {topics.map((topic, index) => (
                <a key={topic} href={index === 0 ? "#overview" : index < 3 ? "#process" : "#formats"}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition ${index === 0 ? "border border-emerald-300 bg-emerald-50 text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-emerald-800"}`}>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-md ${index === 0 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {index === 0 ? <UsersRound className="size-4" /> : <CheckCircle2 className="size-3.5" />}
                  </span>
                  <span>{topic}</span>
                </a>
              ))}
              <div className="mt-5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-4 text-white shadow-lg shadow-emerald-100">
                <p className="text-sm font-bold">{copy.cta}</p>
                <p className="mt-1 text-xs leading-5 text-emerald-50">{copy.info1Text}</p>
                <Button size="sm" className="mt-3 w-full bg-white text-emerald-800 hover:bg-emerald-50" asChild>
                  <CreateSurveyCta>{copy.cta}<ArrowRight className="size-3.5" /></CreateSurveyCta>
                </Button>
              </div>
            </nav>

            <article className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-1 sm:p-5">
              <div aria-hidden className="absolute right-0 top-0 size-20 rounded-bl-[3rem] bg-emerald-50" />
              <div className="relative">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">{copy.panelTitle}</span>
                <h2 className="mt-4 max-w-2xl text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{copy.overviewTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">{copy.overviewText}</p>
                <div className="mt-5 rounded-xl bg-slate-900 p-4 text-white shadow-xl sm:p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-300"><Sparkles className="size-4" />{copy.panelTitle}</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {copy.benefits.map((benefit) => (
                      <li key={benefit.title} className="flex gap-2 text-[11px] leading-5 text-slate-200">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" /><span><b className="text-white">{benefit.title}:</b> {benefit.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { Icon: ShieldCheck, title: copy.info1Title, text: copy.info1Text },
                    { Icon: BarChart3, title: copy.info2Title, text: copy.info2Text },
                  ].map(({ Icon, title, text }) => (
                    <div key={title} className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-emerald-700 shadow-sm"><Icon className="size-4" /></span>
                      <div><h3 className="text-xs font-bold text-slate-800">{title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="process" className="border-y border-slate-100 bg-[#fbfdfc] px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <header className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">{copy.processEyebrow}</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{copy.processTitle}</h2>
              <p className="mt-3 text-xs leading-6 text-slate-500 sm:text-sm">{copy.processDescription}</p>
            </header>
            <div className="relative mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              <div aria-hidden className="absolute left-[12%] right-[12%] top-6 hidden h-px bg-emerald-300 lg:block" />
              {copy.steps.map(([title, text], index) => {
                const Icon = stepIcons[index]!;
                return (
                  <article key={title} className="relative text-center">
                    <span className="relative mx-auto grid size-12 place-items-center rounded-full border border-emerald-100 bg-white text-emerald-700 shadow-sm"><Icon className="size-5" /><span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">{index + 1}</span></span>
                    <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-slate-500">{text}</p>
                  </article>
                );
              })}
            </div>

            <div className="mx-auto mt-12 max-w-5xl rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_16px_50px_-35px_rgba(15,61,48,.35)] sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">{copy.workflowTitle}</h3>
                <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700 sm:inline-flex">● {copy.workflowNote}</span>
              </div>
              <div className="grid items-center gap-3 md:grid-cols-[1fr_36px_0.82fr_36px_1fr]">
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="flex items-center gap-2 text-[11px] font-bold text-slate-700"><UsersRound className="size-4 text-emerald-600" />{copy.workflow1}</p>
                  <div className="mt-3 space-y-2">
                    {["bg-emerald-100", "bg-cyan-100", "bg-amber-100"].map((color, i) => <div key={color} className="flex items-center gap-2 rounded-md bg-slate-50 p-2"><span className={`size-5 rounded-full ${color}`} /><span className="h-1.5 flex-1 rounded bg-slate-200" /><span className="h-1.5 w-8 rounded bg-slate-100" /></div>)}
                  </div>
                </div>
                <ArrowRight className="mx-auto hidden size-5 text-emerald-400 md:block" />
                <div className="mx-auto w-full max-w-[170px] rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-3 shadow-lg">
                  <div className="mx-auto h-1 w-9 rounded-full bg-slate-200" />
                  <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-center"><Smartphone className="mx-auto size-5 text-emerald-700" /><p className="mt-2 text-[9px] font-bold text-slate-700">{copy.workflow2}</p><div className="mx-auto mt-2 h-1 w-4/5 rounded bg-slate-200" /><div className="mx-auto mt-1.5 h-1 w-3/5 rounded bg-slate-100" /><span className="mt-3 block rounded-md bg-emerald-500 py-1.5 text-[8px] font-bold text-white">CSI</span></div>
                </div>
                <ArrowRight className="mx-auto hidden size-5 text-emerald-400 md:block" />
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="flex items-center gap-2 text-[11px] font-bold text-slate-700"><BarChart3 className="size-4 text-emerald-600" />{copy.workflow3}</p>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3"><div className="flex items-end gap-2 border-b border-slate-200 pb-2">{[36, 58, 44, 78, 62, 92, 72].map((height, i) => <span key={i} className="flex-1 rounded-t-sm bg-emerald-400" style={{ height }} />)}</div><div className="mt-3 flex justify-between"><span className="rounded bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">{isEmployee ? "78%" : "4.8/5"}</span><span className="text-[8px] text-slate-400">{copy.workflowNote}</span></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="formats" className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <header className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">{copy.formatsEyebrow}</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{copy.formatsTitle}</h2>
            <p className="mt-3 text-xs leading-6 text-slate-500 sm:text-sm">{copy.formatsDescription}</p>
            <div className="mt-5 inline-flex flex-wrap justify-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
              {copy.channels.map((channel, index) => { const Icon = channelIcons[index]!; return <span key={channel} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-semibold ${index === 0 ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500"}`}><Icon className="size-3.5" />{channel}</span>; })}
            </div>
          </header>
          <article className="mx-auto mt-7 grid max-w-5xl overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_20px_60px_-40px_rgba(15,61,48,.4)] md:grid-cols-[1.05fr_.95fr]">
            <div className="p-6 sm:p-9">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Mail className="size-5" /></span>
              <h3 className="mt-4 text-xl font-bold text-slate-900">{copy.featureTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">{copy.featureText}</p>
              <ul className="mt-5 space-y-2">
                {copy.points.map((point) => <li key={point} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2.5 text-xs font-medium text-slate-600"><CheckCircle2 className="size-4 shrink-0 text-emerald-500" />{point}</li>)}
              </ul>
              <Button className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700" asChild><CreateSurveyCta>{copy.cta}<ArrowRight className="size-4" /></CreateSurveyCta></Button>
            </div>
            <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-emerald-50 p-8">
              <div aria-hidden className="absolute -right-8 top-5 size-36 rounded-full bg-emerald-400/70" />
              <div aria-hidden className="absolute bottom-5 left-8 size-16 rotate-[-18deg] bg-yellow-300 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
              <div aria-hidden className="absolute bottom-8 right-8 size-12 rotate-12 bg-rose-500 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
              <div className="relative w-48 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-emerald-900/10">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2"><span className="grid size-6 place-items-center rounded-md bg-emerald-500 text-white"><Mail className="size-3.5" /></span><span className="h-1.5 w-20 rounded bg-slate-200" /></div>
                <p className="mt-3 text-[9px] font-bold text-slate-700">{copy.channels[0]}</p><div className="mt-2 h-1 w-full rounded bg-slate-100" /><div className="mt-1 h-1 w-4/5 rounded bg-slate-100" />
                <div className="mt-3 rounded-lg bg-emerald-50 p-2"><div className="flex items-center gap-1"><FileSpreadsheet className="size-3 text-emerald-600" /><span className="text-[8px] font-semibold text-slate-700">CSI · {copy.workflow2}</span></div><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((item) => <span key={item} className="grid size-5 place-items-center rounded bg-white text-[8px] text-amber-500 shadow-sm">★</span>)}</div></div>
                <div className="mt-3 flex justify-center"><span className="rounded-md bg-emerald-500 px-4 py-1.5 text-[8px] font-bold text-white">{copy.cta}</span></div>
              </div>
            </div>
          </article>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t(entry.title)}</h1>
      <ComingSoonState
        title={t("states.comingSoonTitle")}
        description={t("states.comingSoonDescription", { stage: entry.stage })}
        action={
          <Button variant="outline" asChild>
            <Link href="/">{t("states.backHome")}</Link>
          </Button>
        }
      />
    </div>
  );
}
