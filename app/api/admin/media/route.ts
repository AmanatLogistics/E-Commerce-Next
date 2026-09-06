import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdminAction } from "@/lib/auth/guards";
import { media } from "@/lib/db/collections";

/**
 * Receiving an uploaded photograph.
 *
 * A route handler rather than a Server Action because the browser sends the file with
 * fetch(), so the admin panel can show a progress state and a preview instead of a page that
 * appears to hang while a megabyte uploads.
 *
 * requireAdminAction() is the FIRST statement, as everywhere else. A route handler is a
 * public endpoint — nothing about living under /api/admin makes it private, and an
 * unguarded uploader is free file hosting for whoever finds it.
 */

export const runtime = "nodejs";

/** Only what a browser can actually decode as an image, and nothing that can execute. */
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
]);

/*
 * The browser downscales before sending, so this is a backstop rather than the real limit.
 * It is deliberately well under MongoDB's 16MB document cap: base64 inflates by a third, and
 * a document that cannot be written fails at the end of the upload rather than the start.
 */
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  /*
   * The guard throws, which is right for a Server Action — an uncaught throw there is a
   * refusal the caller cannot ignore. Here it would surface as a 500, and a 500 tells a
   * client "we broke" when the truth is "you are not signed in". Same refusal, honest code.
   */
  try {
    await requireAdminAction();
  } catch {
    return NextResponse.json({ error: "Sign in as an administrator first." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "That upload did not arrive intact." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  /*
   * SVG is excluded on purpose, and it is the one exclusion worth explaining: an SVG is a
   * document, not a bitmap. It can carry script, and served from our own origin it would run
   * with our origin's privileges. Everything else here is inert pixels.
   */
  const extension = ALLOWED.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, AVIF or GIF photograph." },
      { status: 415 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That image is larger than ${Math.round(MAX_BYTES / 1024 / 1024)}MB.` },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // The declared type is a claim by the client; the first bytes are not.
  if (!looksLikeImage(bytes, file.type)) {
    return NextResponse.json(
      { error: "That file is not the image type it claims to be." },
      { status: 415 },
    );
  }

  const _id = new ObjectId();
  await media().insertOne({
    _id,
    contentType: file.type,
    data: bytes.toString("base64"),
    size: bytes.length,
    createdAt: new Date(),
  });

  return NextResponse.json({ url: `/media/${_id.toHexString()}.${extension}` });
}

/**
 * Magic-number check.
 *
 * A renamed file arrives with whatever Content-Type the browser guessed from the extension,
 * so the declared type proves nothing. This is not a full parse — it is the cheap half of
 * the check, and it catches the case where the bytes are not an image at all.
 */
function looksLikeImage(bytes: Buffer, declared: string): boolean {
  const starts = (...prefix: number[]) => prefix.every((byte, i) => bytes[i] === byte);
  switch (declared) {
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/gif":
      return starts(0x47, 0x49, 0x46, 0x38);
    // Both sit in a RIFF/ISO-BMFF container: "RIFF….WEBP" and "….ftyp" respectively.
    case "image/webp":
      return starts(0x52, 0x49, 0x46, 0x46) && bytes.subarray(8, 12).toString() === "WEBP";
    case "image/avif":
      return bytes.subarray(4, 8).toString() === "ftyp";
    default:
      return false;
  }
}
