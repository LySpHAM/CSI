"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/api/hooks";
import { UserMenu } from "./user-menu";

export function SiteAccountActions() {
  const t = useTranslations("marketing.nav");
  const session = useSession();

  if (session.data) return <UserMenu session={session.data} showName />;

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" className="text-slate-700 hover:bg-emerald-50 hover:text-[#103e32]" asChild>
        <Link href="/login">{t("login")}</Link>
      </Button>
      <Button className="bg-[#103e32] text-white hover:bg-[#185847]" asChild>
        <Link href="/register">{t("signupFree")}</Link>
      </Button>
    </div>
  );
}
