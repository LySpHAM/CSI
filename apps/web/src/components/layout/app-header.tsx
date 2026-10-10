"use client";

import { useTranslations } from "next-intl";
import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  ClipboardList,
  House,
  LifeBuoy,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Tags,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission, Session } from "@/lib/api/types";
import { AppNav } from "./app-nav";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

export function AppHeader({ session }: { session: Session }) {
  const t = useTranslations("app.nav");
  const can = (p: Permission) => session.permissions.includes(p);
  // Menu chỉ hiện mục người dùng có quyền (API vẫn kiểm tra lại quyền ở mọi endpoint).
  const items = [
    { href: "/", label: t("home"), icon: House },
    can("survey:edit") && { href: "/surveys/new", label: t("createSurvey"), icon: Plus },
    { href: "/surveys", label: t("mySurveys"), icon: ClipboardList },
    { href: "/topics", label: t("topics"), icon: Tags },
    { href: "/responses", label: t("responses"), icon: MessageSquareText },
    { href: "/reports", label: t("reports"), icon: ChartNoAxesCombined },
    { href: "/tickets", label: t("tickets"), icon: LifeBuoy },
    { href: "/profile", label: t("profile"), icon: UserRound },
    can("tenant:manage") && { href: "/billing", label: t("billing"), icon: BadgeDollarSign },
    can("member:manage") && { href: "/admin", label: t("admin"), icon: ShieldCheck },
  ].filter((item): item is { href: string; label: string; icon: LucideIcon } => !!item);

  return (
    <>
      <AppNav items={items} label={t("label")} />
      <header className="sticky top-0 z-40 border-b border-primary/10 bg-card/90 shadow-[0_8px_30px_-24px_oklch(0.3_0.06_151/0.35)] backdrop-blur-xl lg:ml-16">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <MobileNav className="-ml-2 lg:hidden" links={items} />
          <Logo
            href="/"
            className="mr-2 [&>span:last-child]:hidden sm:[&>span:last-child]:inline lg:hidden"
          />
          <div className="hidden md:block">
            <WorkspaceSwitcher />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <LocaleSwitcher className="hidden 2xl:inline-flex" />
            <ThemeToggle />
            <UserMenu session={session} showName />
          </div>
        </div>
        <div className="border-t px-4 py-2 md:hidden">
          <WorkspaceSwitcher />
        </div>
      </header>
    </>
  );
}
