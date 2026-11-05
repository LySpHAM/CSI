"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Survey } from "@/lib/api/surveys";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useCan } from "@/lib/api/hooks";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatPeriod(survey: Survey, noSchedule: string, fromLabel: (date: string) => string, untilLabel: (date: string) => string) {
  const { opens_at: opensAt, closes_at: closesAt } = survey;
  if (!opensAt && !closesAt) return noSchedule;
  if (opensAt && closesAt) return `${formatDate(opensAt)} – ${formatDate(closesAt)}`;
  return opensAt ? fromLabel(formatDate(opensAt)) : untilLabel(formatDate(closesAt!));
}

export function SurveyDetails({ id }: { id: string }) {
  const t = useTranslations("engine");
  const locale = useLocale();
  const canEdit = useCan("survey:edit");
  const query = useQuery({
    queryKey: ["survey", id],
    queryFn: () => api<Survey>(`/surveys/${id}`),
  });

  if (query.error) return <p role="alert" className="text-destructive">{query.error.message}</p>;
  if (!query.data) return <p role="status">{t("loading")}</p>;

  const survey = query.data;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("surveyDetails")}
        description={t("surveyDetailsDescription")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/surveys"><ArrowLeft aria-hidden />{t("surveys")}</Link>
            </Button>
            {canEdit && <Button asChild>
              <Link href={`/surveys/${survey.id}/edit`}><Pencil aria-hidden />{t("edit")}</Link>
            </Button>}
          </div>
        }
      />

      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <header className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-7">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">{survey.title}</h2>
            <p className="text-sm text-muted-foreground">{t("surveyCode")}: <span className="font-mono text-foreground">{survey.slug}</span></p>
            <p className="text-sm leading-6"><span className="font-semibold">{t("description")}:</span> {survey.description || t("noDescription")}</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
            {t(`statuses.${survey.status}` as Parameters<typeof t>[0])}
          </span>
        </header>

        <section className="border-t border-border/70 p-5 sm:p-7">
          <h3 className="mb-4 text-lg font-semibold">{t("surveyInformation")}</h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex justify-between gap-4 sm:block"><dt className="text-muted-foreground">{t("createdAt")}</dt><dd className="font-medium sm:mt-1">{formatDate(survey.created_at)}</dd></div>
            <div className="flex justify-between gap-4 sm:block"><dt className="text-muted-foreground">{t("surveyPeriod")}</dt><dd className="text-right font-medium sm:mt-1 sm:text-left">{formatPeriod(survey, t("noSchedule"), (date) => t("fromDate", { date }), (date) => t("untilDate", { date }))}</dd></div>
            <div className="flex justify-between gap-4 sm:block"><dt className="text-muted-foreground">{t("responseCountHeading")}</dt><dd className="font-medium sm:mt-1">{t("responseCount", { count: survey.response_count })}</dd></div>
          </dl>
        </section>

        <section className="border-t border-border/70 p-5 sm:p-7">
          <h3 className="mb-4 text-lg font-semibold">{t("questionList")}</h3>
          {survey.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noQuestions")}</p>
          ) : (
            <ol className="divide-y divide-border/70">
              {survey.questions.map((question, index) => (
                <li key={question.id} className="py-4 first:pt-1 last:pb-1">
                  <p className="font-semibold">{t("questionNumber", { number: index + 1 })} {question.title[locale] || question.title.vi}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t("questionType")}: {t(`types.${question.type}` as Parameters<typeof t>[0])}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </article>
    </div>
  );
}
