import type { ObjectId } from "mongodb";
import type { BaseDoc } from "./types";

export type Role = "admin";

/** The only account type. There is no customer sign-up: buyers enquire, they do not register. */
export interface UserDoc extends BaseDoc {
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  tokenVersion: number;
  disabled: boolean;
  resetTokenHash: string | null;
  resetTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A gem variety: Emerald, Ruby, Aquamarine, and so on. */
export interface CategoryDoc extends BaseDoc {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GemImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

/**
 * A stone's availability. Loose gemstones are one-of-a-kind, so there is no stock count —
 * a stone is on offer, held for a buyer, or gone.
 */
export type GemStatus = "available" | "reserved" | "sold";

export interface GemDoc extends BaseDoc {
  slug: string;
  /** Reference the dealer uses on the stone's packet, e.g. "REC-EM-0112". */
  reference: string;
  title: string;
  description: string;

  categoryId: ObjectId;
  /** Denormalised so collection pages filter without a $lookup. */
  categorySlug: string;

  /** Gemmological attributes — the fields a buyer actually compares on. */
  caratWeight: number;
  shape: string;
  cut: string;
  colour: string;
  clarity: string;
  /** Length × width × depth in millimetres. */
  dimensionsMm: { length: number; width: number; depth: number };
  origin: string;
  /** "None (unheated)", "Heated", "Oiled" … Disclosure is mandatory in this trade. */
  treatment: string;
  certificate: string;

  /**
   * Price in paisa, or null for "price on request" — normal for higher-value stones.
   * Never a float, and never accepted from the client.
   */
  priceMinor: number | null;

  status: GemStatus;
  featured: boolean;
  images: GemImage[];
  published: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EnquiryStatus = "new" | "replied" | "closed";

/** A buyer's enquiry about one stone. This replaces cart, checkout and orders entirely. */
export interface EnquiryDoc extends BaseDoc {
  reference: string;
  gemId: ObjectId | null;
  gemSlug: string;
  gemTitle: string;
  gemReference: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: EnquiryStatus;
  /** Whether the notification email actually left the building, and why not if it did not. */
  emailSent: boolean;
  emailError: string | null;
  adminNote: string;
  createdAt: Date;
  updatedAt: Date;
}
