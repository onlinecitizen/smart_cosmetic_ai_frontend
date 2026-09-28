"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { Reveal } from "@/components/Reveal";
import { Bottle } from "@/components/Bottle";
import { PageLoader } from "@/components/PageLoader";
import { useAuth } from "@/lib/auth";
import { batchVolume, useFormula } from "@/lib/useFormula";
import { PRODUCT, UNIT_PRICE, firstName, formatPrice } from "@/lib/product";

function FormulaContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { formula, ingredients, error } = useFormula(id);

  if (!formula) return <PageLoader message={error} />;

  const valid = formula.status === "VALIDATED";
  const name = firstName(user?.full_name);
  const hasPlaceholderLimits = formula.items.some((i) => ingredients[i.ingredient_id]?.is_development_placeholder);

  return (
    <div className="overflow-x-hidden">
      {/* Reveal */}
      <section className="relative overflow-hidden bg-brand-900 text-brand-50">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(200,169,110,0.32)_0%,transparent_60%)]"
          aria-hidden
        />
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="drift absolute bottom-0 h-1 w-1 rounded-full bg-gold-300"
            style={{ left: `${8 + i * 7.5}%`, animationDelay: `${(i * 0.8) % 9}s` }}
          />
        ))}
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-20 pt-14 text-center sm:px-6">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">Personalized formula</p>
          </Reveal>
          <div className="my-8 h-[400px] w-[230px] sm:h-[500px] sm:w-[290px]">
            <Bottle name={name} code={formula.formula_code} className="h-full w-full" />
          </div>
          <Reveal delay={300}>
            <h1 className="font-mono text-2xl tracking-[0.2em] text-brand-50 sm:text-3xl">{formula.formula_code}</h1>
            <p className="mt-3 text-sm text-brand-300">
              {name ? `Formulated for ${name} · ` : ""}
              {new Date(formula.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </Reveal>
        </div>
      </section>

      {!valid && (
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="card space-y-4">
            <h2 className="display text-3xl">This formula didn’t pass our checks</h2>
            <p className="text-sm text-brand-600">It can’t be ordered. Start a new assessment to create another.</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-brand-500">
              {formula.validation_errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
            <Link href="/analyze" className="btn-primary">
              New assessment
            </Link>
          </div>
        </section>
      )}

      {/* Ingredients */}
      {formula.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <Reveal className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-5">Inside your formula</p>
              <h2 className="display text-5xl">Your actives</h2>
            </div>
            <p className="text-sm text-brand-500">
              In a base emulsion of {formula.base_emulsion_ml} mL · total batch {batchVolume(formula)} mL
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {formula.items.map((item, i) => {
              const ing = ingredients[item.ingredient_id];
              return (
                <Reveal key={item.ingredient_id} delay={i * 120}>
                  <article className="h-full rounded-3xl border border-brand-200/70 bg-white/60 p-6 shadow-soft">
                    <span className="font-display text-sm italic text-gold-700">No. {String(i + 1).padStart(2, "0")}</span>
                    <h3 className="display mt-8 text-2xl">{ing?.name ?? "Active ingredient"}</h3>
                    {ing?.description && <p className="mt-3 text-sm leading-relaxed text-brand-500">{ing.description}</p>}
                    <div className="mt-6 flex items-end justify-between border-t border-brand-200/70 pt-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400">Volume</p>
                        <p className="display text-2xl">{item.volume_ml} mL</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400">Concentration</p>
                        <p className="display text-2xl">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-brand-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-700"
                        style={{ width: `${Math.min(100, (item.percentage / item.max_allowed_percentage) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-brand-400">Within limit of {item.max_allowed_percentage}%</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-brand-400">
            Formula v{formula.formula_version} · analysis model {formula.diagnostic_model_version}
            {hasPlaceholderLimits && " · concentration limits are development placeholder values pending approval"}
          </p>
        </section>
      )}

      {/* Product */}
      {valid && (
        <section className="border-t border-brand-200/70 bg-brand-100/60">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
            <div className="mx-auto h-[380px] w-[220px]">
              <Bottle name={name} code={formula.formula_code} float={false} className="h-full w-full" />
            </div>
            <Reveal>
              <p className="eyebrow">The product</p>
              <h2 className="display mt-4 text-5xl">{PRODUCT.name}</h2>
              <p className="mt-2 text-brand-500">
                {PRODUCT.sizeLabel} · <span className="font-mono text-sm">{formula.formula_code}</span>
              </p>
              <p className="display mt-8 text-4xl">{formatPrice(UNIT_PRICE)}</p>
              <dl className="mt-6 space-y-3 border-t border-brand-200 pt-6 text-sm">
                <div className="flex justify-between text-brand-600">
                  <dt>Personalized formulation</dt>
                  <dd>{formatPrice(PRODUCT.formulationPrice)}</dd>
                </div>
                <div className="flex justify-between text-brand-600">
                  <dt>Personalized packaging</dt>
                  <dd>{formatPrice(PRODUCT.packagingPrice)}</dd>
                </div>
                <div className="flex justify-between border-t border-brand-200 pt-3 font-semibold text-brand-900">
                  <dt>Total</dt>
                  <dd>{formatPrice(UNIT_PRICE)}</dd>
                </div>
              </dl>
              <Link href={`/formula/${formula.id}/checkout`} className="btn-primary mt-10 w-full sm:w-auto">
                Continue to order
              </Link>
            </Reveal>
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
