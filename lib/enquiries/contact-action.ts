"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { enquiries } from "../db/collections";
import { limits, rateLimit } from "../auth/rate-limit";
import { buildEnquiryEmail, sendMail } from "../email/mailer";
import { siteConfig } from "../site-config";
import { contactSchema } from "../validation/schemas";
import { fieldErrorsFrom, type EnquiryFormState } from "../forms/state";

/**
 * The general enquiry form, for buyers who want something we do not currently list.
 * It lands in the same inbox as a stone enquiry, with no stone attached, so the dealer has
 * one place to look rather than two.
 */
function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `${siteConfig.enquiryPrefix}-${out}`;
}

export async function submitContactAction(
  _prev: EnquiryFormState,
  formData: FormData,
): Promise<EnquiryFormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    message: formData.get("message"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    if (fieldErrors.website) {
      return { ok: true, message: "Thank you — your enquiry has been received." };
    }
    return { ok: false, message: "Please check the details below.", fieldErrors };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  const gate = rateLimit(`enquiry:${ip}`, limits.enquiry.limit, limits.enquiry.windowMs);
  if (!gate.ok) {
    return {
      ok: false,
      message: "You have sent several enquiries already. Please try again in a little while.",
    };
  }

  const { name, email, phone, message } = parsed.data;
  const now = new Date();
  const reference = makeReference();

  const inserted = await enquiries().insertOne({
    reference,
    gemId: null,
    gemSlug: "",
    gemTitle: "General enquiry",
    gemReference: "—",
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
      gemTitle: "General enquiry",
      gemReference: "—",
      gemUrl: `${siteConfig.url}/contact`,
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
  return { ok: true, reference, message: "Thank you — your enquiry has been received." };
}
