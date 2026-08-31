/**
 * Every input boundary in the app parses through one of these. Shared between client and
 * server so a field's rules cannot drift between where they are shown and where they are
 * enforced.
 *
 * Note what is deliberately absent: no schema accepts a price, a role, or an order total
 * from the client. A tampered value has no field to arrive in.
 */
import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter your email address")
  .max(254)
  .email("That does not look like an email address");

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200, "That password is too long")
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v), {
    message: "Include an uppercase letter, a lowercase letter and a number",
  });

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  email: emailSchema,
  password: passwordSchema,
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
});

/** Pakistani mobile numbers, with or without the country code. */
const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a contact number")
  .max(20)
  .regex(/^[+0-9][0-9\s-]{6,19}$/, "Enter a valid phone number");

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the recipient's full name").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(4, "Enter the street address").max(120),
  line2: z.string().trim().max(120).default(""),
  city: z.string().trim().min(2, "Enter the city").max(60),
  province: z.string().trim().min(2, "Select a province").max(60),
  postalCode: z
    .string()
    .trim()
    .regex(/^[0-9]{5}$/, "Postal codes are five digits"),
  country: z.literal("PK").default("PK"),
});

export const savedAddressSchema = addressSchema.extend({
  label: z.string().trim().min(1).max(40).default("Home"),
  isDefault: z.boolean().default(false),
});

export const cartLineSchema = z.object({
  productId: z.string().regex(/^[0-9a-f]{24}$/, "Unknown product"),
  qty: z.number().int().min(1, "Quantity must be at least 1").max(20, "Maximum 20 per item"),
});

export const shippingMethodSchema = z.enum(["standard", "express"]);
export const paymentMethodSchema = z.enum(["cod", "card"]);

/**
 * The checkout payload. There is no price, subtotal, shipping cost or total here by
 * design: the server recomputes all of them from the database in lib/orders/pricing.ts.
 */
export const placeOrderSchema = z.object({
  email: emailSchema,
  shippingAddress: addressSchema,
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: addressSchema.optional(),
  shippingMethod: shippingMethodSchema,
  paymentMethod: paymentMethodSchema,
});

export const productInputSchema = z.object({
  title: z.string().trim().min(3, "Enter a product title").max(140),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens")
    .max(140),
  description: z.string().trim().min(20, "Write at least a sentence or two").max(4000),
  brand: z.string().trim().min(1, "Enter a brand").max(60),
  categoryId: z.string().regex(/^[0-9a-f]{24}$/, "Choose a category"),
  /** Admin-facing prices are entered in whole rupees and converted to paisa on the server. */
  priceRupees: z.number().int().min(1, "Enter a price").max(100_000_000),
  compareAtRupees: z.number().int().min(0).max(100_000_000).nullable().default(null),
  stock: z.number().int().min(0, "Stock cannot be negative").max(1_000_000),
  images: z
    .array(
      z.object({
        url: z.string().url("Each image needs a valid URL"),
        alt: z.string().trim().min(1, "Describe the image").max(200),
        width: z.number().int().min(1).max(10_000).default(1200),
        height: z.number().int().min(1).max(10_000).default(1200),
      }),
    )
    .min(1, "Add at least one image")
    .max(8),
  specs: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        value: z.string().trim().min(1).max(200),
      }),
    )
    .max(30)
    .default([]),
  published: z.boolean().default(false),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Enter a category name").max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens")
    .max(60),
  description: z.string().trim().max(500).default(""),
  image: z.string().trim().max(500).default(""),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const orderStatusSchema = z.enum([
  "pending",
  "cod_confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const updateOrderStatusSchema = z.object({
  orderId: z.string().regex(/^[0-9a-f]{24}$/),
  to: orderStatusSchema,
  note: z.string().trim().max(300).default(""),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
