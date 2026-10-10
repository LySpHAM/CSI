import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeRoute } from "@/components/home/home-route";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.nav");
  return { title: t("home") };
}

export default function SignedInHomePage() {
  return <HomeRoute />;
}
