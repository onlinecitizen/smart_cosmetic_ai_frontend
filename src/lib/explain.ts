import type { Formula, FormulationRule } from "./api";
import { metricLabel, toScore } from "./diagnostic";

/**
 * Explains each ingredient in a formula using only data the backend records:
 * the rule that added it (formula.rules_used), that rule's condition, and the
 * customer's stored score. Nothing here is inferred or invented - if a piece
 * of evidence is missing, the corresponding field is null.
 */
export interface IngredientExplanation {
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  volumeMl: number;
  percentage: number;
  maxPercentage: number;
  withinLimit: boolean;
  ruleCode: string | null;
  /** e.g. "Your hydration score is 32, below the rule threshold of 50." */
  because: string | null;
  /** The rule's own stored reason text. */
  ruleReason: string | null;
  /** True if the rule was changed after this formula was generated. */
  ruleChangedSince: boolean;
}

type RuleRef = Formula["rules_used"][number];

export function explainFormula(formula: Formula, rules: FormulationRule[]): IngredientExplanation[] {
  const rulesById = new Map(rules.map((r) => [r.id, r]));
  const refsByIngredient = new Map<string, RuleRef>(formula.rules_used.map((ref) => [ref.ingredient_code, ref]));

  return formula.items.map((item) => {
    const ref = refsByIngredient.get(item.ingredient_code);
    const rule = ref?.rule_id ? rulesById.get(ref.rule_id) : undefined;

    let because: string | null = null;
    if (rule && formula.diagnostic) {
      const metric = rule.condition_metric as keyof NonNullable<Formula["diagnostic"]>;
      const raw = formula.diagnostic[metric];
      if (typeof raw === "number") {
        const direction = rule.condition_operator === "lt" ? "below" : "above";
        because =
          `Your ${metricLabel(rule.condition_metric).toLowerCase()} score is ${toScore(raw)}, ` +
          `${direction} the rule threshold of ${toScore(rule.condition_threshold)}.`;
      }
    }

    return {
      ingredientId: item.ingredient_id,
      ingredientCode: item.ingredient_code,
      ingredientName: item.ingredient_name,
      volumeMl: item.volume_ml,
      percentage: item.percentage,
      maxPercentage: item.max_allowed_percentage,
      withinLimit: item.percentage <= item.max_allowed_percentage,
      ruleCode: ref?.rule_code ?? null,
      because,
      ruleReason: rule?.reason ?? null,
      ruleChangedSince: Boolean(rule && ref?.rule_version != null && rule.version !== ref.rule_version),
    };
  });
}
