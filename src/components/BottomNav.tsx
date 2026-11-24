"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { MessageKey, useT } from "@/lib/i18n";

/** Phone-only tab bar (hidden from lg up, and inside the full-screen assessment). */
export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useT();

  if (pathname.startsWith("/studio/assessment") || pathname.startsWith("/admin")) return null;

  const tabs: { href: string; label: MessageKey; icon: React.ReactNode; studio?: boolean }[] = [
    { href: "/", label: "nav.home", icon: <path d="M4 11.5 12 5l8 6.5V20H4z" /> },
    { href: "/products", label: "nav.products", icon: <path d="M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0" /> },
    { href: "/studio", label: "nav.studio", studio: true, icon: <path d="M12 4l1.8 4.6L18 10l-4.2 1.4L12 16l-1.8-4.6L6 10l4.2-1.4z" /> },
    { href: "/order-requests", label: "nav.requests", icon: <path d="M7 4h10v16H7zM10 9h4M10 13h4" /> },
    {
      href: user ? "/account" : "/login",
      label: user ? "nav.account" : "nav.login",
      icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0" />,
    },
  ];

  return (
    <nav
      aria-label={t("nav.tabs")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-peach-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgba(120,72,48,0.35)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold transition ${
                  active ? "text-teal-700" : "text-brand-500 hover:text-brand-800"
                }`}
              >
                {active && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-teal-700" />}
                <svg
                  viewBox="0 0 24 24"
                  className="h-[22px] w-[22px]"
                  fill={active && !tab.studio ? "currentColor" : "none"}
                  fillOpacity={active ? 0.14 : 0}
                  stroke="currentColor"
                  strokeWidth={active ? 1.9 : 1.6}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  aria-hidden
                >
                  {tab.icon}
                </svg>
                {t(tab.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
