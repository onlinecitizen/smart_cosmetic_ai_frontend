"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PartnerNav({ shopId, shopName }: { shopId: string; shopName?: string }) {
  const pathname = usePathname();
  const base = `/partner/${shopId}`;
  const items = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/products/new`, label: "Add a product" },
    { href: `${base}/imports`, label: "Import documents" },
    { href: "/partner", label: "All my shops", exact: true },
  ];
  return (
    <div className="space-y-2">
      {shopName && <p className="text-xs uppercase tracking-[0.18em] text-brand-500">Partner portal · {shopName}</p>}
      <nav aria-label="Partner portal" className="flex flex-wrap gap-2 border-b border-brand-100 pb-2">
        {items.map((n) => {
          const active = n.exact ? pathname === n.href : pathname?.startsWith(n.href);
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
    </div>
  );
}
