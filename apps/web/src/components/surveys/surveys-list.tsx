"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye, Pencil, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { ApiError, api } from "@/lib/api/client";
import { useCan, useCurrentWorkspace } from "@/lib/api/hooks";
import type { Page, Survey } from "@/lib/api/surveys";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SurveysList() {
  const t = useTranslations("engine");
  const tn = useTranslations("notifications");
  const { workspace } = useCurrentWorkspace();
  const canEdit = useCan("survey:edit");
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const query = useQuery({
    queryKey: ["surveys", workspace?.id, search, status, page],
    enabled: !!workspace,
    queryFn: () =>
        api<Page<Survey>>(
          `/surveys?${new URLSearchParams({
            workspace_id: workspace!.id,
            search,
            ...(status ? { status } : {}),
            page: String(page),
          })}`,
        ),
  });
  async function removeSurvey(survey: Survey) {
    setActionError("");
    setDeleting(true);
    try {
      await api(`/surveys/${survey.id}?confirm_title=${encodeURIComponent(survey.title)}`, {
        method: "DELETE",
      });
      await client.invalidateQueries({ queryKey: ["surveys"] });
      toast.success(tn("deleted"));
      setDeleteTarget(null);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : String(error));
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div className="space-y-8">
      <PageHeader
        title={t("surveys")}
        description={t("surveyListDescription")}
        actions={
          canEdit && (
            <Button asChild>
              <Link href="/surveys/new">{t("create")}</Link>
            </Button>
          )
        }
      />
      {!workspace && (
        <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("workspaceRequired")}
        </p>
      )}
      <div className="grid items-start gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
        <aside aria-label={t("filters")} className="self-start md:sticky md:top-24">
          <section className="overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-soft">
            <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
              <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <SlidersHorizontal className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold tracking-tight">{t("filters")}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("filterDescription")}</p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <label className="block space-y-1.5 text-xs font-medium text-foreground">
                <span>{t("search")}</span>
                <span className="relative block">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    className="pl-9"
                    aria-label={t("search")}
                    placeholder={t("search")}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </span>
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-foreground">
                <span>{t("status")}</span>
                <select
                  aria-label={t("status")}
                  value={status}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("all")}</option>
                  {["draft", "published", "closed", "archived"].map((s) => (
                    <option key={s} value={s}>
                      {t(`statuses.${s}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </aside>
        <div className="min-w-0 space-y-6">
          {query.isLoading && (
            <p role="status" className="py-10 text-center text-sm text-muted-foreground">
              {t("loading")}
            </p>
          )}
          {query.error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {query.error.message}
            </p>
          )}
          {actionError && (
            <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
              {actionError}
            </p>
          )}
          {query.data?.total === 0 && (
            <p className="rounded-2xl border border-dashed bg-card/70 px-6 py-14 text-center text-sm text-muted-foreground">
              {t("empty")}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {query.data?.items.map((s) => (
              <article
                key={s.id}
                className="group flex min-h-52 flex-col gap-4 rounded-2xl border border-primary/10 bg-card p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    className="text-lg leading-snug font-semibold tracking-tight decoration-primary/40 underline-offset-4 group-hover:text-primary group-hover:underline"
                    href={`/surveys/${s.id}`}
                  >
                    {s.title}
                  </Link>
                  <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                    {t(`statuses.${s.status}` as Parameters<typeof t>[0])}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{t("responseCount", { count: s.response_count })}</p>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{s.description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/surveys/${s.id}`}><Eye aria-hidden />{t("viewDetails")}</Link>
                    </Button>
                    {canEdit && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/surveys/${s.id}/edit`}><Pencil aria-hidden />{t("edit")}</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 aria-hidden />{t("deleteSurvey")}
                        </Button>
                      </>
                    )}
                </div>
              </article>
            ))}
          </div>
          {!!query.data?.total && (
            <div className="flex items-center gap-3">
              <Button disabled={page === 1} variant="outline" onClick={() => setPage((p) => p - 1)}>
                {t("previous")}
              </Button>
              <span>
                {page} / {Math.ceil(query.data.total / 20)}
              </span>
              <Button
                variant="outline"
                disabled={page * 20 >= query.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </div>
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && t("deleteConfirm", { title: deleteTarget.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancelAction")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => deleteTarget && void removeSurvey(deleteTarget)}
            >
              {deleting ? t("deleting") : t("deleteSurvey")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
