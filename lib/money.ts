/**
 * Money is an integer count of MINOR units everywhere in this codebase — cents, with
 * 100 to the dollar — in the database, in server actions, and on the wire. Floats
 * never represent money. The only place a value becomes a formatted string is at render
 * time, here.
 *
 * The helpers are named for the unit's role rather than for the currency. This shop has now
 * changed currency twice (PKR, AFN, USD) and not one line below had to change for it — which
 * is exactly the argument for not naming a function rupees(). Every real currency this site would plausibly
 * use has 100 minor units to the major one; if one ever does not, this is the file that has
 * to learn about it, and nothing else does.
 */
import { siteConfig } from "./site-config";

export type Minor = number;

const formatter = new Intl.NumberFormat(siteConfig.formatLocale, {
  style: "currency",
  currency: siteConfig.currency,
  /*
   * "$2,600", not "US$2,600". en-GB disambiguates the dollar by default, which is right for
   * a British reader choosing between currencies and wrong for a shop that quotes in exactly
   * one. The locale still decides date order and separators; only the symbol is narrowed.
   */
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** 1249900 -> "$12,499" */
export function formatMoney(minor: Minor): string {
  return formatter.format(Math.round(minor) / 100);
}

/** Whole dollars -> cents. Use in seeds and admin input parsing. */
export function toMinor(value: number): Minor {
  return Math.round(value * 100);
}

/** Cents -> whole dollars, for populating a number input. */
export function toMajor(minor: Minor): number {
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
