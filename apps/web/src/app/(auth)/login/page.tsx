import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const t = await getTranslations("auth");
  const requestedNext = (await searchParams).next;
  const next =
    typeof requestedNext === "string" && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : undefined;
  const createAccountHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";
  return (
    <Card className="p-2 sm:p-4">
      <CardHeader>
        <CardTitle className="text-2xl">
          <h1>{t("loginTitle")}</h1>
        </CardTitle>
        <CardDescription>{t("loginSubtitle", { appName: APP_NAME })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
        <p className="-mt-2 text-center text-sm text-muted-foreground">
          {t("noAccount")} {" "}
          <Link href={createAccountHref} className="font-semibold text-primary hover:underline">
            {t("createAccount")}
          </Link>
        </p>
        <div className="flex justify-end text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
