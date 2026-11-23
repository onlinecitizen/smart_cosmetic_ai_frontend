/**
 * Partner-product ordering (backend docs/ordering.md). Types mirror
 * backend app/ordering/schemas.py.
 *
 * A website order request is a request only: RECEIVED is not confirmed,
 * paid or delivered. No payment is taken on this website.
 */
import { ApiError, api, errorMessage } from "./api";
import type { StatusTone } from "./orderStatus";

export const MAX_QUANTITY = 10;

export interface OrderItemInput {
  product_id: string;
  quantity: number;
}

export interface WhatsAppLink {
  available: boolean;
  retailer_name: string;
  reason: string | null;
  message: string | null;
  url: string | null;
}

export type ContactMethod = "whatsapp" | "phone";
export type Fulfilment = "pickup" | "delivery";

export interface OrderRequestInput {
  client_request_id: string;
  items: OrderItemInput[];
  customer_name: string;
  customer_phone: string;
  contact_method: ContactMethod;
  fulfilment: Fulfilment;
  delivery_address: string | null;
  notes: string | null;
  consent_to_share: boolean;
}

export type OrderRequestStatus = "RECEIVED" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";

export interface OrderRequestItem {
  product_id: string;
  sku: string;
  product_name: string;
  brand: string | null;
  size_label: string | null;
  quantity: number;
  unit_price: number | null;
  currency: string | null;
  line_total: number | null;
  availability_at_request: string;
}

export interface OrderRequest {
  id: string;
  reference: string;
  status: OrderRequestStatus;
  status_label: string;
  retailer: { id: string; name: string; city: string | null };
  items: OrderRequestItem[];
  currency: string | null;
  total_amount: number | null;
  price_complete: boolean;
  customer_name: string;
  customer_phone: string;
  contact_method: ContactMethod;
  fulfilment: Fulfilment;
  delivery_address: string | null;
  notes: string | null;
  is_test_fixture: boolean;
  created_at: string;
  updated_at: string;
  next_steps: string[];
  whatsapp: WhatsAppLink;
}

export interface AdminOrderRequest extends OrderRequest {
  customer_email: string;
}

export const orderRequestApi = {
  whatsapp: (items: OrderItemInput[]) => api.post<WhatsAppLink>("/api/v1/catalog/whatsapp-message", { items }),
  create: (body: OrderRequestInput) => api.post<OrderRequest>("/api/v1/order-requests", body),
  list: () => api.get<OrderRequest[]>("/api/v1/order-requests"),
  get: (id: string) => api.get<OrderRequest>(`/api/v1/order-requests/${encodeURIComponent(id)}`),
  cancel: (id: string) => api.post<OrderRequest>(`/api/v1/order-requests/${encodeURIComponent(id)}/cancel`),
  adminList: () => api.get<AdminOrderRequest[]>("/api/v1/admin/order-requests"),
  adminSetStatus: (id: string, status: Exclude<OrderRequestStatus, "RECEIVED">) =>
    api.post<AdminOrderRequest>(`/api/v1/admin/order-requests/${encodeURIComponent(id)}/status`, { status }),
};

export const REQUEST_STATUS_TONE: Record<OrderRequestStatus, StatusTone> = {
  RECEIVED: "progress",
  CONFIRMED: "progress",
  COMPLETED: "done",
  DECLINED: "stopped",
  CANCELLED: "stopped",
};

/** Admin actions allowed from each status (mirrors backend ORDER_REQUEST_TRANSITIONS). */
export const ADMIN_ACTIONS: Record<OrderRequestStatus, { status: Exclude<OrderRequestStatus, "RECEIVED">; label: string }[]> = {
  RECEIVED: [
    { status: "CONFIRMED", label: "Retailer confirmed" },
    { status: "DECLINED", label: "Retailer declined" },
    { status: "CANCELLED", label: "Cancel" },
  ],
  CONFIRMED: [
    { status: "COMPLETED", label: "Mark completed" },
    { status: "CANCELLED", label: "Cancel" },
  ],
  DECLINED: [],
  CANCELLED: [],
  COMPLETED: [],
};

/** Strip spaces, dashes, dots and brackets, as the backend does. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

/** Returns an error sentence, or null when the number is in international format. */
export function phoneError(raw: string): string | null {
  const v = normalizePhone(raw);
  if (!v) return "Enter a phone number.";
  if (!/^\+[1-9]\d{7,14}$/.test(v)) return "Enter the number with its country code, starting with + (for example +255).";
  return null;
}

export function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Fallback for older browsers: RFC 4122 v4 from getRandomValues.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * The backend's 409/422 order messages are written for customers (stock,
 * unavailable product, reused request), so they are shown as-is. Schema
 * validation errors (a list) and everything else fall back to generic text.
 */
export function orderErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && (err.status === 409 || err.status === 422) && typeof err.detail === "string") {
    return err.detail;
  }
  return errorMessage(err, fallback);
}

/** True when the server definitely did not store the request, so a fresh id is safe. */
export function isDefinitiveRejection(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.status === 409 && typeof err.detail === "string" && err.detail.includes("different details")) return false;
  return err.status >= 400 && err.status < 500;
}
