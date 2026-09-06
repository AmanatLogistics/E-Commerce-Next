import { ObjectId } from "mongodb";
import { media } from "@/lib/db/collections";

/**
 * Serving an uploaded photograph.
 *
 * Public, and deliberately so: these are the pictures on the storefront. There is nothing to
 * guard, and guarding them would mean every visitor's browser sending a session cookie to
 * fetch a picture of an emerald.
 *
 * The id carries an extension — /media/<id>.jpg — purely so the URL looks like a file to
 * anything that judges by extension. It is stripped before the lookup; the Content-Type
 * header comes from what was stored, never from the URL.
 */

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const hex = id.split(".")[0];
  if (!ObjectId.isValid(hex)) return new Response("Not found", { status: 404 });

  const doc = await media().findOne({ _id: new ObjectId(hex) });
  if (!doc) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(doc.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Length": String(bytes.length),
      /*
       * An upload is never edited in place — replacing a photograph means a new id — so the
       * bytes at this URL are immutable and can be cached for a year. Without this every
       * page view re-reads every image out of the database.
       */
      "Cache-Control": "public, max-age=31536000, immutable",
      // Belt and braces: whatever was stored, the browser must not treat it as a document.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
