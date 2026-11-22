import { describe, expect, it } from "vitest";
import type { Formula, FormulationRule } from "./api";
import { explainFormula } from "./explain";

// Shapes copied from real backend responses (app/schemas.py FormulaOut,
// FormulationRuleOut); values are test fixtures.
function rule(overrides: Partial<FormulationRule>): FormulationRule {
  return {
    id: "rule-1",
    code: "RULE_LOW_HYDRATION",
    ingredient_id: "ing-1",
    condition_metric: "hydration",
    condition_operator: "lt",
    condition_threshold: 0.5,
    recommended_volume_ml: 0.8,
    max_volume_ml: 1,
    reason: "Low hydration score -> add hydrating active.",
    status: "APPROVED",
    version: 1,
    approved_by: null,
    approved_at: null,
    ...overrides,
  };
}

function formula(overrides: Partial<Formula> = {}): Formula {
  return {
    id: "f-1",
    formula_code: "FORMULA-0001",
    base_emulsion_ml: 50,
    formula_version: 1,
    status: "VALIDATED",
    rules_used: [{ rule_id: "rule-1", rule_code: "RULE_LOW_HYDRATION", rule_version: 1, ingredient_code: "HYALURONIC_ACID" }],
    diagnostic_model_version: "mock-v1",
    validation_errors: [],
    created_at: "2026-01-01T00:00:00Z",
    items: [
      {
        ingredient_id: "ing-1",
        ingredient_code: "HYALURONIC_ACID",
        ingredient_name: "Hyaluronic Acid",
        volume_ml: 0.8,
        percentage: 1.575,
        max_allowed_percentage: 2,
      },
    ],
    batch_volume_ml: 50.8,
    climate: null,
    diagnostic: {
      provider: "mock",
      model_version: "mock-v1",
      hydration: 0.32,
      redness: 0.2,
      pore_density: 0.3,
      barrier_index: 0.6,
      confidence: 0.9,
      created_at: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  };
}

describe("explainFormula", () => {
  it("explains an ingredient from the rule that added it and the stored score", () => {
    const [x] = explainFormula(formula(), [rule({})]);
    expect(x.because).toBe("Your hydration score is 32, below the rule threshold of 50.");
    expect(x.ruleCode).toBe("RULE_LOW_HYDRATION");
    expect(x.ruleReason).toBe("Low hydration score -> add hydrating active.");
    expect(x.withinLimit).toBe(true);
    expect(x.ruleChangedSince).toBe(false);
  });

  it("uses 'above' for greater-than rules", () => {
    const f = formula({
      diagnostic: { ...formula().diagnostic!, redness: 0.71 },
      rules_used: [{ rule_id: "r2", rule_code: "RULE_HIGH_REDNESS", rule_version: 1, ingredient_code: "HYALURONIC_ACID" }],
    });
    const [x] = explainFormula(f, [rule({ id: "r2", code: "RULE_HIGH_REDNESS", condition_metric: "redness", condition_operator: "gt" })]);
    expect(x.because).toBe("Your redness score is 71, above the rule threshold of 50.");
  });

  it("flags an ingredient over its limit instead of claiming it is within", () => {
    const f = formula({
      status: "INVALID",
      items: [{ ...formula().items[0], percentage: 2.9, max_allowed_percentage: 2 }],
    });
    expect(explainFormula(f, [rule({})])[0].withinLimit).toBe(false);
  });

  it("reports when the rule changed after the formula was generated", () => {
    expect(explainFormula(formula(), [rule({ version: 2 })])[0].ruleChangedSince).toBe(true);
  });

  it("invents nothing when the rule list is unavailable", () => {
    const [x] = explainFormula(formula(), []);
    expect(x.because).toBeNull();
    expect(x.ruleReason).toBeNull();
    expect(x.ruleCode).toBe("RULE_LOW_HYDRATION");
  });

  it("handles older formulas whose snapshot has no rule_id", () => {
    const f = formula({ rules_used: [{ rule_code: "RULE_LOW_HYDRATION", ingredient_code: "HYALURONIC_ACID" }] });
    const [x] = explainFormula(f, [rule({})]);
    expect(x.because).toBeNull();
    expect(x.ruleCode).toBe("RULE_LOW_HYDRATION");
  });
});
