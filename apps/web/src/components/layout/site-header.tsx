import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { MarketingMegaMenu } from "./marketing-mega-menu";
import { MobileNav } from "./mobile-nav";
import { SiteAccountActions } from "./site-account-actions";
import { SiteMySurveysLink } from "./site-my-surveys-link";

export async function SiteHeader() {
  const t = await getTranslations("marketing.nav");
  const m = await getTranslations("marketing.nav.mega");
  const copy = {
    button: m("button"),
    closeMenu: m("closeMenu"),
    people: {
      title: m("people.title"),
      item1: m("people.item1"),
      item2: m("people.item2"),
      item3: m("people.item3"),
      item4: m("people.item4"),
      item5: m("people.item5"),
    },
    customer: {
      title: m("customer.title"),
      item1: m("customer.item1"),
      item2: m("customer.item2"),
      item3: m("customer.item3"),
      item4: m("customer.item4"),
      item5: m("customer.item5"),
    },
  };
  const links = [
    { href: "/", label: t("home") },
    { href: "/#features", label: t("features") },
    { href: "/backend", label: "Backend API" },
    { href: "/pricing", label: t("pricing") },
    { href: "/docs", label: m("resources") },
    { href: "/#contact", label: t("contact") },
  ];
  const mobileGroups = [
    {
      label: m("people.title"),
      links: [
        { label: m("people.item1"), href: "/employee-surveys" },
        { label: m("people.item2"), href: "/employee-surveys" },
        { label: m("people.item3"), href: "/employee-surveys" },
        { label: m("people.item4"), href: "/employee-surveys" },
        { label: m("people.item5"), href: "/employee-surveys" },
      ],
    },
    {
      label: m("customer.title"),
      links: [
        { label: m("customer.item1"), href: "/customer-surveys" },
        { label: m("customer.item2"), href: "/customer-surveys" },
        { label: m("customer.item3"), href: "/customer-surveys" },
        { label: m("customer.item4"), href: "/customer-surveys" },
        { label: m("customer.item5"), href: "/customer-surveys" },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-900 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo className="text-[#103e32]" />
        <nav aria-label={t("label")} className="hidden flex-1 items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-[#103e32]"
          >
            {t("home")}
          </Link>
          <SiteMySurveysLink />
          <MarketingMegaMenu copy={copy} />
          {links.slice(2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-[#103e32]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <SiteAccountActions />
        </div>
        <MobileNav
          className="ml-auto text-slate-700 hover:bg-emerald-50 hover:text-[#103e32] md:hidden"
          links={links}
          groups={mobileGroups}
          actions={[
            { href: "/login", label: t("login"), variant: "outline" },
            { href: "/register", label: t("signupFree"), variant: "default" },
          ]}
        />
      </div>
    </header>
  );
}

