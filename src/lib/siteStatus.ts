/**
 * What the product really does today, shown on public pages that cannot ask
 * the backend. Each flag is tied to verified backend behaviour; update it
 * (and the copy that uses it) when that behaviour changes.
 */
export const SITE_STATUS = {
  // backend app/providers/diagnostic.py: the only working provider is
  // MockSkinDiagnosticProvider; ProductionSkinDiagnosticProvider raises.
  skinScoresAreDemo: true,
  // backend app/formulation.py FormulationEngine.run(): climate is accepted
  // but no rule reads it.
  climateChangesFormula: false,
  // backend app/seed.py: ingredient limits are marked
  // is_development_placeholder=True ("not a validated production safety limit").
  ingredientLimitsArePlaceholders: true,
  // backend: no payment integration exists in v1.
  onlinePayment: false,
} as const;

export interface TransparencyItem {
  title: string;
  body: string;
  /** "demo" items get a Demonstration badge. */
  kind: "fact" | "demo";
}

export function transparencyItems(): TransparencyItem[] {
  return [
    {
      title: "Your photo",
      body: "Your photo is analyzed on our server and then discarded. It is never saved, never made public and never sent to the laboratory.",
      kind: "fact",
    },
    SITE_STATUS.skinScoresAreDemo
      ? {
          title: "Skin scores",
          body: "Scores currently come from a demonstration model, not a validated skin analysis. Your photo is genuinely checked for brightness and sharpness, but treat the scores themselves as illustrative.",
          kind: "demo",
        }
      : {
          title: "Skin scores",
          body: "Scores are estimates from a single photo and include a confidence level.",
          kind: "fact",
        },
    {
      title: "Ingredient amounts",
      body: SITE_STATUS.ingredientLimitsArePlaceholders
        ? "Formulation rules decide which actives are added and how much. Every formula is checked against concentration limits. These limits are development values awaiting review by a qualified formulator."
        : "Formulation rules decide which actives are added and how much. Every formula is checked against concentration limits.",
      kind: SITE_STATUS.ingredientLimitsArePlaceholders ? "demo" : "fact",
    },
    {
      title: "Climate",
      body: SITE_STATUS.climateChangesFormula
        ? "Your local climate is used when building your formula."
        : "We record your city’s weather with each assessment and show it on your formula. It does not change the ingredients yet.",
      kind: "fact",
    },
    {
      title: "Ordering",
      body: SITE_STATUS.onlinePayment
        ? "Orders are paid online."
        : "Placing an order sends us a request. No payment is taken online, and each order page shows its current status.",
      kind: "fact",
    },
    {
      title: "Partner products",
      body: "Partner listings are reviewed before they appear. Product matches use fixed rules, not an AI model, and ingredient checks compare listed ingredient names, so always check the label.",
      kind: "fact",
    },
    {
      title: "Not medical advice",
      body: "This is cosmetic personalization. It does not diagnose skin conditions or replace a dermatologist.",
      kind: "fact",
    },
  ];
}
