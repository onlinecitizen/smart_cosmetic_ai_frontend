"use client";

import { Bottle } from "@/components/Bottle";
import { AssessmentLink } from "@/components/Navbar";
import { ErrorState } from "@/components/ui/States";
import { formatPrice } from "@/lib/product";
import { useProduct } from "@/lib/useProduct";

/**
 * The single product the backend sells (app/products.py). Name, size and
 * price come from GET /api/v1/products/{code}; nothing is hard-coded here.
 */
export function ProductCard() {
  const { product, failed, reload } = useProduct();

  return (
    <article className="card grid gap-8 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8" aria-busy={!product && !failed}>
      <div className="mx-auto h-56 w-32 sm:h-64 sm:w-36">
        <Bottle float={false} revealed className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <p className="eyebrow">The product</p>
        {failed ? (
          <ErrorState className="mt-4" message="We couldn’t load the product price right now." onRetry={reload} />
        ) : !product ? (
          <div className="mt-4 space-y-3" aria-hidden>
            <div className="h-8 w-2/3 animate-pulse rounded-full bg-brand-100" />
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-brand-100" />
            <div className="h-10 w-1/2 animate-pulse rounded-full bg-brand-100" />
          </div>
        ) : (
          <>
            <h3 className="display mt-3 text-3xl sm:text-4xl">{product.name}</h3>
            <p className="mt-1 text-sm text-brand-500">{product.size_label} · formulated for one person</p>
            <p className="display mt-5 text-3xl">{formatPrice(product.unit_price, product.currency)}</p>
            <dl className="mt-4 space-y-2 border-t border-brand-200 pt-4 text-sm">
              {product.price_breakdown.map((c) => (
                <div key={c.code} className="flex justify-between gap-4 text-brand-600">
                  <dt>{c.label}</dt>
                  <dd className="shrink-0">{formatPrice(c.amount, product.currency)}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        <p className="mt-4 text-xs leading-relaxed text-brand-500">
          Each serum is built from your own assessment, so it can only be ordered after you complete one. No
          payment is taken online.
        </p>
        <AssessmentLink className="btn-primary mt-6 w-full sm:w-auto">Start my assessment</AssessmentLink>
      </div>
    </article>
  );
}
