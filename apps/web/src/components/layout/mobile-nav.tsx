"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/config";

type NavLink = { href: string; label: string };
type NavGroup = { label: string; links: NavLink[] };
type NavAction = NavLink & { variant: "default" | "outline" };

export function MobileNav({
  links,
  groups = [],
  actions = [],
  className,
}: {
  links: NavLink[];
  groups?: NavGroup[];
  actions?: NavAction[];
  className?: string;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label={t("openMenu")}>
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm">
        <SheetHeader>
          <SheetTitle>{APP_NAME}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium hover:bg-accent"
            >
              {link.label}
            </Link>
          ))}
          {groups.length > 0 && (
            <div className="mt-2 space-y-1 border-t pt-3">
              {groups.map((group) => (
                <details key={group.label} className="group rounded-lg">
                  <summary className="cursor-pointer list-none rounded-lg px-3 py-3 text-sm font-semibold hover:bg-accent [&::-webkit-details-marker]:hidden">
                    {group.label}
                  </summary>
                  <ul className="space-y-1 pb-2 pl-3">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </nav>
        {actions.length > 0 && (
          <div className="mt-auto flex flex-col gap-2 p-4">
            {actions.map((action) => (
              <Button key={action.href} variant={action.variant} size="lg" asChild>
                <Link href={action.href} onClick={() => setOpen(false)}>
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
