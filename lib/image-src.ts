/**
 * Deciding whether an image address is safe to put in a `src`, and how to render it.
 *
 * A dealer should be able to paste a photograph's URL from anywhere — their own host, a
 * supplier's listing, a link they were sent. "Anywhere" is the requirement, so the rule
 * cannot be a list of allowed sites. It has to be a rule about what the address can DO.
 *
 * Two things are refused, and neither is about where the image is hosted:
 *
 *  - `javascript:` and `vbscript:`, which are not addresses at all. A src that runs code is
 *    stored XSS with extra steps, and it is the reason this file exists rather than the
 *    field simply accepting any string.
 *  - `data:`, which embeds the whole payload in the attribute. It bloats every document that
 *    holds one, and `data:image/svg+xml` is a script-execution vector in its own right.
 *
 * Everything else — any host, any path, http or https — is allowed.
 *
 * REMOTE IMAGES ARE NEVER FETCHED BY THIS SERVER. next/image would proxy them through our
 * own optimizer, which means an arbitrary URL in this field becomes an arbitrary outbound
 * request from our infrastructure — a request-forgery surface and someone else's bandwidth
 * bill. `isRemote` exists so the renderer can hand remote sources straight to the browser
 * as a plain <img> instead, and keep next/image for the paths we host.
 */

export type ImageSrcVerdict =
  | { ok: true; url: string; remote: boolean }
  | { ok: false; reason: string };

const DANGEROUS_SCHEMES = /^\s*(javascript|vbscript|data|file|blob)\s*:/i;

export function checkImageSrc(raw: string): ImageSrcVerdict {
  const url = raw.trim();
  if (url.length === 0) return { ok: false, reason: "Add an image address, or upload a file" };
  if (url.length > 2000) return { ok: false, reason: "That address is too long" };

  if (DANGEROUS_SCHEMES.test(url)) {
    return { ok: false, reason: "Paste a normal image link (https://…) or upload the file" };
  }

  // A path we serve ourselves: uploads, and the generated demo images.
  if (url.startsWith("/")) {
    // "//evil.example" is protocol-relative — a remote address wearing a path's clothes.
    if (url.startsWith("//")) {
      return { ok: false, reason: "Write the full address, starting with https://" };
    }
    return { ok: true, url, remote: false };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "That does not look like a link. Paste the image address, starting with https://" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "Only http and https links work here" };
  }

  return { ok: true, url: parsed.toString(), remote: true };
}

/** True for anything the browser should fetch directly rather than through our optimizer. */
export function isRemoteImage(url: string): boolean {
  return !url.startsWith("/");
}
