"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronIcon, LotusMark, UserIcon } from "@/components/ui/Icons";
import { useAuth } from "@/lib/auth";
import { LanguageSwitch, useT } from "@/lib/i18n";

/** Where the (experimental) photo assessment starts: straight in if signed in, else sign up first. */
export function useAssessmentHref() {
  const { user } = useAuth();
  return user ? "/analyze" : "/register?next=/analyze";
}

export function AssessmentLink({ className = "btn-primary", children }: { className?: string; children: React.ReactNode }) {
  const href = useAssessmentHref();
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  // Account menu: close on outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function onLogout() {
    await logout();
    setOpen(false);
    setMenu(false);
    router.push("/");
  }

  // Desktop links, as in the design reference (Home, Features, Products, ...). The
  // reference's "Contact" is left out until real contact details exist.
  const desktop: { href: string; label: string; match?: false }[] = [
    { href: "/", label: t("nav.home") },
    { href: "/#features", label: "Features", match: false },
    { href: "/products", label: t("nav.products") },
    { href: "/saved", label: "Saved" },
  ];
  const accountMenu = user
    ? [
        { href: "/studio", label: t("nav.studio") },
        { href: "/assistant", label: t("nav.assistant") },
        { href: "/order-requests", label: t("nav.requests") },
      ]
    : [];

  const main = [
    { href: "/studio", label: t("nav.studio") },
    { href: "/products", label: t("nav.products") },
    { href: "/assistant", label: t("nav.assistant") },
    ...(user ? [{ href: "/order-requests", label: t("nav.requests") }] : []),
  ];

  // Secondary account links. The serum and photo pages are an experimental
  // demonstration; they stay reachable for existing users but are not promoted.
  const accountLinks = user
    ? [
        { href: "/account", label: t("nav.account") },
        { href: "/partner", label: "Partner portal" },
        { href: "/dashboard", label: "My formulas (demo)" },
        { href: "/orders", label: "Serum orders (demo)" },
        ...(user.role === "admin" ? [{ href: "/admin", label: t("nav.admin") }] : []),
      ]
    : [];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled || open ? "border-b border-rose-line/70 bg-white/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:min-h-[88px] lg:px-12">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Smart Cosmetic AI home">
          <LotusMark className="h-9 w-12 shrink-0 text-rose-700 lg:h-11 lg:w-14" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[19px] font-bold text-ink lg:text-[24px]">Smart Cosmetic AI</span>
            <span className="block truncate text-[11px] text-brand-600 lg:text-[13px]">Beauty Smarter. For You.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t("nav.main")}>
          {desktop.map((s) => {
            const active = s.match !== false && isActive(pathname, s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[15px] font-medium transition ${
                  active ? "bg-rose-100 text-rose-950" : "text-ink hover:bg-rose-50"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitch />
          {!loading && !user && (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full border border-rose-line bg-white px-5 py-2.5 text-[14px] font-medium text-ink shadow-rose transition hover:border-rose-300"
            >
              <UserIcon className="h-5 w-5 text-rose-700" />
              {t("nav.login")}
            </Link>
          )}
          {!loading && user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenu((m) => !m)}
                aria-expanded={menu}
                aria-controls="account-menu"
                className="flex items-center gap-2 rounded-full border border-rose-line bg-white px-5 py-2.5 text-[14px] font-medium text-ink shadow-rose transition hover:border-rose-300"
              >
                <UserIcon className="h-5 w-5 text-rose-700" />
                {t("nav.account")}
                <ChevronIcon className={`h-4 w-4 transition ${menu ? "-rotate-90" : "rotate-90"}`} />
              </button>
              {menu && (
                <div
                  id="account-menu"
                  className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-rose-line bg-white py-2 shadow-lift"
                >
                  {[...accountMenu, ...accountLinks].map((l) => (
                    <Link key={l.href} href={l.href} className="block px-4 py-2.5 text-sm text-brand-700 hover:bg-rose-50 hover:text-ink">
                      {l.label}
                    </Link>
                  ))}
                  <button onClick={onLogout} className="block w-full border-t border-rose-line/70 px-4 py-2.5 text-left text-sm text-brand-700 hover:bg-rose-50">
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rose-line bg-white shadow-rose lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t("nav.menu.close") : t("nav.menu.open")}
        >
          <span className="relative block h-3 w-4">
            <span className={`absolute left-0 h-px w-4 bg-ink transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 h-px w-4 bg-ink transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-rose-line/70 px-4 pb-8 pt-2 lg:hidden">
          <nav className="flex flex-col" aria-label={t("nav.more")}>
            {[{ href: "/", label: t("nav.home") }, ...main, { href: "/saved", label: "Saved" }].map((s) => (
              <Link
                key={s.href}
                href={s.href}
                aria-current={isActive(pathname, s.href) ? "page" : undefined}
                className="display border-b border-rose-line/70 py-4 text-2xl"
              >
                {s.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-4 text-base text-brand-600">
            {accountLinks.map((l) => (
              <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
            <Link href="/privacy">Privacy notice</Link>
            {user ? <button onClick={onLogout}>{t("nav.logout")}</button> : <Link href="/login">{t("nav.login")}</Link>}
          </div>
          <LanguageSwitch className="mt-6" />
          <Link href="/studio" className="btn-studio mt-6 w-full">
            {t("nav.cta")}
          </Link>
        </div>
      )}
    </header>
  );
}
