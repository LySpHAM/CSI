"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorized, useSession } from "@/lib/api/hooks";
import { WelcomeHome } from "./welcome-home";

export function HomeRoute() {
  const t = useTranslations("app");
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (isUnauthorized(session.error)) router.replace("/login?next=%2Fhome");
  }, [router, session.error]);

  if (!session.data) {
    return (
      <div className="mx-auto w-full max-w-[90rem] flex-1 space-y-4 px-4 py-10 sm:px-6 lg:px-8" aria-busy="true">
        <span className="sr-only" role="status">{t("loadingSession")}</span>
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-5 w-[34rem] max-w-full" />
        <Skeleton className="mt-8 h-72 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <WelcomeHome />
    </div>
  );
}
