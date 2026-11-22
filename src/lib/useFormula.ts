"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, Formula, FormulationRule, Ingredient } from "./api";

export interface FormulaDetails {
  formula: Formula | null;
  ingredients: Record<string, Ingredient>;
  /** Formulation rules, used to explain why each ingredient was added. */
  rules: FormulationRule[];
  error: string | null;
  reload: () => void;
}

/**
 * Loads a formula plus the ingredient catalog and formulation rules. Only the
 * formula is required; if the other two fail, the page still renders without
 * descriptions/explanations rather than failing.
 */
export function useFormula(formulaId: string | null | undefined): FormulaDetails {
  const [formula, setFormula] = useState<Formula | null>(null);
  const [ingredients, setIngredients] = useState<Record<string, Ingredient>>({});
  const [rules, setRules] = useState<FormulationRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!formulaId) return;
    let cancelled = false;
    api
      .get<Formula>(`/api/v1/formulas/${formulaId}`)
      .then((f) => !cancelled && setFormula(f))
      .catch((err) => !cancelled && setError(errorMessage(err, "We couldn’t load this formula.")));
    api
      .get<Ingredient[]>("/api/v1/ingredients")
      .then((list) => !cancelled && setIngredients(Object.fromEntries(list.map((i) => [i.id, i]))))
      .catch(() => undefined);
    api
      .get<FormulationRule[]>("/api/v1/formulation-rules")
      .then((list) => !cancelled && setRules(list))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [formulaId, attempt]);

  return { formula, ingredients, rules, error, reload };
}
