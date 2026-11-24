"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CatalogStatus, formatWhen } from "@/components/admin/catalogue/shared";
import { ListingEditor } from "@/components/admin/ListingEditor";
import { PartnerNav } from "@/components/partner/PartnerNav";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState, Spinner } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import { adminError } from "@/lib/adminCatalog";
import type { AdminCatalogProduct } from "@/lib/catalog";
import {
  ActivityEntry,
  activityLabel,
  makeShopApi,
  PartnerListing,
  PRODUCT_STATUS_GROUPS,
  productGroup,
  ProductSummary,
  ShopSummary,
} from "@/lib/partner";
import { formatPrice } from "@/lib/product";

function ShopOverview() {
  const { shopId } = useParams<{ shopId: string }>();
  const shopApi = useMemo(() => makeShopApi(shopId), [shopId]);
  const [summary, setSummary] = useState<ShopSummary | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [listings, setListings] = useState<PartnerListing[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p, l, a] = await Promise.all([shopApi.summary(), shopApi.products(), shopApi.listings(), shopApi.activity()]);
      setSummary(s);
      setProducts(p);
      setListings(l);
      setActivity(a);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "This shop isn’t one of yours."
          : err instanceof ApiError && err.status === 403 && typeof err.detail === "string"
            ? err.detail
            : adminError(err, "Could not load the shop.")
      );
    }
  }, [shopApi]);
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!summary) return <Spinner label="Loading the shop" />;

  return (
    <div className="container-page space-y-6">
      <PartnerNav shopId={shopId} shopName={summary.shop.name} />
      <h1 className="display text-4xl">{summary.shop.name}</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Summary">
        {[
          ["Drafts", (summary.products_by_status.DRAFT ?? 0) + (summary.products_by_status.REJECTED ?? 0)],
          ["Waiting for approval", summary.products_by_status.PENDING_REVIEW ?? 0],
          ["Published", summary.products_by_status.PUBLISHED ?? 0],
          ["Changes waiting", summary.pending_change_requests],
        ].map(([label, n]) => (
          <div key={label as string} className="card">
            <span className="block text-2xl font-semibold text-brand-900">{n}</span>
            <span className="text-xs text-brand-600">{label}</span>
          </div>
        ))}
      </section>

      <section className="space-y-4" aria-label="Products">
        <h2 className="text-xl font-semibold text-brand-900">Products</h2>
        {products.length === 0 && (
          <p className="text-sm text-brand-600">
            No products yet. <Link href={`/partner/${shopId}/products/new`} className="underline">Add one</Link> or{" "}
            <Link href={`/partner/${shopId}/imports`} className="underline">import a document</Link>.
          </p>
        )}
        {PRODUCT_STATUS_GROUPS.map((g) => {
          const items = products.filter((p) => productGroup(p) === g.key);
          if (!items.length) return null;
          return (
            <div key={g.key} className="space-y-2">
              <h3 className={`font-semibold ${g.key === "returned" ? "text-red-800" : "text-brand-800"}`}>
                {g.label} ({items.length})
              </h3>
              <ul className="space-y-2">
                {items.map((p) => (
                  <li key={p.id} className="card flex flex-wrap items-start justify-between gap-3 text-sm">
                    <div className="space-y-1">
                      <Link href={`/partner/${shopId}/products/${p.id}`} className="font-semibold text-brand-900 underline underline-offset-4">
                        {p.name}
                      </Link>
                      <p className="text-xs text-brand-500">
                        {[p.brand, p.variant, p.size_label].filter(Boolean).join(" · ") || "No brand or size yet"}
                        {!p.owned && " · sold by your shop, managed by the platform"}
                      </p>
                      {p.feedback && (
                        <p className="text-xs text-red-800">
                          {p.feedback.action === "return" ? "Returned for correction" : "Rejected"}: “{p.feedback.reason}”
                        </p>
                      )}
                      {p.editable && p.blockers > 0 && <p className="text-xs text-amber-900">{p.blockers} detail(s) to complete before submitting</p>}
                      {p.pending_changes > 0 && <p className="text-xs text-brand-600">{p.pending_changes} proposed change(s) waiting</p>}
                    </div>
                    <div className="text-right text-xs">
                      <CatalogStatus status={p.status} />
                      {p.listing && (
                        <p className="mt-1 text-brand-600">
                          {p.listing.price_amount != null ? formatPrice(p.listing.price_amount, p.listing.currency) : "No price"} · listing{" "}
                          {p.listing.status.toLowerCase()}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="card overflow-x-auto" aria-label="Prices and stock">
        <h2 className="mb-1 font-semibold text-brand-900">Your prices and stock</h2>
        <p className="mb-2 text-xs text-brand-500">
          These belong to your shop. Changes apply straight away to your listing and are recorded with the old and new value.
        </p>
        {listings.length === 0 ? (
          <p className="text-sm text-brand-600">No shop listings yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-brand-500">
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Listing</th>
                <th className="py-2">Price and stock</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-b border-brand-50 align-top">
                  <td className="py-2 pr-3">
                    {l.name}
                    <span className="block font-mono text-xs text-brand-500">{l.sku}</span>
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {l.status.toLowerCase()}
                    <span className="block text-brand-500">price confirmed {formatWhen(l.price_confirmed_at)}</span>
                  </td>
                  <td className="py-2">
                    <ListingEditor
                      key={`${l.id}-${l.updated_at}`}
                      product={l as unknown as AdminCatalogProduct & { stock_quantity: number | null }}
                      endpoint={shopApi.offerEndpoint(l.id)}
                      onSaved={load}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card" aria-label="Recent activity">
        <h2 className="mb-2 font-semibold text-brand-900">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-brand-600">Nothing yet.</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {activity.slice(0, 40).map((a) => (
              <li key={a.id} className="border-b border-brand-50 pb-1">
                <span className="font-semibold">{activityLabel(a.action)}</span>
                <span className="text-xs text-brand-500"> · {a.actor} · {formatWhen(a.created_at)}</span>
                {typeof a.extra.reason === "string" && <span className="block text-xs text-brand-700">“{a.extra.reason}”</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export default function ShopOverviewPage() {
  return (
    <RequireAuth>
      <ShopOverview />
    </RequireAuth>
  );
}
