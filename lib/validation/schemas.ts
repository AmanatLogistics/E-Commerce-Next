/**
 * Every input boundary parses through one of these. Shared between client and server so a
 * field's rules cannot drift between where they are shown and where they are enforced.
 *
 * Note what is absent: no public schema accepts a price, a role, or a status. A tampered
 * value has no field to arrive in.
 */
import { z } from "zod";
import { checkImageSrc } from "../image-src";

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

/**
 * A colleague's account, created from the admin panel.
 *
 * `role` is deliberately absent, here and everywhere else. It is hard-coded where the
 * account is written (lib/auth/admin-account.ts), so no request can ask for one.
 */
export const newAccountSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2, "Enter a name").max(80),
  password: passwordSchema,
});

/**
 * Changing your own password requires the current one.
 *
 * An administrator can already reset anyone's password without it, so this is not about
 * privilege — it is about an unattended screen. Someone who walks up to a signed-in laptop
 * should not be able to take the account over in two keystrokes.
 */
export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: passwordSchema,
});

/**
 * The site's editable identity.
 *
 * Bounded rather than free: the name sets a wordmark that is laid out for a short phrase,
 * the initials appear where the full name will not fit, and the description goes into a meta
 * tag that search engines truncate anyway. A limit here is kinder than a broken header.
 */
export const siteSettingsSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name").max(60),
  shortName: z.string().trim().min(2, "Enter a short name").max(40),
  initials: z.string().trim().min(1, "Enter initials").max(6),
  tagline: z.string().trim().min(2, "Enter a tagline").max(120),
  description: z.string().trim().min(10, "Write a sentence or two").max(320),
  contactEmail: emailSchema,
  contactPhone: z.string().trim().min(5, "Enter a phone number").max(32),
  // Optional on purpose: an empty value is how the floating button is switched off.
  whatsappNumber: z.string().trim().max(32).default(""),
  address: z.string().trim().min(3, "Enter an address").max(120),
  promises: z
    .array(
      z.object({
        title: z.string().trim().min(2, "Enter a title").max(48),
        body: z.string().trim().min(2, "Enter a line of detail").max(120),
      }),
    )
    .min(1, "Keep at least one promise")
    .max(6),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

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

/**
 * Admin-only. Prices are entered in whole dollars and converted to cents on the server.
 *
 * There is no `slug` here on purpose. It used to be a required field with the rule
 * "lowercase words separated by hyphens", and everyone typed the title into it and had the
 * save refused. It is derived from the title now — see lib/slug.ts.
 *
 * `cut` and `clarity` are optional because plenty of stock genuinely has neither: an uncut
 * crystal has no cut, and a translucent specimen has no clarity grade worth stating. They
 * were required, so a dealer listing a rough crystal had to invent a value or give up.
 * `treatment` stays required — that one is a disclosure obligation, not a nicety.
 */
export const gemInputSchema = z.object({
  title: z.string().trim().min(3, "Enter a title").max(140),
  reference: z.string().trim().min(2, "Enter a stock reference").max(40),
  description: z.string().trim().min(20, "Write at least a sentence or two").max(4000),
  categoryId: z.string().regex(/^[0-9a-f]{24}$/, "Choose a gem variety"),

  caratWeight: z.number().min(0.01, "Enter the carat weight").max(10_000),
  shape: z.string().trim().min(1, "Enter the shape").max(40),
  cut: z.string().trim().max(40).default(""),
  colour: z.string().trim().min(1, "Describe the colour").max(80),
  clarity: z.string().trim().max(40).default(""),
  lengthMm: z.number().min(0.1, "Enter the length").max(1000),
  widthMm: z.number().min(0.1, "Enter the width").max(1000),
  depthMm: z.number().min(0.1, "Enter the depth").max(1000),
  origin: z.string().trim().min(2, "Enter the origin").max(80),
  /** Treatment disclosure is mandatory in this trade, so the field cannot be blank. */
  treatment: z.string().trim().min(2, "State the treatment, or 'None (unheated)'").max(120),
  certificate: z.string().trim().max(120).default(""),

  /**
   * Whole units of the configured currency — dollars today, and named for that role
   * rather than for the currency, since this field has outlived two of them.
   * Blank means "price on request", which is normal for higher-value stones.
   */
  priceMajor: z.number().int().min(0).max(1_000_000_000).nullable().default(null),

  status: gemStatusSchema.default("available"),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  /*
   * `alt` is optional and filled in from the title when it is blank. It used to be required,
   * with no asterisk and no hint saying so, which meant pasting an image URL and pressing
   * Add produced "Describe the image" and no saved stone. Accessibility is not served by
   * refusing the listing; it is served by there always being SOME alt text.
   *
   * The url rule is in lib/image-src.ts: any host, any path, but nothing that can execute.
   */
  images: z
    .array(
      z.object({
        url: z
          .string()
          .min(1, "Add an image address, or upload a file")
          .max(2000)
          .refine((value) => checkImageSrc(value).ok, {
            message: "Paste a normal image link (https://…) or upload the file",
          }),
        alt: z.string().trim().max(200).default(""),
        width: z.number().int().min(1).max(10_000).default(1200),
        height: z.number().int().min(1).max(10_000).default(1200),
      }),
    )
    .min(1, "Add at least one photograph")
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
