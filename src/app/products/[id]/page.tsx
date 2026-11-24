"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { OrderOptions } from "@/components/catalog/OrderOptions";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { SaveButton } from "@/components/catalog/ProductTile";
import { PageLoader } from "@/components/PageLoader";
import { BackIcon } from "@/components/ui/Icons";
import { Alert } from "@/components/ui/States";
import { ApiError, errorMessage } from "@/lib/api";
import { AVAILABILITY_LABEL, CatalogProduct, catalogApi, groupOf, labeller } from "@/lib/catalog";
import { formatPrice } from "@/lib/product";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

function Availability({ value }: { value: string }) {
  if (value === "in_stock") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <circle cx="8" cy="8" r="8" fill="currentColor" />
          <path d="m4.8 8.2 2.1 2.1 4.3-4.4" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {AVAILABILITY_LABEL.in_stock}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600">
      {AVAILABILITY_LABEL[value] ?? value}
    </span>
  );
}

/** A collapsible detail section: keeps the page short, nothing is hidden for good. */
function Section({ title, hint, children, open }: { title: string; hint?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-peach-200 py-1 last:border-b-0" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-[15px] font-semibold text-brand-900 [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {hint && <span className="ml-2 text-xs font-normal text-brand-500">{hint}</span>}
        </span>
        <span aria-hidden className="text-lg leading-none text-brand-500 transition group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="pb-4 text-sm leading-relaxed text-brand-700">{children}</div>
    </details>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { options } = useCatalogOptions();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setProduct(await catalogApi.get(id));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "This product isn’t available. It may have been removed or is awaiting review."
          : errorMessage(err, "We couldn’t load this product.")
      );
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!product) return <PageLoader message={error} onRetry={load} />;

  const category = labeller(options?.categories);
  const skin = labeller(options?.skin_types);
  const concern = labeller(options?.concerns);
  const subLabel = groupOf(options?.category_tree, product.category)?.children?.find((c) => c.code === product.category)?.label;
  const ingredients = product.ingredients_inci
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // The first paragraph is the product summary; the rest (e.g. the demo-listing note) goes under "About this listing".
  const [summary, ...more] = (product.description ?? "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/products");
  }

  return (
    <div className="mx-auto max-w-6xl pb-12 sm:px-6 sm:pt-6">
      <div className="grid lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="lg:sticky lg:top-20">
          <ProductGallery
            images={product.images}
            productName={product.name}
            fallbackLabel={subLabel ?? category(product.category)}
            overlay={
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <button type="button" onClick={back} className="icon-btn" aria-label="Back">
                  <BackIcon />
                </button>
                <SaveButton productId={product.id} productName={product.name} />
              </div>
            }
          />
        </div>

        <div className="relative z-10 -mt-6 rounded-t-[2rem] bg-white px-5 pb-6 pt-6 shadow-[0_-12px_30px_-18px_rgba(120,72,48,0.35)] sm:mt-6 sm:rounded-3xl sm:border sm:border-peach-200 sm:p-7 sm:shadow-tile lg:mt-0">
          {product.brand && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">{product.brand}</p>}
          <h1 className="display mt-1 text-[2rem] leading-[1.1] sm:text-4xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className={product.price_amount != null ? "text-2xl font-bold text-brand-900" : "text-sm text-brand-500"}>
              {product.price_amount != null ? formatPrice(product.price_amount, product.currency) : "Price not listed"}
            </p>
            <Availability value={product.availability} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="tag !text-xs">{subLabel ?? category(product.category)}</span>
            {product.size_label && (
              <span className="inline-flex items-center rounded-full border border-peach-200 px-2.5 py-0.5 text-xs text-brand-700">
                Size {product.size_label}
              </span>
            )}
            {product.is_test_fixture && <span className="badge-demo !px-2.5 !py-0.5 !text-[10px]">Test fixture</span>}
          </div>

          {summary && <p className="mt-4 text-[15px] leading-relaxed text-brand-700">{summary}</p>}

          {product.is_test_fixture && (
            <Alert tone="warning" className="mt-4 !px-4 !py-3 !text-xs">
              This is a demo listing for design review. It is not sold by a partner shop and cannot be bought. Requests for it are test data only.
            </Alert>
          )}

          <OrderOptions product={product} />

          <div className="mt-6 border-t border-peach-200 pt-1">
            {product.usage_instructions && (
              <Section title="How to use">
                <p className="whitespace-pre-line">{product.usage_instructions}</p>
              </Section>
            )}
            <Section title="Ingredients" hint={ingredients && ingredients.length > 0 ? undefined : "Not provided"}>
              {ingredients && ingredients.length > 0 ? (
                <>
                  <p>{ingredients.join(", ")}</p>
                  <p className="mt-2 text-xs text-brand-500">As provided by the retailer. Always check the label on the product you receive.</p>
                </>
              ) : (
                <Alert tone="warning">
                  No ingredient list was provided for this product. Treat its ingredients as unknown and check the label
                  before use. It is never recommended to customers who ask to avoid an ingredient.
                </Alert>
              )}
            </Section>
            {product.warnings && (
              <Section title="Warnings and precautions">
                <p className="whitespace-pre-line">{product.warnings}</p>
              </Section>
            )}
            <Section title="Listed for">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-brand-500">Skin types</dt>
                  <dd className="mt-0.5 text-brand-900">
                    {!product.skin_types || product.skin_types.length === 0
                      ? "Not provided"
                      : product.skin_types.includes("all")
                        ? "All skin types"
                        : product.skin_types.map(skin).join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-500">Concerns</dt>
                  <dd className="mt-0.5 text-brand-900">
                    {!product.concerns || product.concerns.length === 0 ? "Not provided" : product.concerns.map(concern).join(", ")}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-brand-500">
                These are the uses the retailer lists for this product. They are not medical claims, and no result is promised.
              </p>
            </Section>
            <Section title="About this listing">
              {more.map((p) => (
                <p key={p} className="mb-2">
                  {p}
                </p>
              ))}
              <p>
                Sold by {product.retailer.name}
                {product.retailer.city ? `, ${product.retailer.city}` : ""}.
              </p>
              {product.reviewed_at && (
                <p className="mt-1 text-xs text-brand-500">
                  Listing reviewed {new Date(product.reviewed_at).toLocaleDateString(undefined, { dateStyle: "long" })}.
                </p>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
