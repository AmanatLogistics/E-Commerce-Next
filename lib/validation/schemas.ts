/**
 * Every input boundary parses through one of these. Shared between client and server so a
 * field's rules cannot drift between where they are shown and where they are enforced.
 *
 * Note what is absent: no public schema accepts a price, a role, or a status. A tampered
 * value has no field to arrive in.
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

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

/** Buyers reach us from many countries, so the phone rule is permissive but bounded. */
const phoneSchema = z
  .string()
  .trim()
  .max(24, "That phone number is too long")
  .regex(/^$|^[+0-9][0-9\s()-]{5,23}$/, "Enter a valid phone number, or leave it blank")
  .default("");

/**
 * The public enquiry form — the only thing an anonymous visitor can submit.
 * `gemSlug` identifies the stone; every other detail about it is read from the database,
 * so a forged title, reference or price cannot enter the record or the email.
 */
export const enquirySchema = z.object({
  gemSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Unknown stone")
    .max(140),
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: emailSchema,
  phone: phoneSchema,
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little about what you are looking for")
    .max(2000, "Please keep the message under 2000 characters"),
  /** Honeypot: a real person never fills this in, because it is hidden. */
  website: z.string().max(0, "").optional().default(""),
});

export const contactSchema = enquirySchema.omit({ gemSlug: true });

export const gemStatusSchema = z.enum(["available", "reserved", "sold"]);
export const enquiryStatusSchema = z.enum(["new", "replied", "closed"]);

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens")
  .max(140);

/** Admin-only. Prices are entered in whole rupees and converted to paisa on the server. */
export const gemInputSchema = z.object({
  title: z.string().trim().min(3, "Enter a title").max(140),
  slug: slugField,
  reference: z.string().trim().min(2, "Enter a stock reference").max(40),
  description: z.string().trim().min(20, "Write at least a sentence or two").max(4000),
  categoryId: z.string().regex(/^[0-9a-f]{24}$/, "Choose a gem variety"),

  caratWeight: z.number().min(0.01, "Enter the carat weight").max(10_000),
  shape: z.string().trim().min(1, "Enter the shape").max(40),
  cut: z.string().trim().min(1, "Enter the cut").max(40),
  colour: z.string().trim().min(1, "Describe the colour").max(80),
  clarity: z.string().trim().min(1, "Enter the clarity").max(40),
  lengthMm: z.number().min(0.1, "Enter the length").max(1000),
  widthMm: z.number().min(0.1, "Enter the width").max(1000),
  depthMm: z.number().min(0.1, "Enter the depth").max(1000),
  origin: z.string().trim().min(2, "Enter the origin").max(80),
  /** Treatment disclosure is mandatory in this trade, so the field cannot be blank. */
  treatment: z.string().trim().min(2, "State the treatment, or 'None (unheated)'").max(120),
  certificate: z.string().trim().max(120).default(""),

  /** Blank means "price on request", which is normal for higher-value stones. */
  priceRupees: z.number().int().min(0).max(1_000_000_000).nullable().default(null),

  status: gemStatusSchema.default("available"),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  images: z
    .array(
      z.object({
        url: z.string().min(1, "Each image needs a URL").max(500),
        alt: z.string().trim().min(1, "Describe the image").max(200),
        width: z.number().int().min(1).max(10_000).default(1200),
        height: z.number().int().min(1).max(10_000).default(1200),
      }),
    )
    .min(1, "Add at least one image")
    .max(8),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(60),
  slug: slugField,
  description: z.string().trim().max(500).default(""),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const updateEnquirySchema = z.object({
  enquiryId: z.string().regex(/^[0-9a-f]{24}$/),
  status: enquiryStatusSchema,
  adminNote: z.string().trim().max(1000).default(""),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type EnquiryInput = z.infer<typeof enquirySchema>;
export type GemInput = z.infer<typeof gemInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
