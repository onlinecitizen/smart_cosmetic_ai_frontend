// Product names and prices come from the backend (GET /api/v1/products).
// The server is the only place prices are set and order totals calculated;
// this file only holds display helpers.
export const PRODUCT_CODE = "PERSONALIZED_SERUM_30ML";
export const MAX_QUANTITY = 5;
// Printed on the decorative bottle illustration.
export const BOTTLE_SIZE_LABEL = "30 mL";

export function formatPrice(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null || !currency) return "—";
  return `${currency} ${amount.toLocaleString("en-US")}`;
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
