"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { categories, enquiries, gems } from "../db/collections";
import { requireAdminAction } from "../auth/guards";
import { uniqueSlug } from "../slug";
import { toMinor } from "../money";
import { fieldErrorsFrom, type FormState } from "../forms/state";
import {
  categoryInputSchema,
  gemInputSchema,
  updateEnquirySchema,
} from "../validation/schemas";

/**
 * Every action here calls requireAdminAction() as its FIRST statement.
 *
 * A Server Action is a POST to the page's own endpoint and can be invoked directly with a
 * crafted request — the proxy check and the hidden admin UI are both irrelevant to that.
 * requireAdminAction re-reads the session AND re-loads the user from the database, so a
 * stale cookie claiming admin, or an account disabled a minute ago, fails here.
 *
 * Mass assignment is prevented by construction: every write below names its fields
 * explicitly from a Zod-parsed object. No request body is ever spread into an update.
 */

function numberField(formData: FormData, name: string): number | undefined {
  const raw = formData.get(name);
  if (raw === null || raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function gemInputFrom(formData: FormData) {
  // Images arrive as parallel url/alt arrays from the repeatable fieldset.
  const urls = formData.getAll("imageUrl").map(String);
  const alts = formData.getAll("imageAlt").map(String);
  const images = urls
    .map((url, i) => ({ url: url.trim(), alt: (alts[i] ?? "").trim(), width: 600, height: 600 }))
    .filter((image) => image.url.length > 0);

  const priceRaw = formData.get("priceRupees");
  const priceRupees =
    priceRaw === null || String(priceRaw).trim() === "" ? null : Number(priceRaw);

  return {
    title: formData.get("title"),
    reference: formData.get("reference"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    caratWeight: numberField(formData, "caratWeight"),
    shape: formData.get("shape"),
    /*
     * `optional(formData, …)` rather than `.get()` for every field with a Zod default.
     *
     * FormData.get returns NULL for a field the form does not contain, and Zod applies a
     * default to UNDEFINED only — null is a value, and a null fails `z.string()`. So the
     * moment `cut` and `clarity` were taken off the form, every save would have been
     * rejected with an error about fields the dealer could no longer even see.
     */
    cut: optional(formData, "cut"),
    colour: formData.get("colour"),
    clarity: optional(formData, "clarity"),
    lengthMm: numberField(formData, "lengthMm"),
    widthMm: numberField(formData, "widthMm"),
    depthMm: numberField(formData, "depthMm"),
    origin: formData.get("origin"),
    treatment: formData.get("treatment"),
    certificate: optional(formData, "certificate"),
    priceRupees,
    status: optional(formData, "status") ?? "available",
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
    images,
  };
}

/** undefined for a field the form does not carry, so a Zod default can apply. */
function optional(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

/**
 * Every image ends up with alt text, without the form insisting on it.
 *
 * A blank description used to refuse the whole save. Falling back to the stone's title with
 * a view number is not as good as a written description, and it is enormously better than
 * both the alternatives that were actually on offer: no listing at all, or an empty alt
 * attribute that tells a screen reader nothing.
 */
function withAltText<T extends { url: string; alt: string }>(images: T[], title: string): T[] {
  return images.map((image, index) => ({
    ...image,
    alt: image.alt.trim().length > 0
      ? image.alt.trim()
      : images.length > 1
        ? `${title} — view ${index + 1}`
        : title,
  }));
}

function revalidateGemPaths(slug?: string): void {
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/admin/gems");
  if (slug) revalidatePath(`/gem/${slug}`);
}

export async function createGemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdminAction();

  const parsed = gemInputSchema.safeParse(gemInputFrom(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const input = parsed.data;

  // The stock reference is the dealer's own and must stay unique; the slug is ours to
  // choose, so a clash there is settled rather than reported.
  const referenceClash = await gems().findOne({ reference: input.reference });
  if (referenceClash) {
    return {
      ok: false,
      message: "",
      fieldErrors: { reference: "Another stone already uses this reference." },
    };
  }

  const slug = await uniqueSlug(input.title, async (candidate) =>
    Boolean(await gems().findOne({ slug: candidate })),
  );
  const images = withAltText(input.images, input.title);

  const now = new Date();
  await gems().insertOne({
    slug,
    reference: input.reference,
    title: input.title,
    description: input.description,
    categoryId: new ObjectId(input.categoryId),
    categorySlug: await categorySlugFor(input.categoryId),
    caratWeight: input.caratWeight,
    shape: input.shape,
    cut: input.cut,
    colour: input.colour,
    clarity: input.clarity,
    dimensionsMm: { length: input.lengthMm, width: input.widthMm, depth: input.depthMm },
    origin: input.origin,
    treatment: input.treatment,
    certificate: input.certificate,
    // Afghanis in, pul stored. Money is never a float and never comes from the client raw.
    priceMinor: input.priceRupees === null ? null : toMinor(input.priceRupees),
    status: input.status,
    featured: input.featured,
    images,
    published: input.published,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  revalidateGemPaths(slug);
  redirect("/admin/gems?created=1");
}

async function categorySlugFor(categoryId: string): Promise<string> {
  const category = await categories().findOne({ _id: new ObjectId(categoryId) });
  if (!category) throw new Error("That gem variety no longer exists.");
  return category.slug;
}

export async function updateGemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdminAction();

  const id = String(formData.get("gemId") ?? "");
  if (!ObjectId.isValid(id)) return { ok: false, message: "Unknown stone." };

  const parsed = gemInputSchema.safeParse(gemInputFrom(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const input = parsed.data;
  const _id = new ObjectId(id);

  const clash = await gems().findOne({ _id: { $ne: _id }, reference: input.reference });
  if (clash) {
    return {
      ok: false,
      message: "",
      fieldErrors: { reference: "Another stone already uses this reference." },
    };
  }

  const previous = await gems().findOne({ _id });
  if (!previous) return { ok: false, message: "Unknown stone." };

  /*
   * The slug is NOT re-derived on an edit. It is the stone's public address, and a dealer
   * correcting a typo in the title should not silently break every link and QR code already
   * pointing at it. A slug only gets chosen once, when the stone is created.
   */
  const slug = previous.slug;
  const images = withAltText(input.images, input.title);

  await gems().updateOne(
    { _id },
    {
      $set: {
        slug,
        reference: input.reference,
        title: input.title,
        description: input.description,
        categoryId: new ObjectId(input.categoryId),
        categorySlug: await categorySlugFor(input.categoryId),
        caratWeight: input.caratWeight,
        shape: input.shape,
        cut: input.cut,
        colour: input.colour,
        clarity: input.clarity,
        dimensionsMm: { length: input.lengthMm, width: input.widthMm, depth: input.depthMm },
        origin: input.origin,
        treatment: input.treatment,
        certificate: input.certificate,
        priceMinor: input.priceRupees === null ? null : toMinor(input.priceRupees),
        status: input.status,
        featured: input.featured,
        images,
        published: input.published,
        updatedAt: new Date(),
      },
    },
  );

  revalidateGemPaths(slug);
  revalidatePath(`/admin/gems/${id}`);

  return { ok: true, message: "Saved." };
}

/** Soft delete: the record stays for reference, and stops being published. */
export async function deleteGemAction(formData: FormData): Promise<void> {
  await requireAdminAction();

  const id = String(formData.get("gemId") ?? "");
  if (!ObjectId.isValid(id)) return;

  const _id = new ObjectId(id);
  const gem = await gems().findOne({ _id });
  await gems().updateOne(
    { _id },
    { $set: { deletedAt: new Date(), published: false, updatedAt: new Date() } },
  );

  revalidateGemPaths(gem?.slug);
  redirect("/admin/gems?deleted=1");
}

export async function restoreGemAction(formData: FormData): Promise<void> {
  await requireAdminAction();

  const id = String(formData.get("gemId") ?? "");
  if (!ObjectId.isValid(id)) return;

  await gems().updateOne(
    { _id: new ObjectId(id) },
    { $set: { deletedAt: null, updatedAt: new Date() } },
  );
  revalidateGemPaths();
}

export async function saveCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminAction();

  const parsed = categoryInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    sortOrder: numberField(formData, "sortOrder") ?? 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "Please fix the errors below.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }
  const input = parsed.data;

  const id = String(formData.get("categoryId") ?? "");
  const editing = ObjectId.isValid(id);

  const clash = await categories().findOne({ slug: input.slug });
  if (clash && (!editing || clash._id.toHexString() !== id)) {
    return { ok: false, message: "", fieldErrors: { slug: "Another variety already uses this slug." } };
  }

  const now = new Date();
  if (editing) {
    const _id = new ObjectId(id);
    const previous = await categories().findOne({ _id });
    await categories().updateOne(
      { _id },
      {
        $set: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          sortOrder: input.sortOrder,
          active: input.active,
          updatedAt: now,
        },
      },
    );
    // categorySlug is denormalised onto every stone, so a slug change must propagate.
    if (previous && previous.slug !== input.slug) {
      await gems().updateMany({ categoryId: _id }, { $set: { categorySlug: input.slug } });
      revalidatePath(`/collection/${previous.slug}`);
    }
  } else {
    await categories().insertOne({
      name: input.name,
      slug: input.slug,
      description: input.description,
      sortOrder: input.sortOrder,
      active: input.active,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
  return { ok: true, message: editing ? "Variety saved." : "Variety added." };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdminAction();

  const id = String(formData.get("categoryId") ?? "");
  if (!ObjectId.isValid(id)) return;

  const _id = new ObjectId(id);
  // A variety holding stones is deactivated rather than deleted, so no stone is orphaned.
  const inUse = await gems().countDocuments({ categoryId: _id, deletedAt: null });
  if (inUse > 0) {
    await categories().updateOne({ _id }, { $set: { active: false, updatedAt: new Date() } });
  } else {
    await categories().deleteOne({ _id });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
}

export async function updateEnquiryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminAction();

  const parsed = updateEnquirySchema.safeParse({
    enquiryId: formData.get("enquiryId"),
    status: formData.get("status"),
    adminNote: formData.get("adminNote") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: "Could not save that change." };
  }

  await enquiries().updateOne(
    { _id: new ObjectId(parsed.data.enquiryId) },
    { $set: { status: parsed.data.status, adminNote: parsed.data.adminNote, updatedAt: new Date() } },
  );

  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${parsed.data.enquiryId}`);
  return { ok: true, message: "Enquiry updated." };
}
