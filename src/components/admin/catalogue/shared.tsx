"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { StatusBadge } from "@/components/ui/States";
import { Readiness, STATUS_LABEL, STATUS_TONE } from "@/lib/adminCatalog";

const NAV = [
  { href: "/admin/catalogue", label: "Products" },
  { href: "/admin/catalogue/review", label: "Review queue" },
  { href: "/admin/catalogue/new", label: "New product" },
  { href: "/admin/intake", label: "Import documents" },
  { href: "/admin/catalogue/categories", label: "Categories" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/assistant", label: "Assistant" },
  { href: "/admin", label: "Orders, audit and other admin" },
];

export function CatalogueNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Catalogue administration" className="flex flex-wrap gap-2 border-b border-brand-100 pb-2">
      {NAV.map((n) => {
        const active = n.href === "/admin/catalogue" ? pathname === n.href : pathname?.startsWith(n.href) && n.href !== "/admin";
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm ${active ? "bg-brand-600 text-white" : "text-brand-600 hover:bg-brand-50"}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CatalogStatus({ status }: { status: string }) {
  return <StatusBadge label={STATUS_LABEL[status] ?? status} tone={STATUS_TONE[status] ?? "neutral"} />;
}

/** Blockers (why it can't be published) and warnings, in plain sentences. */
export function ReadinessList({ readiness, compact = false }: { readiness: Readiness | null; compact?: boolean }) {
  if (!readiness) return null;
  const blockers = readiness.blockers.filter((b) => b.code !== "already_published");
  if (compact) {
    if (blockers.length) return <span className="text-xs text-red-700">{blockers.length} to fix before publishing</span>;
    return <span className="text-xs text-emerald-800">Ready to publish</span>;
  }
  return (
    <div className="space-y-3 text-sm">
      {blockers.length > 0 ? (
        <div>
          <p className="font-semibold text-red-800">Can’t be published yet:</p>
          <ul className="ml-5 list-disc text-red-800">
            {blockers.map((b, i) => (
              <li key={`${b.code}-${b.field}-${i}`}>{b.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        readiness.blockers.length === 0 && <p className="font-semibold text-emerald-800">Ready to publish.</p>
      )}
      {readiness.warnings.length > 0 && (
        <div>
          <p className="font-semibold text-amber-900">Worth checking:</p>
          <ul className="ml-5 list-disc text-amber-900">
            {readiness.warnings.map((w, i) => (
              <li key={`${w.code}-${w.field}-${i}`}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Warns before leaving the page (reload, close tab) while there are unsaved edits. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

export function formatWhen(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString();
}
