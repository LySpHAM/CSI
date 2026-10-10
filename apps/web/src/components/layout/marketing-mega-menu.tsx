"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Smartphone, UsersRound } from "lucide-react";

type MenuGroupCopy = {
  title: string;
  item1: string;
  item2: string;
  item3: string;
  item4: string;
  item5?: string;
};

type Copy = {
  button: string;
  closeMenu: string;
  people: MenuGroupCopy;
  customer: MenuGroupCopy;
};

const columns = [
  {
    key: "people",
    icon: UsersRound,
    iconClass: "bg-gradient-to-br from-emerald-400 to-teal-500",
    href: ["/employee-surveys", "/employee-surveys", "/employee-surveys", "/employee-surveys", "/employee-surveys"],
  },
  {
    key: "customer",
    icon: Smartphone,
    iconClass: "bg-gradient-to-br from-amber-300 to-orange-400",
    href: ["/customer-surveys", "/customer-surveys", "/customer-surveys", "/customer-surveys", "/customer-surveys"],
  },
] as const;

export function MarketingMegaMenu({ copy }: { copy: Copy }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function keepOpen() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setOpen(true);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }

  return (
    <div className="hidden md:block" onMouseEnter={keepOpen} onMouseLeave={closeSoon}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="products-mega-menu"
        onClick={keepOpen}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-[#103e32]"
      >
        {copy.button}
        <ChevronDown
          aria-hidden
          className={`size-4 text-cyan-600 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label={copy.closeMenu}
            className="fixed inset-x-0 bottom-0 top-[4.5rem] z-40 cursor-default bg-slate-950/10"
            onClick={() => setOpen(false)}
          />
          <div
            id="products-mega-menu"
            className="fixed inset-x-0 top-[4.5rem] z-50 border-y border-slate-200 bg-white shadow-xl"
            onMouseEnter={keepOpen}
            onMouseLeave={closeSoon}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
          >
            <div className="mx-auto grid max-w-5xl divide-y divide-slate-100 px-4 sm:px-6 md:grid-cols-2 md:divide-x md:divide-y-0 lg:px-8">
              {columns.map(({ key, icon: Icon, iconClass, href }) => {
                const group = copy[key];
                const items = [group.item1, group.item2, group.item3, group.item4, group.item5]
                  .filter((label): label is string => Boolean(label))
                  .map((label, index) => ({ label, href: href[index] ?? "/#features" }));
                return (
                  <section key={key} className="px-5 py-6 md:px-6 md:py-7">
                    <h2 className="flex min-h-10 items-center gap-3 text-base font-bold tracking-tight text-slate-900">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm ${iconClass}`}
                      >
                        <Icon aria-hidden className="size-5" />
                      </span>
                      {group.title}
                    </h2>
                    <ul className="mt-5 space-y-1">
                      {items.map(({ label, href: itemHref }) => (
                        <li key={label}>
                          <Link
                            href={itemHref}
                            onClick={() => setOpen(false)}
                            className="group flex min-h-10 items-start gap-2.5 rounded-lg px-2 py-2 text-[13px] font-semibold leading-5 text-slate-600 transition-colors hover:bg-emerald-50 hover:text-[#103e32]"
                          >
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300 group-hover:bg-emerald-500" />
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
