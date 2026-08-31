import type { ObjectId } from "mongodb";
import type { BaseDoc } from "./types";

export type Role = "customer" | "admin";

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

export interface CategoryDoc extends BaseDoc {
  slug: string;
  name: string;
  description: string;
  image: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductDoc extends BaseDoc {
  slug: string;
  title: string;
  description: string;
  brand: string;
  categoryId: ObjectId;
  /** Denormalised so category pages filter without a $lookup. */
  categorySlug: string;
  priceMinor: number;
  compareAtMinor: number | null;
  currency: "PKR";
  stock: number;
  images: ProductImage[];
  specs: ProductSpec[];
  rating: { average: number; count: number };
  published: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Carts never store prices — prices are joined from products on every read. */
export interface CartDoc extends BaseDoc {
  userId: ObjectId | null;
  guestToken: string | null;
  items: { productId: ObjectId; qty: number }[];
  updatedAt: Date;
}

export interface AddressValue {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface AddressDoc extends BaseDoc, AddressValue {
  userId: ObjectId;
  label: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | "pending"
  | "cod_confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentMethod = "cod" | "card";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

/** A line is a snapshot: an order must not change when a product's price later changes. */
export interface OrderItem {
  productId: ObjectId;
  slug: string;
  title: string;
  image: string;
  unitPriceMinor: number;
  qty: number;
  lineTotalMinor: number;
}

export interface StatusChange {
  from: OrderStatus | null;
  to: OrderStatus;
  at: Date;
  byUserId: ObjectId | null;
  byEmail: string;
  note: string;
}

export interface OrderDoc extends BaseDoc {
  orderNumber: string;
  userId: ObjectId | null;
  email: string;
  items: OrderItem[];
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  shippingMethod: string;
  shippingAddress: AddressValue;
  billingAddress: AddressValue;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  statusHistory: StatusChange[];
  /** Lets a guest open their own confirmation page without the order id being guessable. */
  guestAccessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewDoc extends BaseDoc {
  productId: ObjectId;
  userId: ObjectId | null;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: Date;
}
