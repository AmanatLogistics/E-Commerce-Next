/**
 * Plain, serialisable shapes for anything that crosses into a Client Component.
 *
 * Database documents must never be passed across that boundary directly: an ObjectId does
 * not survive React's serialisation — it arrives as a plain object, so `_id.toHexString()`
 * throws at render time — and a Date arrives as a string. Mapping here also keeps internal
 * fields out of the client payload, which is a size and a privacy win as well as a
 * correctness one.
 */
import type { CategoryDoc, GemDoc, GemStatus } from "./db/documents";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export function toCategoryOption(category: CategoryDoc): CategoryOption {
  return {
    id: category._id.toHexString(),
    name: category.name,
    slug: category.slug,
  };
}

/** Everything the admin category form needs, and nothing else. */
export interface CategoryFormValues extends CategoryOption {
  description: string;
  sortOrder: number;
  active: boolean;
}

export function toCategoryFormValues(category: CategoryDoc): CategoryFormValues {
  return {
    ...toCategoryOption(category),
    description: category.description,
    sortOrder: category.sortOrder,
    active: category.active,
  };
}

/** Everything the admin gem form needs, with money already converted to whole rupees. */
export interface GemFormValues {
  id: string;
  slug: string;
  reference: string;
  title: string;
  description: string;
  categoryId: string;
  caratWeight: number;
  shape: string;
  cut: string;
  colour: string;
  clarity: string;
  lengthMm: number;
  widthMm: number;
  depthMm: number;
  origin: string;
  treatment: string;
  certificate: string;
  /** null means "price on request". */
  priceRupees: number | null;
  status: GemStatus;
  featured: boolean;
  published: boolean;
  images: { url: string; alt: string }[];
}

export function toGemFormValues(gem: GemDoc): GemFormValues {
  return {
    id: gem._id.toHexString(),
    slug: gem.slug,
    reference: gem.reference,
    title: gem.title,
    description: gem.description,
    categoryId: gem.categoryId.toHexString(),
    caratWeight: gem.caratWeight,
    shape: gem.shape,
    cut: gem.cut,
    colour: gem.colour,
    clarity: gem.clarity,
    lengthMm: gem.dimensionsMm.length,
    widthMm: gem.dimensionsMm.width,
    depthMm: gem.dimensionsMm.depth,
    origin: gem.origin,
    treatment: gem.treatment,
    certificate: gem.certificate,
    priceRupees: gem.priceMinor === null ? null : Math.round(gem.priceMinor / 100),
    status: gem.status,
    featured: gem.featured,
    published: gem.published,
    images: gem.images.map((image) => ({ url: image.url, alt: image.alt })),
  };
}
