"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const SECTIONS = [
  { href: "/#how", label: "How It Works" },
  { href: "/#technology", label: "Technology" },
  { href: "/#formula", label: "Formula" },
  { href: "/#about", label: "About" },
];

/** Where "Start assessment" should go: straight in if signed in, else sign up first. */
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

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const assessmentHref = useAssessmentHref();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

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

  const accountLinks = user
    ? [
        { href: "/dashboard", label: "My Formulas" },
        { href: "/orders", label: "Orders" },
        ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-500 ${
        scrolled || open ? "border-b border-brand-200/60 bg-brand-50/80 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Smart Cosmetic AI home">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-gold-500/60">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-gold-300 to-gold-700" />
          </span>
          <span className="text-[13px] font-semibold tracking-[0.3em] text-brand-900">SMART COSMETIC AI</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="text-[13px] text-brand-600 transition hover:text-brand-900">
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          {!loading &&
            accountLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-[12px] text-brand-500 transition hover:text-brand-900">
                {l.label}
              </Link>
            ))}
          {!loading && user && (
            <button onClick={onLogout} className="text-[12px] text-brand-500 transition hover:text-brand-900">
              Log out
            </button>
          )}
          {!loading && !user && (
            <Link href="/login" className="text-[12px] text-brand-500 transition hover:text-brand-900">
              Log in
            </Link>
          )}
          <Link href={assessmentHref} className="btn-primary !px-5 !py-2.5">
            Start Assessment
          </Link>
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-full border border-brand-200 bg-white/60 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span className="relative block h-3 w-4">
            <span
              className={`absolute left-0 h-px w-4 bg-brand-900 transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`}
            />
            <span
              className={`absolute left-0 h-px w-4 bg-brand-900 transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`}
            />
          </span>
        </button>
      </div>

      {open && (
        <div className="border-t border-brand-200/60 px-4 pb-8 pt-4 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {SECTIONS.map((s) => (
              <Link key={s.href} href={s.href} className="display border-b border-brand-200/60 py-4 text-2xl" onClick={() => setOpen(false)}>
                {s.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-brand-500">
            {accountLinks.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
            {user ? <button onClick={onLogout}>Log out</button> : <Link href="/login">Log in</Link>}
          </div>
          <Link href={assessmentHref} className="btn-primary mt-6 w-full">
            Start Assessment
          </Link>
        </div>
      )}
    </header>
  );
}
