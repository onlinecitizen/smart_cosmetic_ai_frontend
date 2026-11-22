/**
 * Customer-facing wording for backend order statuses.
 *
 * Honesty rule (project brief §6): never say an order is "confirmed" just
 * because the customer submitted it. The backend currently moves a submitted
 * order straight to VALIDATED without any human review
 * (backend app/routers/orders.py `submit_order`), so VALIDATED is presented
 * as a received *request*, not a confirmation. No payment exists in v1.
 */
export type StatusTone = "neutral" | "progress" | "done" | "stopped";

export interface OrderStatusInfo {
  label: string;
  description: string;
  tone: StatusTone;
}

const REQUEST_RECEIVED: OrderStatusInfo = {
  label: "Request received",
  description:
    "Your order request has been recorded. It has not been sent for preparation yet, and no payment has been taken.",
  tone: "progress",
};

export const ORDER_STATUS: Record<string, OrderStatusInfo> = {
  DRAFT: {
    label: "Not submitted",
    description: "This order is saved but has not been sent to us. Submit it to place your request.",
    tone: "neutral",
  },
  SUBMITTED: REQUEST_RECEIVED,
  VALIDATED: REQUEST_RECEIVED,
  SENT_TO_LAB: {
    label: "Sent for preparation",
    description: "Your formula has been sent to the laboratory that prepares it.",
    tone: "progress",
  },
  PROCESSING: {
    label: "Being prepared",
    description: "The laboratory has reported that your serum is being prepared.",
    tone: "progress",
  },
  READY: {
    label: "Prepared",
    description: "The laboratory has reported that your serum is prepared.",
    tone: "progress",
  },
  DISPATCHED: {
    label: "Dispatched",
    description: "Your order has been marked as dispatched.",
    tone: "progress",
  },
  COMPLETED: {
    label: "Completed",
    description: "This order has been marked as completed.",
    tone: "done",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This order was cancelled. Nothing will be prepared.",
    tone: "stopped",
  },
  FAILED: {
    label: "Could not be completed",
    description: "Something went wrong while preparing this order. Nothing has been charged.",
    tone: "stopped",
  },
};

export function orderStatusInfo(status: string): OrderStatusInfo {
  return (
    ORDER_STATUS[status] ?? {
      label: status,
      description: "",
      tone: "neutral",
    }
  );
}

/** Steps shown in the progress list, in order. VALIDATED is "Request received". */
export const ORDER_TIMELINE = ["VALIDATED", "SENT_TO_LAB", "PROCESSING", "READY", "DISPATCHED", "COMPLETED"] as const;

/** Index in ORDER_TIMELINE; SUBMITTED counts as the first step. -1 if not on the timeline. */
export function timelineIndex(status: string): number {
  if (status === "SUBMITTED") return 0;
  return (ORDER_TIMELINE as readonly string[]).indexOf(status);
}

/**
 * Statuses in which the UI offers "Cancel order" (unchanged from before).
 * A subset of what the backend allows: ORDER_TRANSITIONS also permits
 * cancelling SENT_TO_LAB, which the UI deliberately does not offer.
 */
export const CUSTOMER_CANCELLABLE = ["DRAFT", "SUBMITTED", "VALIDATED"];
