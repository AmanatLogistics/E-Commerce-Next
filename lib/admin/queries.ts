import "server-only";
import { ObjectId } from "mongodb";
import { categories, enquiries, gems } from "../db/collections";
import type { CategoryDoc, EnquiryDoc, EnquiryStatus, GemDoc } from "../db/documents";
import type { Filter } from "../db/types";

/**
 * Admin-side reads. These deliberately do NOT apply the storefront's `published` and
 * `deletedAt` filters — the admin needs to see drafts, sold stock and soft-deleted rows,
 * which is exactly what the public queries in lib/gems/queries.ts must never return.
 */

export const ADMIN_PAGE_SIZE = 20;

export interface AdminGemRow {
  id: string;
  reference: string;
  title: string;
  categorySlug: string;
  caratWeight: number;
  priceMinor: number | null;
  status: GemDoc["status"];
  published: boolean;
  featured: boolean;
  deleted: boolean;
  image: string;
}

export interface AdminGemList {
  rows: AdminGemRow[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listGems(options: {
  q?: string;
  page?: number;
  includeDeleted?: boolean;
}): Promise<AdminGemList> {
  const page = Math.max(1, options.page ?? 1);
  const filter: Filter<GemDoc> = options.includeDeleted ? {} : { deletedAt: null };

  const q = (options.q ?? "").trim();
  if (q) {
    // A plain contains-match here, not the storefront's ranked search: an admin looking
    // for a stone knows part of its name or reference and wants every row that contains it.
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { reference: { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
    ];
  }

  const [docs, total] = await Promise.all([
    gems().find(filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }),
    gems().countDocuments(filter),
  ]);

  return {
    rows: docs.map((gem) => ({
      id: gem._id.toHexString(),
      reference: gem.reference,
      title: gem.title,
      categorySlug: gem.categorySlug,
      caratWeight: gem.caratWeight,
      priceMinor: gem.priceMinor,
      status: gem.status,
      published: gem.published,
      featured: gem.featured,
      deleted: gem.deletedAt !== null,
      image: gem.images[0]?.url ?? "",
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function getGemForEdit(id: string): Promise<GemDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return gems().findOne({ _id: new ObjectId(id) });
}

export async function listAllCategories(): Promise<CategoryDoc[]> {
  return categories().find({}, { sort: { sortOrder: 1 } });
}

export interface AdminEnquiryList {
  rows: EnquiryDoc[];
  total: number;
  page: number;
  totalPages: number;
  counts: Record<EnquiryStatus | "all", number>;
}

export async function listEnquiries(options: {
  status?: EnquiryStatus | "all";
  page?: number;
}): Promise<AdminEnquiryList> {
  const page = Math.max(1, options.page ?? 1);
  const status = options.status ?? "all";
  const filter: Filter<EnquiryDoc> = status === "all" ? {} : { status };

  const [rows, total, all] = await Promise.all([
    enquiries().find(filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      limit: ADMIN_PAGE_SIZE,
    }),
    enquiries().countDocuments(filter),
    enquiries().find({}, { projection: { status: 1 } }),
  ]);

  const counts: Record<EnquiryStatus | "all", number> = {
    all: all.length,
    new: 0,
    replied: 0,
    closed: 0,
  };
  for (const enquiry of all) counts[enquiry.status] += 1;

  return {
    rows,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    counts,
  };
}

export async function getEnquiry(id: string): Promise<EnquiryDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return enquiries().findOne({ _id: new ObjectId(id) });
}

export interface DashboardStats {
  totalGems: number;
  published: number;
  drafts: number;
  available: number;
  reserved: number;
  sold: number;
  newEnquiries: number;
  totalEnquiries: number;
  undeliveredEmails: number;
  recentEnquiries: EnquiryDoc[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [live, allEnquiries, recentEnquiries] = await Promise.all([
    gems().find({ deletedAt: null }, { projection: { status: 1, published: 1 } }),
    enquiries().find({}, { projection: { status: 1, emailSent: 1 } }),
    enquiries().find({}, { sort: { createdAt: -1 }, limit: 5 }),
  ]);

  return {
    totalGems: live.length,
    published: live.filter((gem) => gem.published).length,
    drafts: live.filter((gem) => !gem.published).length,
    available: live.filter((gem) => gem.status === "available").length,
    reserved: live.filter((gem) => gem.status === "reserved").length,
    sold: live.filter((gem) => gem.status === "sold").length,
    newEnquiries: allEnquiries.filter((e) => e.status === "new").length,
    totalEnquiries: allEnquiries.length,
    // Surfaced on the dashboard: a lead whose notification never left is still a lead.
    undeliveredEmails: allEnquiries.filter((e) => !e.emailSent).length,
    recentEnquiries,
  };
}
