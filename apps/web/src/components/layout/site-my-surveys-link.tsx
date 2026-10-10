"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/api/hooks";

export function SiteMySurveysLink() {
  const t = useTranslations("marketing.nav.mega");
  const session = useSession();

  if (!session.data) return null;

  return (
    <Link
      href="/surveys"
      className="mr-1 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-[#103e32] shadow-sm transition-colors hover:bg-emerald-100"
    >
      <span
        aria-hidden
        className="grid size-4 place-items-center rounded-sm bg-emerald-600 text-[9px] leading-none text-white"
      >
        ■
      </span>
      {t("mySurveys")}
    </Link>
  );
}
