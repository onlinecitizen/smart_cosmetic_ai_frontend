// Display-only product/pricing configuration.
//
// The backend order model has no price fields and v1 takes no online
// payment (see CLAUDE.md "PAYMENTS"), so pricing lives here in one place and
// is shown to the customer as the published price. Change it here only.
export const PRODUCT = {
  name: "Personalized Serum",
  sizeLabel: "30 mL",
  currency: "TZS",
  formulationPrice: 40_000,
  packagingPrice: 5_000,
  maxQuantity: 5,
} as const;

export const UNIT_PRICE = PRODUCT.formulationPrice + PRODUCT.packagingPrice;

export function formatPrice(amount: number): string {
  return `${PRODUCT.currency} ${amount.toLocaleString("en-US")}`;
}

export function firstName(fullName: string | undefined | null): string {
  return (fullName || "").trim().split(/\s+/)[0] || "";
}

// Customer-facing names for backend order statuses.
export const ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Received",
  VALIDATED: "Confirmed",
  SENT_TO_LAB: "Sent to laboratory",
  PROCESSING: "Being formulated",
  READY: "Ready",
  DISPATCHED: "On its way",
  COMPLETED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Could not be completed",
};

export const ORDER_TIMELINE = ["VALIDATED", "SENT_TO_LAB", "PROCESSING", "READY", "DISPATCHED", "COMPLETED"];

// The ingredient catalog seeded by the backend (backend/app/seed.py). Used
// only on public pages where the visitor is not signed in and the
// authenticated /api/v1/ingredients endpoint cannot be called.
export const SEEDED_INGREDIENTS = [
  { code: "HYALURONIC_ACID", name: "Hyaluronic Acid", description: "Humectant used to increase hydration." },
  {
    code: "CENTELLA_ASIATICA",
    name: "Centella Asiatica Extract",
    description: "Soothing extract used to reduce visible redness.",
  },
  { code: "NIACINAMIDE", name: "Niacinamide", description: "Used to help visibly refine pore appearance." },
  { code: "CERAMIDE_COMPLEX", name: "Ceramide Complex", description: "Supports skin barrier function." },
];

// A real reading produced by the backend's development climate provider
// (MockClimateProvider) for this region, shown as a labelled example.
export const EXAMPLE_CLIMATE = {
  region: "Dar es Salaam, Tanzania",
  temperature_c: 23.1,
  humidity: 0.9,
  uv_index: 6.1,
};
