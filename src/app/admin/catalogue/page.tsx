"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CatalogStatus, CatalogueNav, formatWhen, ReadinessList } from "@/components/admin/catalogue/shared";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/States";
import { AdminCategory, adminCatalogApi, adminError, AdminIdentity, Overview, STATUS_LABEL } from "@/lib/adminCatalog";

function Tile({ label, value, href, tone }: { label: string; value: number; href?: string; tone?: "warn" }) {
  const body = (
    <>
      <span className={`block text-2xl font-semibold ${tone === "warn" && value > 0 ? "text-amber-900" : "text-brand-900"}`}>
        {value}
      </span>
      <span className="text-xs text-brand-600">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="card block hover:bg-brand-50">
      {body}
    </Link>
  ) : (
    <div className="card">{body}</div>
  );
}

function CatalogueList() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [items, setItems] = useState<AdminIdentity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState({ q: "", status: "", category: "" });

  useEffect(() => {
    adminCatalogApi.overview().then(setOverview).catch(() => setOverview(null));
    adminCatalogApi.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    adminCatalogApi
      .identities(query)
      .then(setItems)
      .catch((err) => setError(adminError(err, "Could not load the products.")));
  }, [query]);
  useEffect(load, [load]);

  const label = (code: string) => categories.find((c) => c.code === code)?.label ?? code.replace(/_/g, " ");

  return (
    <div className="container-page space-y-6">
      <h1 className="display text-4xl">Catalogue</h1>
      <CatalogueNav />

      {overview && (
        <section aria-label="Overview" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Shop listings customers can see" value={overview.publicly_visible_listings} />
          <Tile label="Waiting for review" value={overview.review_queue} href="/admin/catalogue/review" tone="warn" />
          <Tile label="Drafts" value={overview.identities_by_status.DRAFT ?? 0} href="/admin/catalogue/review" />
          <Tile label="Sources to verify" value={overview.unverified_facts} tone="warn" />
          <Tile label="Products without photos" value={overview.products_without_images} tone="warn" />
          <Tile label="Listings with unconfirmed price" value={overview.listings_price_unconfirmed} tone="warn" />
          <Tile label="New order requests" value={overview.order_requests_by_status.RECEIVED ?? 0} href="/admin" tone="warn" />
          <Tile label="Rejected products" value={overview.identities_by_status.REJECTED ?? 0} />
        </section>
      )}

      <form
        className="card grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery({ q: q.trim(), status, category });
        }}
      >
        <label className="block text-sm">
          <span className="label">Search</span>
          <input className="input" value={q} maxLength={80} onChange={(e) => setQ(e.target.value)} placeholder="Name, brand, variant, barcode or code" />
        </label>
        <label className="block text-sm">
          <span className="label">Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="label">Category</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Any</option>
            {categories
              .filter((c) => c.parent_code === null)
              .map((g) => (
                <optgroup key={g.code} label={g.label}>
                  <option value={g.code}>All {g.label.toLowerCase()}</option>
                  {categories
                    .filter((c) => c.parent_code === g.code)
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
        </label>
        <button type="submit" className="btn-primary self-end">
          Search
        </button>
      </form>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items === null ? (
        <Spinner label="Loading products" />
      ) : items.length === 0 ? (
        <EmptyState
          title={query.q || query.status || query.category ? "No products match." : "No products yet."}
          body="Products come from this admin area or from the CSV importer, always as drafts."
          action={{ href: "/admin/catalogue/new", label: "Add a product" }}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Products</caption>
            <thead>
              <tr className="border-b border-brand-100 text-left text-brand-500">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Publishing</th>
                <th className="py-2 pr-4">Photos / shops</th>
                <th className="py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-brand-50 align-top">
                  <td className="py-2 pr-4">
                    <Link href={`/admin/catalogue/${i.id}`} className="font-semibold text-brand-900 underline underline-offset-4">
                      {i.name}
                    </Link>
                    <span className="block text-xs text-brand-500">
                      {[i.brand, i.variant, i.size_label].filter(Boolean).join(" · ") || "No brand or size yet"}
                    </span>
                    {i.is_test_fixture && <span className="text-xs text-amber-800">test fixture</span>}
                  </td>
                  <td className="py-2 pr-4">{i.category_path.map(label).join(" › ")}</td>
                  <td className="py-2 pr-4">
                    <CatalogStatus status={i.status} />
                  </td>
                  <td className="py-2 pr-4">
                    <ReadinessList readiness={i.readiness} compact />
                  </td>
                  <td className="py-2 pr-4">
                    {i.images.length} / {i.listing_ids.length}
                  </td>
                  <td className="py-2 text-xs">{formatWhen(i.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminCataloguePage() {
  return (
    <RequireAuth adminOnly>
      <CatalogueList />
    </RequireAuth>
  );
}
