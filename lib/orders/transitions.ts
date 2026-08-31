import type { OrderStatus } from "../db/documents";

/**
 * The order state machine from docs/SPEC.md §5, as an explicit allow-list. A transition
 * that is not listed here cannot happen, which is safer than enumerating what is forbidden.
 */
const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cod_confirmed", "processing", "cancelled"],
  cod_confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

/** A customer may only cancel, and only before the order has been worked on. */
const CUSTOMER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  cod_confirmed: ["cancelled"],
  processing: [],
  shipped: [],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export type Actor = "admin" | "customer";

export function allowedTransitions(from: OrderStatus, actor: Actor): OrderStatus[] {
  return (actor === "admin" ? ADMIN_TRANSITIONS : CUSTOMER_TRANSITIONS)[from] ?? [];
}

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean {
  return allowedTransitions(from, actor).includes(to);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  cod_confirmed: "Confirmed (COD)",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Which token a status badge uses. Kept with the labels so the two cannot drift. */
export const ORDER_STATUS_TONE: Record<OrderStatus, "neutral" | "info" | "success" | "danger"> = {
  pending: "neutral",
  cod_confirmed: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

/** Progress steps shown to a customer. Terminal failure states are not on this line. */
export const FULFILMENT_STEPS: OrderStatus[] = [
  "cod_confirmed",
  "processing",
  "shipped",
  "delivered",
];
