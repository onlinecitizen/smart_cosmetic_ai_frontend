"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { Reveal } from "@/components/Reveal";
import { Bottle } from "@/components/Bottle";
import { PageLoader } from "@/components/PageLoader";
import { Alert, DemoBadge, ErrorState } from "@/components/ui/States";
import { useAuth } from "@/lib/auth";
import { isDemoProvider, METRICS, toScore } from "@/lib/diagnostic";
import { explainFormula } from "@/lib/explain";
import { useFormula } from "@/lib/useFormula";
import { useProduct } from "@/lib/useProduct";
import { firstName, formatPrice } from "@/lib/product";
import { SITE_STATUS } from "@/lib/siteStatus";

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

function FormulaContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { formula, ingredients, rules, error, reload } = useFormula(id);
  const { product, failed: productFailed, reload: reloadProduct } = useProduct();

  if (!formula) return <PageLoader message={error} onRetry={reload} />;

  const valid = formula.status === "VALIDATED";
  const name = firstName(user?.full_name);
  const explanations = explainFormula(formula, rules);
  const hasPlaceholderLimits = formula.items.some((i) => ingredients[i.ingredient_id]?.is_development_placeholder);
  const demoScores = isDemoProvider(formula.diagnostic?.provider);

  return (
    <div className="overflow-x-hidden">
      {/* Header */}
      <section className="relative overflow-hidden bg-brand-900 text-brand-50">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(200,169,110,0.32)_0%,transparent_60%)]"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-14 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">Personalized formula</p>
          <div className="my-6 h-[280px] w-[160px] sm:my-8 sm:h-[460px] sm:w-[260px]">
            <Bottle name={name} code={formula.formula_code} className="h-full w-full" />
          </div>
          <h1 className="font-mono text-2xl tracking-[0.2em] text-brand-50 sm:text-3xl">{formula.formula_code}</h1>
          <p className="mt-3 text-sm text-brand-300">
            {name ? `Generated for ${name} · ` : ""}
            {fmtDate(formula.created_at)}
          </p>
          {demoScores && (
            <p className="mt-4">
              <DemoBadge>Built from demonstration scores</DemoBadge>
            </p>
          )}
        </div>
      </section>

      {!valid && (
        <section className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
          <div className="card space-y-4">
            <h2 className="display text-3xl">This formula didn’t pass our checks</h2>
            <p className="text-sm text-brand-600">It can’t be ordered. Start a new assessment to create another.</p>
            {formula.validation_errors.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-brand-600">
                {formula.validation_errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
            <Link href="/analyze" className="btn-primary">
              New assessment
            </Link>
          </div>
        </section>
      )}

      {/* Ingredients and why */}
      {explanations.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-24" aria-labelledby="actives-heading">
          <Reveal className="mb-8 flex flex-col justify-between gap-3 md:mb-12 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-4">Inside your formula</p>
              <h2 id="actives-heading" className="display text-4xl sm:text-5xl">
                What’s added, and why
              </h2>
            </div>
            <p className="text-sm text-brand-600">
              In a {formula.base_emulsion_ml} mL base · total batch {formula.batch_volume_ml} mL
            </p>
          </Reveal>

          {hasPlaceholderLimits && SITE_STATUS.ingredientLimitsArePlaceholders && (
            <Alert tone="warning" className="mb-6">
              Concentration limits are development values awaiting review by a qualified formulator.
            </Alert>
          )}

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {explanations.map((x) => {
              const description = ingredients[x.ingredientId]?.description;
              return (
                <li key={x.ingredientId} className="card flex h-full flex-col">
                  <h3 className="display text-2xl">{x.ingredientName}</h3>
                  {description && <p className="mt-2 text-sm leading-relaxed text-brand-600">{description}</p>}

                  <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-brand-200/70 pt-4">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">Volume</dt>
                      <dd className="display text-2xl">{x.volumeMl} mL</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">
                        Concentration
                      </dt>
                      <dd className="display text-2xl">{x.percentage.toFixed(1)}%</dd>
                    </div>
                  </dl>
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-100"
                    role="img"
                    aria-label={`${x.percentage.toFixed(1)}% of a ${x.maxPercentage}% limit`}
                  >
                    <div
                      className={`h-full rounded-full ${x.withinLimit ? "bg-gradient-to-r from-gold-300 to-gold-700" : "bg-red-600"}`}
                      style={{ width: `${Math.min(100, (x.percentage / x.maxPercentage) * 100)}%` }}
                    />
                  </div>
                  <p className={`mt-2 text-xs ${x.withinLimit ? "text-brand-500" : "font-semibold text-red-700"}`}>
                    {x.withinLimit ? `Within the ${x.maxPercentage}% limit` : `Exceeds the ${x.maxPercentage}% limit`}
                  </p>

                  <div className="mt-5 flex-1 rounded-2xl bg-brand-100/70 p-4 text-sm leading-relaxed text-brand-700">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">Why it’s added</p>
                    <p className="mt-2">
                      {x.because ?? (x.ruleCode ? `Added by formulation rule ${x.ruleCode}.` : "Reason not recorded.")}
                    </p>
                    {x.ruleCode && (
                      <p className="mt-2 text-xs text-brand-500">
                        Rule {x.ruleCode}
                        {x.ruleChangedSince && " · this rule has been updated since your formula was generated"}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Based on */}
      {formula.diagnostic && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 md:pb-24" aria-labelledby="based-on-heading">
          <div className="card">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="based-on-heading" className="eyebrow">
                Based on
              </h2>
              {demoScores && <DemoBadge>Demonstration scores</DemoBadge>}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {METRICS.map((m) => (
                <div key={m.key}>
                  <dt className="text-xs text-brand-500">{m.label}</dt>
                  <dd className="display text-2xl">{toScore(formula.diagnostic![m.key])}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-brand-500">
              Scores out of 100 · confidence {Math.round(formula.diagnostic.confidence * 100)}% · model{" "}
              {formula.diagnostic.model_version} · formula v{formula.formula_version}
              {formula.climate &&
                ` · weather recorded for ${formula.climate.region}${
                  SITE_STATUS.climateChangesFormula ? "" : " (not used to choose ingredients)"
                }`}
            </p>
          </div>
        </section>
      )}

      {/* Product */}
      {valid && (
        <section className="border-t border-brand-200/70 bg-brand-100/60" aria-labelledby="product-heading">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-24">
            <div className="mx-auto hidden h-[380px] w-[220px] md:block">
              <Bottle name={name} code={formula.formula_code} float={false} className="h-full w-full" />
            </div>
            <div>
              <p className="eyebrow">The product</p>
              <h2 id="product-heading" className="display mt-4 text-4xl sm:text-5xl">
                {product?.name ?? "Personalized Serum"}
              </h2>
              <p className="mt-2 text-brand-600">
                {product?.size_label ? `${product.size_label} · ` : ""}
                <span className="font-mono text-sm">{formula.formula_code}</span>
              </p>
              {productFailed ? (
                <ErrorState
                  className="mt-6"
                  message="We couldn’t load the price. You can still continue; the total is calculated when you order."
                  onRetry={reloadProduct}
                />
              ) : (
                <>
                  <p className="display mt-6 text-4xl">{product ? formatPrice(product.unit_price, product.currency) : "…"}</p>
                  <dl className="mt-5 space-y-3 border-t border-brand-200 pt-5 text-sm">
                    {product?.price_breakdown.map((c) => (
                      <div key={c.code} className="flex justify-between gap-4 text-brand-600">
                        <dt>{c.label}</dt>
                        <dd>{formatPrice(c.amount, product.currency)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              <Link href={`/formula/${formula.id}/checkout`} className="btn-primary mt-8 w-full sm:w-auto">
                Continue to order request
              </Link>
              <p className="mt-3 text-xs text-brand-500">No payment is taken online.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function FormulaPage() {
  return (
    <RequireAuth>
      <FormulaContent />
    </RequireAuth>
  );
}
