"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => setOpen(false), [pathname]);

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
    router.push("/");
  }

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
        scrolled || open ? "border-b border-brand-200/60 bg-brand-50/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Smart Cosmetic AI home">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-gold-500/60">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-gold-300 to-gold-700" />
          </span>
          <span className="text-[13px] font-semibold tracking-[0.3em] text-brand-900">SMART COSMETIC AI</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label={t("nav.main")}>
          {main.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={isActive(pathname, s.href) ? "page" : undefined}
              className={`border-b-2 pb-1 text-[13px] transition hover:text-brand-900 ${
                isActive(pathname, s.href) ? "border-gold-500 text-brand-900" : "border-transparent text-brand-600"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <LanguageSwitch />
          {!loading && user && (
            <>
              <Link
                href="/account"
                aria-current={isActive(pathname, "/account") ? "page" : undefined}
                className="text-[12px] text-brand-600 transition hover:text-brand-900"
              >
                {t("nav.account")}
              </Link>
              <Link
                href="/partner"
                aria-current={isActive(pathname, "/partner") ? "page" : undefined}
                className="text-[12px] text-brand-600 transition hover:text-brand-900"
              >
                For shops
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="text-[12px] text-brand-600 transition hover:text-brand-900">
                  {t("nav.admin")}
                </Link>
              )}
              <button onClick={onLogout} className="text-[12px] text-brand-600 transition hover:text-brand-900">
                {t("nav.logout")}
              </button>
            </>
          )}
          {!loading && !user && (
            <Link href="/login" className="text-[12px] text-brand-600 transition hover:text-brand-900">
              {t("nav.login")}
            </Link>
          )}
          <Link href="/studio" className="btn-studio !px-5 !py-2.5">
            {t("nav.cta")}
          </Link>
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-full border border-brand-200 bg-white/60 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? t("nav.menu.close") : t("nav.menu.open")}
        >
          <span className="relative block h-3 w-4">
            <span className={`absolute left-0 h-px w-4 bg-brand-900 transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 h-px w-4 bg-brand-900 transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-brand-200/60 px-4 pb-8 pt-2 lg:hidden">
          <nav className="flex flex-col" aria-label={t("nav.more")}>
            {[{ href: "/", label: t("nav.home") }, ...main].map((s) => (
              <Link
                key={s.href}
                href={s.href}
                aria-current={isActive(pathname, s.href) ? "page" : undefined}
                className="display border-b border-brand-200/60 py-4 text-2xl"
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
