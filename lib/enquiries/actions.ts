"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { enquiries, gems } from "../db/collections";
import { limits, rateLimit } from "../auth/rate-limit";
import { buildEnquiryEmail, sendMail } from "../email/mailer";
import { siteConfig } from "../site-config";
import { enquirySchema } from "../validation/schemas";
import { fieldErrorsFrom, type EnquiryFormState } from "../forms/state";

/** PEC-7Q2M4X — short enough to read down a phone, random enough not to collide. */
function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  const bytes = randomBytes(6);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `${siteConfig.enquiryPrefix}-${out}`;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}

/**
 * The public enquiry submission — the only write an anonymous visitor can make.
 *
 * Order of operations matters: the enquiry is persisted BEFORE the email is attempted, and
 * a mail failure is recorded on the record rather than surfaced as a failure to the buyer.
 * A dealer who loses a lead because an SMTP server was briefly down has lost real money;
 * the admin inbox is the source of truth and the email is a notification on top of it.
 */
export async function submitEnquiryAction(
  _prev: EnquiryFormState,
  formData: FormData,
): Promise<EnquiryFormState> {
  const parsed = enquirySchema.safeParse({
    gemSlug: formData.get("gemSlug"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    message: formData.get("message"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    // The honeypot has no visible field, so its message would be meaningless to a person.
    if (fieldErrors.website) {
      return { ok: true, message: "Thank you — your enquiry has been received." };
    }
    return { ok: false, message: "Please check the details below.", fieldErrors };
  }

  const { gemSlug, name, email, phone, message } = parsed.data;

  const gate = rateLimit(`enquiry:${await clientIp()}`, limits.enquiry.limit, limits.enquiry.windowMs);
  if (!gate.ok) {
    return {
      ok: false,
      message: "You have sent several enquiries already. Please try again in a little while.",
    };
  }

  // Every stored detail about the stone is read here, never taken from the form.
  const gem = await gems().findOne({ slug: gemSlug, published: true, deletedAt: null });
  if (!gem) {
    return { ok: false, message: "That stone is no longer listed. Please choose another." };
  }

  const now = new Date();
  const reference = makeReference();

  const inserted = await enquiries().insertOne({
    reference,
    gemId: gem._id,
    gemSlug: gem.slug,
    gemTitle: gem.title,
    gemReference: gem.reference,
    name,
    email,
    phone,
    message,
    status: "new",
    emailSent: false,
    emailError: null,
    adminNote: "",
    createdAt: now,
    updatedAt: now,
  });

  const outcome = await sendMail(
    buildEnquiryEmail({
      reference,
      name,
      email,
      phone,
      message,
      gemTitle: gem.title,
      gemReference: gem.reference,
      gemUrl: `${siteConfig.url}/gem/${gem.slug}`,
    }),
  );

  await enquiries().updateOne(
    { _id: inserted.insertedId },
    {
      $set: {
        emailSent: outcome.ok,
        emailError: outcome.ok ? null : outcome.error,
        updatedAt: new Date(),
      },
    },
  );

  revalidatePath("/admin/enquiries");

  return {
    ok: true,
    reference,
    message: "Thank you — your enquiry has been received.",
  };
}
