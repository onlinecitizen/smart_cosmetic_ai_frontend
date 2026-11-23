"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CatalogProductCard } from "@/components/catalog/CatalogProductCard";
import { ErrorState, Spinner } from "@/components/ui/States";
import { errorMessage } from "@/lib/api";
import { CatalogProduct, catalogApi, labeller } from "@/lib/catalog";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

const PAGE_SIZE = 24;

export default function ProductsPage() {
  const { options } = useCatalogOptions();
  const categoryLabel = labeller(options?.categories);

  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [items, setItems] = useState<CatalogProduct[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // Category/search can arrive in the URL (homepage category tiles). Read them
  // once on the client before the first request.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("category");
    const q = params.get("q");
    if (c) setCategory(c.slice(0, 32));
    if (q) {
      setQuery(q.slice(0, 80));
      setSubmittedQuery(q.slice(0, 80).trim());
    }
    setReady(true);
  }, []);

  const load = useCallback(
    async (offset: number) => {
      setError(null);
      if (offset === 0) setItems(null);
      try {
        const page = await catalogApi.list({ category, q: submittedQuery, limit: PAGE_SIZE, offset });
        setItems((prev) => (offset === 0 || !prev ? page.items : [...prev, ...page.items]));
        setTotal(page.total);
      } catch (err) {
        setError(errorMessage(err, "We couldn’t load products."));
      }
    },
    [category, submittedQuery]
  );

  useEffect(() => {
    if (ready) load(0);
  }, [load, ready]);

  async function loadMore() {
    setLoadingMore(true);
    await load(items?.length ?? 0);
    setLoadingMore(false);
  }

  const filtered = Boolean(category || submittedQuery);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Partner products · Zanzibar</p>
          <h1 className="display mt-4 text-4xl sm:text-5xl">Explore products</h1>
          <p className="mt-3 max-w-xl text-sm text-brand-600">
            Products supplied by partner retailers. Each listing is reviewed before it appears here.
          </p>
        </div>
        <Link href="/studio" className="btn-studio">
          Discover my routine
        </Link>
      </div>

      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedQuery(query.trim());
        }}
      >
        <label htmlFor="product-search" className="sr-only">
          Search by product or brand
        </label>
        <input
          id="product-search"
          type="search"
          className="input sm:max-w-sm"
          placeholder="Search by product or brand"
          value={query}
          maxLength={80}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {options && (
        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Filter by category">
          {[{ code: "", label: "All" }, ...options.categories].map((c) => (
            <button
              key={c.code || "all"}
              type="button"
              aria-pressed={category === c.code}
              onClick={() => setCategory(c.code)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                category === c.code
                  ? "border-brand-900 bg-brand-900 text-brand-50"
                  : "border-brand-300 bg-white/70 text-brand-700 hover:border-brand-700"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-10" aria-live="polite">
        {error ? (
          <ErrorState message={error} onRetry={() => load(0)} />
        ) : items === null ? (
          <Spinner label="Loading products" />
        ) : items.length === 0 ? (
          <div className="card space-y-3">
            <p className="font-semibold text-brand-900">
              {filtered ? "No products match your filters." : "No partner products are listed yet."}
            </p>
            <p className="text-sm text-brand-600">
              {filtered
                ? "Try another category or search term."
                : "Products appear here once a partner retailer’s listings have been reviewed. Please check back soon."}
            </p>
            {filtered ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setCategory("");
                  setQuery("");
                  setSubmittedQuery("");
                }}
              >
                Clear filters
              </button>
            ) : (
              <Link href="/" className="btn-secondary">
                Back to home
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-brand-600">
              Showing {items.length} of {total} product{total === 1 ? "" : "s"}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <li key={p.id}>
                  <CatalogProductCard product={p} categoryLabel={categoryLabel} />
                </li>
              ))}
            </ul>
            {items.length < total && (
              <button type="button" className="btn-secondary mt-8" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
