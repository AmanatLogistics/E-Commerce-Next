import { rupees } from "../money";

export interface ShippingMethod {
  id: "standard" | "express";
  label: string;
  description: string;
  costMinor: number;
  /** Orders at or above this subtotal ship free on this method. null = never free. */
  freeAboveMinor: number | null;
}

/**
 * Shipping is a server-side table, never a client-supplied number. The checkout payload
 * carries only the method id; the cost is looked up here.
 */
export const SHIPPING_METHODS: readonly ShippingMethod[] = [
  {
    id: "standard",
    label: "Standard delivery",
    description: "3–5 working days",
    costMinor: rupees(250),
    freeAboveMinor: rupees(5000),
  },
  {
    id: "express",
    label: "Express delivery",
    description: "1–2 working days",
    costMinor: rupees(600),
    freeAboveMinor: null,
  },
];

export function getShippingMethod(id: string): ShippingMethod {
  const method = SHIPPING_METHODS.find((m) => m.id === id);
  if (!method) throw new Error(`Unknown shipping method: ${id}`);
  return method;
}

export function shippingCostMinor(methodId: string, subtotalMinor: number): number {
  const method = getShippingMethod(methodId);
  if (method.freeAboveMinor !== null && subtotalMinor >= method.freeAboveMinor) return 0;
  return method.costMinor;
}
