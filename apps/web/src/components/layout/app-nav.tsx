"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_INITIALS, APP_NAME } from "@/lib/config";

export type AppNavItem = { href: string; label: string; icon: LucideIcon };

/** Thanh điều hướng chính khu quản trị, đánh dấu mục đang mở (aria-current). */
export function AppNav({ items, label }: { items: AppNavItem[]; label: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // Mục có đường dẫn dài nhất khớp được coi là đang mở (ví dụ /surveys/new thắng /surveys).
  const active = items
    .filter((item) => isActive(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside className="group/sidebar fixed inset-y-0 left-0 z-50 hidden w-16 flex-col border-r border-primary/10 bg-card/95 shadow-[8px_0_30px_-24px_oklch(0.3_0.06_151/0.35)] backdrop-blur-xl transition-[width] duration-200 hover:w-64 focus-within:w-64 lg:flex">
      <div className="flex h-16 shrink-0 items-center overflow-hidden border-b border-border/70 px-3">
        <Link href="/" aria-label={APP_NAME} className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">{APP_INITIALS}</span>
          <span className="w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-[width,opacity] duration-200 group-hover/sidebar:w-40 group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-40 group-focus-within/sidebar:opacity-100">{APP_NAME}</span>
        </Link>
      </div>
      <nav aria-label={label} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {items.map(({ href, label: itemLabel, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={href === active ? "page" : undefined}
                title={itemLabel}
                className={cn(
                  "flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  "aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[width,opacity] duration-200 group-hover/sidebar:w-44 group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-44 group-focus-within/sidebar:opacity-100">
                  {itemLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
