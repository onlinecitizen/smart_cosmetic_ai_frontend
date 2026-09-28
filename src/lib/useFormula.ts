"use client";

import { useEffect, useState } from "react";
import { api, Formula, Ingredient } from "./api";

export interface FormulaDetails {
  formula: Formula | null;
  ingredients: Record<string, Ingredient>;
  error: string | null;
}

/** Loads a formula plus the ingredient catalog so items can show real names. */
export function useFormula(formulaId: string | null | undefined): FormulaDetails {
  const [formula, setFormula] = useState<Formula | null>(null);
  const [ingredients, setIngredients] = useState<Record<string, Ingredient>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formulaId) return;
    let cancelled = false;
    api
      .get<Formula>(`/api/v1/formulas/${formulaId}`)
      .then((f) => !cancelled && setFormula(f))
      .catch(() => !cancelled && setError("We couldn’t load this formula."));
    api
      .get<Ingredient[]>("/api/v1/ingredients")
      .then((list) => !cancelled && setIngredients(Object.fromEntries(list.map((i) => [i.id, i]))))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [formulaId]);

  return { formula, ingredients, error };
}

export function batchVolume(formula: Formula): number {
  return Math.round((formula.base_emulsion_ml + formula.items.reduce((sum, i) => sum + i.volume_ml, 0)) * 10) / 10;
}
