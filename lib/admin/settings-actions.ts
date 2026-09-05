"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "../auth/guards";
import { resetSiteSettings, saveSiteSettings } from "../settings";
import { siteSettingsSchema } from "../validation/schemas";
import { fieldErrorsFrom, type FormState } from "../forms/state";

/**
 * Editing the site's identity from the admin panel.
 *
 * Both actions call requireAdminAction() as their FIRST statement — a Server Action is a
 * POST to the page's own endpoint and can be invoked with a crafted request, so the hidden
 * nav link and the proxy check mean nothing here.
 *
 * Every field is read out of the form by name and parsed by Zod. No form body is spread into
 * the update, so a request cannot smuggle in a key that happens to exist on the document.
 */

/** The promises arrive as parallel arrays from the repeatable fieldset. */
function promisesFrom(formData: FormData) {
  const titles = formData.getAll("promiseTitle").map(String);
  const bodies = formData.getAll("promiseBody").map(String);
  return titles
    .map((title, index) => ({ title: title.trim(), body: (bodies[index] ?? "").trim() }))
    .filter((promise) => promise.title.length > 0 || promise.body.length > 0);
}

export async function saveSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminAction();

  const parsed = siteSettingsSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    initials: formData.get("initials"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    address: formData.get("address"),
    promises: promisesFrom(formData),
  });
  if (!parsed.success) {
    const issues = parsed.error.issues;
    // A promise's error lands on "promises"; surface the first one rather than losing it.
    const nested = issues.find((issue) => issue.path[0] === "promises");
    return {
      ok: false,
      message: nested ? `A promise is incomplete: ${nested.message}.` : "",
      fieldErrors: fieldErrorsFrom(issues),
    };
  }

  await saveSiteSettings(parsed.data);
  revalidateEverything();

  return { ok: true, message: "Saved. The whole site now uses these details." };
}

export async function resetSettingsAction(): Promise<void> {
  await requireAdminAction();
  await resetSiteSettings();
  revalidateEverything();
}

/*
 * The business name is in the header, the footer, the page title and the structured data of
 * every page — including the ones prerendered at build time, which would otherwise keep
 * showing the old name until something else happened to invalidate them. Revalidating the
 * root layout covers every route beneath it, which is the whole site.
 */
function revalidateEverything(): void {
  revalidatePath("/", "layout");
}
