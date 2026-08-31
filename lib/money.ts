/**
 * Money is an integer count of paisa (1 PKR = 100 paisa) everywhere in this codebase:
 * in the database, in server actions, and on the wire. Floats never represent money.
 * The only place a value becomes a formatted string is at render time, here.
 */
import { siteConfig } from "./site-config";

export type Minor = number;

const formatter = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** 1249900 -> "Rs 12,499" */
export function formatMoney(minor: Minor): string {
  return formatter.format(Math.round(minor) / 100);
}

/** Whole rupees -> paisa. Use in seeds and admin input parsing. */
export function rupees(value: number): Minor {
  return Math.round(value * 100);
}

/** Paisa -> whole rupees, for populating a number input. */
export function toRupees(minor: Minor): number {
  return Math.round(minor) / 100;
}

/**
 * Percentage saved, rounded down so we never overstate a discount.
 * Returns null when there is nothing to advertise.
 */
export function discountPercent(
  priceMinor: Minor,
  compareAtMinor: Minor | null | undefined,
): number | null {
  if (!compareAtMinor || compareAtMinor <= priceMinor) return null;
  return Math.floor(((compareAtMinor - priceMinor) / compareAtMinor) * 100);
}
