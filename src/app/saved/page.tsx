"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductTile } from "@/components/catalog/ProductTile";
import { Spinner } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import { CatalogProduct, catalogApi, groupOf, labeller } from "@/lib/catalog";
import { useSaved } from "@/lib/saved";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

/** Products the visitor hearted on this device (lib/saved.ts). */
export default function SavedPage() {
  const { ids, remove } = useSaved();
  const { options } = useCatalogOptions();
  const [items, setItems] = useState<CatalogProduct[] | null>(null);
  const [failed, setFailed] = useState(0);
  const key = ids.join(",");

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(",") : [];
    Promise.all(
      list.map((id) =>
        catalogApi.get(id).then(
          (p) => ({ id, p }),
          (err) => ({ id, p: null, gone: err instanceof ApiError && err.status === 404 })
        )
      )
    ).then((results) => {
      if (cancelled) return;
      // Products that were removed or archived drop out of the saved list.
      results.forEach((r) => "gone" in r && r.gone && remove(r.id));
      setItems(results.flatMap((r) => (r.p ? [r.p] : [])));
      setFailed(results.filter((r) => !r.p && !("gone" in r && r.gone)).length);
    });
    return () => {
      cancelled = true;
    };
  }, [key, remove]);

  const label = labeller(options?.categories);
  const groupLabel = (code: string) => groupOf(options?.category_tree, code)?.label ?? label(code);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-3 sm:px-6 sm:pt-6">
      <h1 className="display text-[1.9rem] leading-tight sm:text-4xl">Saved</h1>
      <p className="mt-1 text-sm text-brand-600">Products you’ve hearted. They’re kept on this device only.</p>

      <div className="mt-5" aria-live="polite">
        {ids.length === 0 ? (
          <div className="card space-y-3">
            <p className="font-semibold text-brand-900">Nothing saved yet.</p>
            <p className="text-sm text-brand-600">Tap the heart on any product to keep it here.</p>
            <Link href="/products" className="btn-studio">
              Explore products
            </Link>
          </div>
        ) : items === null ? (
          <Spinner label="Loading saved products" />
        ) : (
          <>
            {failed > 0 && (
              <p className="mb-3 text-sm text-brand-600" role="status">
                {failed} saved product{failed === 1 ? "" : "s"} couldn’t be loaded right now.
              </p>
            )}
            <ul className="grid grid-cols-2 gap-3 max-[299px]:grid-cols-1 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <li key={p.id}>
                  <ProductTile product={p} groupLabel={groupLabel(p.category)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
