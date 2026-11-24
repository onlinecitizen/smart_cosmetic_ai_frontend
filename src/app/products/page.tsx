"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ProductTile } from "@/components/catalog/ProductTile";
import { FilterIcon, SearchIcon } from "@/components/ui/Icons";
import { ErrorState, Spinner } from "@/components/ui/States";
import { errorMessage } from "@/lib/api";
import { CatalogProduct, Option, ProductSort, SORT_LABEL, catalogApi, groupOf, labeller } from "@/lib/catalog";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

const PAGE_SIZE = 24;

export default function ProductsPage() {
  const { options } = useCatalogOptions();
  const tree = options?.category_tree;
  const categoryLabel = labeller(options?.categories);

  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<ProductSort>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [items, setItems] = useState<CatalogProduct[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // Category/search can arrive in the URL (homepage category tiles). Read them
  // once on the client before the first request.
  const [ready, setReady] = useState(false);
  const typing = useRef<ReturnType<typeof setTimeout>>();

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
        const page = await catalogApi.list({
          category,
          q: submittedQuery,
          availability: inStockOnly ? "in_stock" : undefined,
          sort,
          limit: PAGE_SIZE,
          offset,
        });
        setItems((prev) => (offset === 0 || !prev ? page.items : [...prev, ...page.items]));
        setTotal(page.total);
      } catch (err) {
        setError(errorMessage(err, "We couldn’t load products."));
      }
    },
    [category, submittedQuery, inStockOnly, sort]
  );

  useEffect(() => {
    if (ready) load(0);
  }, [load, ready]);

  useEffect(() => () => clearTimeout(typing.current), []);

  async function loadMore() {
    setLoadingMore(true);
    await load(items?.length ?? 0);
    setLoadingMore(false);
  }

  function onQueryChange(value: string) {
    setQuery(value);
    // Search as you type, after a short pause.
    clearTimeout(typing.current);
    typing.current = setTimeout(() => setSubmittedQuery(value.trim()), 400);
  }

  function clearAll() {
    clearTimeout(typing.current);
    setCategory("");
    setQuery("");
    setSubmittedQuery("");
    setInStockOnly(false);
    setSort("name");
  }

  // Chips: the top-level groups (Skincare, Fragrance, ...). Older backends
  // without a tree fall back to the flat category list.
  const chips: Option[] = tree && tree.length > 0 ? tree.map(({ code, label }) => ({ code, label })) : options?.categories ?? [];
  // A subcategory from the URL (e.g. "serum") gets its own chip so the active filter stays visible.
  if (category && !chips.some((c) => c.code === category)) {
    const sub = groupOf(tree, category)?.children?.find((c) => c.code === category);
    chips.unshift({ code: category, label: sub?.label ?? categoryLabel(category) });
  }
  const groupLabel = (code: string) => groupOf(tree, code)?.label ?? categoryLabel(code);

  const activeFilters = (inStockOnly ? 1 : 0) + (sort !== "name" ? 1 : 0);
  const filtered = Boolean(category || submittedQuery || inStockOnly);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-3 sm:px-6 sm:pt-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="display text-[1.9rem] leading-tight sm:text-4xl">Explore products</h1>
        {items && items.length > 0 && (
          <p className="pb-1 text-xs text-brand-500">
            {total} product{total === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <form
        className="mt-3 flex items-center gap-2.5"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          clearTimeout(typing.current);
          setSubmittedQuery(query.trim());
        }}
      >
        <label htmlFor="product-search" className="sr-only">
          Search by product or brand
        </label>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-500">
            <SearchIcon />
          </span>
          <input
            id="product-search"
            type="search"
            enterKeyHint="search"
            className="w-full rounded-full border border-peach-200 bg-white py-3 pl-11 pr-4 text-[15px] text-brand-900 shadow-tile placeholder:text-brand-400/80 focus:border-gold-500 focus:outline-none focus:ring-4 focus:ring-gold-100"
            placeholder="Search products or brands"
            value={query}
            maxLength={80}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={`icon-btn relative !h-12 !w-12 ${filtersOpen || activeFilters ? "!border-teal-700 !text-teal-700" : ""}`}
          aria-expanded={filtersOpen}
          aria-controls="product-filters"
          aria-label={activeFilters ? `Filters (${activeFilters} on)` : "Filters"}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <FilterIcon />
          {activeFilters > 0 && (
            <span aria-hidden className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-teal-700 text-[9px] font-bold text-white">
              {activeFilters}
            </span>
          )}
        </button>
      </form>

      {filtersOpen && (
        <div id="product-filters" className="mt-3 grid gap-3 rounded-2xl border border-peach-200 bg-white p-4 shadow-tile sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-brand-800">
            <input
              type="checkbox"
              className="h-5 w-5 accent-teal-700"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            In stock only
          </label>
          <div className="flex items-center gap-3">
            <label htmlFor="product-sort" className="text-sm text-brand-600">
              Sort by
            </label>
            <select
              id="product-sort"
              className="flex-1 rounded-full border border-peach-200 bg-peach-50 px-4 py-2 text-sm text-brand-900 sm:max-w-xs"
              value={sort}
              onChange={(e) => setSort(e.target.value as ProductSort)}
            >
              {(Object.keys(SORT_LABEL) as ProductSort[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {options && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6" role="group" aria-label="Filter by category">
          {[{ code: "", label: "All" }, ...chips].map((c) => (
            <button
              key={c.code || "all"}
              type="button"
              aria-pressed={category === c.code}
              onClick={() => setCategory(c.code)}
              className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                category === c.code
                  ? "border-teal-700 bg-teal-700 text-white shadow-tile"
                  : "border-peach-200 bg-white text-brand-700 hover:border-brand-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4" aria-live="polite">
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
              <button type="button" className="btn-secondary" onClick={clearAll}>
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
            <ul className="grid grid-cols-2 gap-3 max-[299px]:grid-cols-1 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <li key={p.id}>
                  <ProductTile product={p} groupLabel={groupLabel(p.category)} />
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-xs text-brand-500">
              Showing {items.length} of {total}
            </p>
            {items.length < total && (
              <div className="mt-3 text-center">
                <button type="button" className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
