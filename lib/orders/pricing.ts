import "server-only";
import { ObjectId } from "mongodb";
import { products } from "../db/collections";
import type { OrderItem } from "../db/documents";
import { shippingCostMinor } from "./shipping";

/**
 * THE price authority.
 *
 * Takes only product ids, quantities and a shipping method id — never a price, never a
 * total. Re-reads every product from the database, uses the database's price, and derives
 * every line total, the subtotal, shipping and the grand total here. A client cannot
 * influence any money value: the checkout schema has no price field for one to arrive in
 * (lib/validation/schemas.ts), and this function would ignore it if it did.
 *
 * Proven by tests/unit/pricing.test.ts and tests/e2e/price-tampering.spec.ts.
 */

export interface PricedOrder {
  items: OrderItem[];
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
}

export class PricingError extends Error {}

export interface RequestedLine {
  productId: ObjectId;
  qty: number;
}

export async function priceOrder(
  requested: RequestedLine[],
  shippingMethodId: string,
): Promise<PricedOrder> {
  if (requested.length === 0) throw new PricingError("Your cart is empty.");

  const found = await products().find({
    _id: { $in: requested.map((r) => r.productId) },
    published: true,
    deletedAt: null,
  });
  const byId = new Map(found.map((p) => [p._id.toHexString(), p]));

  const items: OrderItem[] = [];
  for (const line of requested) {
    const product = byId.get(line.productId.toHexString());
    if (!product) {
      throw new PricingError("An item in your cart is no longer available. Please review it.");
    }
    if (!Number.isInteger(line.qty) || line.qty < 1) {
      throw new PricingError(`Invalid quantity for ${product.title}.`);
    }
    if (product.stock < line.qty) {
      throw new PricingError(
        product.stock === 0
          ? `${product.title} is out of stock.`
          : `Only ${product.stock} left of ${product.title}. Please reduce the quantity.`,
      );
    }

    const unitPriceMinor = product.priceMinor; // from the database, always
    items.push({
      productId: product._id,
      slug: product.slug,
      title: product.title,
      image: product.images[0]?.url ?? "",
      unitPriceMinor,
      qty: line.qty,
      lineTotalMinor: unitPriceMinor * line.qty,
    });
  }

  const subtotalMinor = items.reduce((sum, i) => sum + i.lineTotalMinor, 0);
  const shippingMinor = shippingCostMinor(shippingMethodId, subtotalMinor);

  return {
    items,
    subtotalMinor,
    shippingMinor,
    totalMinor: subtotalMinor + shippingMinor,
  };
}
