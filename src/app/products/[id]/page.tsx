"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TestFixtureBadge } from "@/components/catalog/CatalogProductCard";
import { OrderOptions } from "@/components/catalog/OrderOptions";
import { ProductVisual } from "@/components/catalog/ProductVisual";
import { PageLoader } from "@/components/PageLoader";
import { Alert } from "@/components/ui/States";
import { ApiError, errorMessage } from "@/lib/api";
import { AVAILABILITY_LABEL, CatalogProduct, catalogApi, labeller } from "@/lib/catalog";
import { formatPrice } from "@/lib/product";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
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
  const ingredients = product.ingredients_inci
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <Link href="/products" className="text-xs uppercase tracking-[0.2em] text-brand-600 hover:text-brand-900">
        ← All products
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <ProductVisual
          category={product.category}
          categoryLabel={category(product.category)}
          size="detail"
          image={product.images?.[0]}
          productName={product.name}
        />
        <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{category(product.category)}</span>
          {product.is_test_fixture && <TestFixtureBadge />}
        </div>
        <h1 className="display mt-4 text-4xl sm:text-5xl">{product.name}</h1>
        <p className="mt-2 text-brand-600">
          {[product.brand, product.size_label].filter(Boolean).join(" · ") || "Brand and size not provided"}
        </p>

        {product.is_test_fixture && (
          <Alert tone="warning" className="mt-6">
            This is a test fixture used for development. It is not a real product and cannot be bought. Requests for it are test data only.
          </Alert>
        )}

        <section className="card mt-8 grid gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3" aria-label="Price and availability">
          <div>
            <p className="text-xs text-brand-500">Price</p>
            <p className="display mt-1 text-3xl">
              {product.price_amount != null ? formatPrice(product.price_amount, product.currency) : "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-500">Availability</p>
            <p className="mt-2 font-semibold text-brand-900">
              {AVAILABILITY_LABEL[product.availability] ?? product.availability}
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-500">Sold by</p>
            <p className="mt-2 font-semibold text-brand-900">
              {product.retailer.name}
              {product.retailer.city ? `, ${product.retailer.city}` : ""}
            </p>
          </div>
        </section>
        </div>
      </div>

      <div className="max-w-4xl">
      {product.description && <p className="mt-10 leading-relaxed text-brand-700">{product.description}</p>}

      {(product.usage_instructions || product.warnings) && (
        <section className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="Use and precautions">
          {product.usage_instructions && (
            <div className="card">
              <h2 className="eyebrow">How to use</h2>
              <p className="mt-3 whitespace-pre-line text-brand-800">{product.usage_instructions}</p>
            </div>
          )}
          {product.warnings && (
            <div className="card">
              <h2 className="eyebrow">Warnings and precautions</h2>
              <p className="mt-3 whitespace-pre-line text-brand-800">{product.warnings}</p>
            </div>
          )}
        </section>
      )}

      <section className="mt-10" aria-labelledby="listed-for">
        <h2 id="listed-for" className="eyebrow">
          Listed for
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="card">
            <dt className="text-xs text-brand-500">Skin types</dt>
            <dd className="mt-2 text-brand-900">
              {!product.skin_types || product.skin_types.length === 0
                ? "Not provided"
                : product.skin_types.includes("all")
                  ? "All skin types"
                  : product.skin_types.map(skin).join(", ")}
            </dd>
          </div>
          <div className="card">
            <dt className="text-xs text-brand-500">Concerns</dt>
            <dd className="mt-2 text-brand-900">
              {!product.concerns || product.concerns.length === 0
                ? "Not provided"
                : product.concerns.map(concern).join(", ")}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-brand-500">
          These are the uses the retailer lists for this product. They are not medical claims, and no result is promised.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="ingredients-heading">
        <h2 id="ingredients-heading" className="eyebrow">
          Ingredients
        </h2>
        {ingredients && ingredients.length > 0 ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-brand-700">{ingredients.join(", ")}</p>
            <p className="mt-3 text-xs text-brand-500">
              As provided by the retailer. Always check the label on the product you receive.
            </p>
          </>
        ) : (
          <Alert tone="warning" className="mt-4">
            No ingredient list was provided for this product. Treat its ingredients as unknown and check the label
            before use. It is never recommended to customers who ask to avoid an ingredient.
          </Alert>
        )}
      </section>

      <OrderOptions product={product} />

      {product.reviewed_at && (
        <p className="mt-6 text-xs text-brand-500">
          Listing reviewed {new Date(product.reviewed_at).toLocaleDateString(undefined, { dateStyle: "long" })}.
        </p>
      )}
      </div>
    </div>
  );
}
