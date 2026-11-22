"use client";

import { useRef, useState } from "react";
import { RecommendationResults } from "@/components/catalog/RecommendationResults";
import { Alert, ErrorState, Spinner } from "@/components/ui/States";
import { errorMessage } from "@/lib/api";
import {
  avoidListError,
  catalogApi,
  labeller,
  parseAvoidList,
  RecommendationResult,
  SkinTypeAnswer,
} from "@/lib/catalog";
import { useCatalogOptions } from "@/lib/useCatalogOptions";

function toggle(list: string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

export default function RecommendationsPage() {
  const { options, error: optionsError, reload } = useCatalogOptions();
  const [skinType, setSkinType] = useState<SkinTypeAnswer>("not_sure");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [avoidGroups, setAvoidGroups] = useState<string[]>([]);
  const [avoidText, setAvoidText] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const formTop = useRef<HTMLHeadingElement>(null);

  const avoidTerms = parseAvoidList(avoidText);
  const avoidError = avoidListError(avoidTerms);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (avoidError) return;
    setBusy(true);
    setError(null);
    try {
      const r = await catalogApi.recommend({
        skin_type: skinType,
        concerns,
        avoid_groups: avoidGroups,
        avoid_ingredients: avoidTerms,
        category: category || null,
      });
      setResult(r);
      // Move focus to the results so keyboard and screen-reader users land there.
      requestAnimationFrame(() => resultsHeading.current?.focus());
    } catch (err) {
      setError(errorMessage(err, "We couldn’t get recommendations. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (optionsError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <ErrorState message={optionsError} onRetry={reload} />
      </div>
    );
  }
  if (!options) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner label="Loading questions" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <p className="eyebrow">Partner products</p>
      <h1 ref={formTop} tabIndex={-1} className="display mt-4 text-4xl focus:outline-none sm:text-5xl">
        Find products for your skin
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-600">
        Answer a few questions and we’ll match them against the listed products using fixed, explained rules. Your
        answers aren’t saved. This is cosmetic product matching, not medical advice.
      </p>

      <form onSubmit={submit} className="mt-10 grid gap-8 lg:grid-cols-2">
        <fieldset className="card">
          <legend className="px-1 font-semibold text-brand-900">Your skin type</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[...options.skin_types, { code: "not_sure", label: "Not sure" }].map((o) => (
              <label key={o.code} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-brand-200 bg-white/70 px-3 text-sm has-[:checked]:border-brand-900">
                <input
                  type="radio"
                  name="skin_type"
                  value={o.code}
                  checked={skinType === o.code}
                  onChange={() => setSkinType(o.code as SkinTypeAnswer)}
                  className="accent-brand-900"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="card">
          <legend className="px-1 font-semibold text-brand-900">What would you like help with?</legend>
          <p className="mt-1 text-xs text-brand-500">Choose any that apply.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {options.concerns.map((o) => (
              <label key={o.code} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-brand-200 bg-white/70 px-3 text-sm has-[:checked]:border-brand-900">
                <input
                  type="checkbox"
                  checked={concerns.includes(o.code)}
                  onChange={() => setConcerns((c) => toggle(c, o.code))}
                  className="accent-brand-900"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="card">
          <legend className="px-1 font-semibold text-brand-900">Ingredients to avoid</legend>
          <p className="mt-1 text-xs text-brand-500">
            For allergies, sensitivities or preferences. Products without an ingredient list are left out when you
            choose anything here.
          </p>
          <div className="mt-3 space-y-2">
            {options.avoid_groups.map((g) => (
              <label key={g.code} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-brand-200 bg-white/70 px-3 py-2.5 text-sm has-[:checked]:border-brand-900">
                <input
                  type="checkbox"
                  checked={avoidGroups.includes(g.code)}
                  onChange={() => setAvoidGroups((a) => toggle(a, g.code))}
                  className="mt-0.5 accent-brand-900"
                />
                <span>
                  {g.label}
                  <span className="block text-xs text-brand-500">Matches: {g.terms.join(", ")}</span>
                </span>
              </label>
            ))}
          </div>
          <label htmlFor="avoid-ingredients" className="label mt-5">
            Other ingredients (optional)
          </label>
          <textarea
            id="avoid-ingredients"
            className="input min-h-[5rem]"
            placeholder="e.g. niacinamide, shea butter"
            value={avoidText}
            onChange={(e) => setAvoidText(e.target.value)}
            aria-describedby="avoid-hint avoid-error"
            aria-invalid={avoidError ? true : undefined}
          />
          <p id="avoid-hint" className="mt-1.5 text-xs text-brand-500">
            Separate with commas. Matched against each product’s listed ingredient names.
          </p>
          <p id="avoid-error" className="field-error" role={avoidError ? "alert" : undefined}>
            {avoidError}
          </p>
        </fieldset>

        <fieldset className="card flex flex-col">
          <legend className="px-1 font-semibold text-brand-900">Product type (optional)</legend>
          <label htmlFor="category" className="sr-only">
            Product type
          </label>
          <select id="category" className="input mt-3" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Any product type</option>
            {options.categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="mt-auto pt-8">
            {error && (
              <Alert tone="error" className="mb-4">
                {error}
              </Alert>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy || Boolean(avoidError)}>
              {busy ? "Matching..." : "Show matching products"}
            </button>
          </div>
        </fieldset>
      </form>

      {result && (
        <div className="mt-16">
          <RecommendationResults
            ref={resultsHeading}
            result={result}
            categoryLabel={labeller(options.categories)}
            onEdit={() => {
              formTop.current?.focus();
              formTop.current?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      )}
    </div>
  );
}
