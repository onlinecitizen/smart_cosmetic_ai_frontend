"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/States";
import {
  AssistantConfig,
  AssistantLang,
  BeautyProfile,
  LabelOption,
  parseBudget,
  parseIngredients,
  toggle,
  ui,
} from "@/lib/assistant";

function Checks({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: LabelOption[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.code} className="flex items-center gap-1.5 rounded-full border border-brand-100 px-3 py-1 text-sm">
            <input type="checkbox" checked={value.includes(o.code)} onChange={() => onChange(toggle(value, o.code))} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Review and edit the structured needs. Only controlled values can be chosen. */
export function ProfileEditor({
  lang,
  profile,
  options,
  onSave,
  onCancel,
}: {
  lang: AssistantLang;
  profile: BeautyProfile;
  options: AssistantConfig["options"];
  onSave: (p: BeautyProfile) => Promise<void>;
  onCancel: () => void;
}) {
  const [p, setP] = useState<BeautyProfile>(profile);
  const [ingredients, setIngredients] = useState(profile.avoid_ingredients.join(", "));
  const [budget, setBudget] = useState(profile.budget_max != null ? String(profile.budget_max) : "");
  const [currency, setCurrency] = useState(profile.budget_currency ?? options.currencies[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<BeautyProfile>) => setP((old) => ({ ...old, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = budget.trim() ? parseBudget(budget) : null;
    if (budget.trim() && amount == null) {
      setError(lang === "sw" ? "Andika bajeti kama namba kamili." : "Enter the budget as a whole number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({
        ...p,
        avoid_ingredients: parseIngredients(ingredients),
        budget_max: amount,
        budget_currency: amount != null ? currency : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label={ui(lang, "yourNeeds")}>
      <Checks legend={ui(lang, "focus")} options={options.focus} value={p.focus} onChange={(v) => set({ focus: v })} />
      <label className="block">
        <span className="label">{ui(lang, "skinType")}</span>
        <select className="input" value={p.skin_type ?? ""} onChange={(e) => set({ skin_type: e.target.value || null })}>
          <option value="">{ui(lang, "notStated")}</option>
          {options.skin_types.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <Checks
        legend={ui(lang, "skinConcerns")}
        options={options.skin_concerns}
        value={p.skin_concerns}
        onChange={(v) => set({ skin_concerns: v })}
      />
      <Checks legend={ui(lang, "hairTypes")} options={options.hair_types} value={p.hair_types} onChange={(v) => set({ hair_types: v })} />
      <Checks
        legend={ui(lang, "hairConcerns")}
        options={options.hair_concerns}
        value={p.hair_concerns}
        onChange={(v) => set({ hair_concerns: v })}
      />
      <fieldset className="space-y-2">
        <legend className="label">{ui(lang, "categories")}</legend>
        {options.categories.map((g) => (
          <div key={g.code}>
            <p className="text-xs font-semibold text-brand-600">{g.label}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {g.children.map((c) => (
                <label key={c.code} className="flex items-center gap-1.5 rounded-full border border-brand-100 px-3 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={p.categories.includes(c.code)}
                    onChange={() => set({ categories: toggle(p.categories, c.code) })}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      <Checks
        legend={ui(lang, "avoidGroups")}
        options={options.avoid_groups}
        value={p.avoid_groups}
        onChange={(v) => set({ avoid_groups: v })}
      />
      <label className="block">
        <span className="label">{ui(lang, "avoidIngredients")}</span>
        <input className="input" value={ingredients} onChange={(e) => setIngredients(e.target.value)} maxLength={700} />
      </label>
      <div className="space-y-1 text-sm">
        {(
          [
            ["require_sulfate_free", "sulfateFree"],
            ["require_silicone_free", "siliconeFree"],
            ["in_stock_only", "inStock"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input type="checkbox" checked={p[key]} onChange={(e) => set({ [key]: e.target.checked })} />
            {ui(lang, label)}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="block">
          <span className="label">{ui(lang, "budget")}</span>
          <input
            className="input w-40"
            inputMode="numeric"
            placeholder={ui(lang, "noLimit")}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">{ui(lang, "currency")}</span>
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {options.currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {ui(lang, "save")}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          {ui(lang, "cancel")}
        </button>
      </div>
    </form>
  );
}
