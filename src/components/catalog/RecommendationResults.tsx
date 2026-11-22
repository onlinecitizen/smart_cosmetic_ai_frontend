import Link from "next/link";
import { forwardRef } from "react";
import { CatalogProductCard, TestFixtureBadge } from "@/components/catalog/CatalogProductCard";
import { Alert } from "@/components/ui/States";
import { RecommendationResult } from "@/lib/catalog";

/**
 * Explainable results of rules-v1: every recommendation shows why it was
 * matched and what is unknown; every exclusion shows why.
 */
export const RecommendationResults = forwardRef<
  HTMLHeadingElement,
  { result: RecommendationResult; categoryLabel: (code: string) => string; onEdit: () => void }
>(function RecommendationResults({ result, categoryLabel, onEdit }, headingRef) {
  const { recommended, excluded, not_matched_count, evaluated_count } = result;

  return (
    <section aria-labelledby="results-heading" className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 id="results-heading" ref={headingRef} tabIndex={-1} className="display text-3xl focus:outline-none sm:text-4xl">
            {recommended.length > 0
              ? `${recommended.length} product${recommended.length === 1 ? "" : "s"} matched your answers`
              : "No products matched your answers"}
          </h2>
          <p className="mt-2 text-sm text-brand-600">
            We checked {evaluated_count} listed product{evaluated_count === 1 ? "" : "s"}
            {excluded.length > 0 && `, set aside ${excluded.length}`}
            {not_matched_count > 0 && `, and ${not_matched_count} didn’t match your concerns`}.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onEdit}>
          Change my answers
        </button>
      </div>

      {evaluated_count === 0 ? (
        <Alert tone="info">
          No partner products are listed yet, so there is nothing to recommend. Products appear once a partner
          retailer’s listings have been reviewed.
        </Alert>
      ) : recommended.length === 0 ? (
        <Alert tone="info">
          Try choosing fewer concerns, picking “Not sure” for skin type, or removing a category filter.{" "}
          <Link href="/products" className="font-semibold underline underline-offset-4">
            Browse all products
          </Link>
        </Alert>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommended.map((r) => (
            <li key={r.product.id}>
              <CatalogProductCard product={r.product} categoryLabel={categoryLabel} headingLevel="h3">
                <div className="space-y-3 rounded-2xl bg-brand-100/70 p-4 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">Why it matched</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-800">
                      {r.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                  {r.cautions.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">Good to know</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-700">
                        {r.cautions.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CatalogProductCard>
            </li>
          ))}
        </ol>
      )}

      {excluded.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-semibold text-brand-900">
            Why {excluded.length} product{excluded.length === 1 ? " was" : "s were"} not shown
          </summary>
          <ul className="mt-4 space-y-4 text-sm">
            {excluded.map((e) => (
              <li key={e.product.id} className="border-t border-brand-200/70 pt-4">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-brand-900">
                  {e.product.name}
                  {e.product.is_test_fixture && <TestFixtureBadge />}
                </p>
                <p className="text-xs text-brand-500">Sold by {e.product.retailer_name}</p>
                <ul className="mt-1 list-disc pl-5 text-brand-700">
                  {e.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="rounded-2xl border border-brand-200 bg-white/60 p-5 text-sm text-brand-700">
        <h3 className="font-semibold text-brand-900">How these results were chosen</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {result.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-brand-500">Method: {result.method}</p>
      </div>
    </section>
  );
});
