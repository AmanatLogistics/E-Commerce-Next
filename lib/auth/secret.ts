/**
 * The key that signs the session cookie.
 *
 * Deliberately NOT server-only and free of `node:` imports: proxy.ts verifies the same
 * cookie on the edge runtime, and if the two ever resolved different keys, every session
 * would be rejected the moment it left the app. One resolver, used by both.
 *
 * Resolution order:
 *
 *  1. AUTH_SECRET, when it is set. Setting it explicitly is still the better practice —
 *     it lets you rotate the signing key without touching the database credentials.
 *  2. Otherwise, derived from MONGODB_URI. It is already a secret, already required, and
 *     already identical across every instance of a deployment, which is exactly what a
 *     signing key needs to be. Generating a random one per instance would be worse than
 *     useless: each serverless instance would reject the others' cookies.
 *  3. Otherwise, a fixed development value, so a local checkout runs with no setup at all.
 *
 * Deriving from MONGODB_URI does not weaken anything: an attacker holding it already has
 * the whole database, which is strictly worse than forging a session.
 */

const DEV_FALLBACK = "dev-only-insecure-secret-do-not-use-in-production";

/**
 * Changing this string rotates every derived key, invalidating existing sessions.
 *
 * It keeps the original business name on purpose. It is a domain-separation label, never
 * shown to anyone, and renaming it with the brand would sign out every deployment that
 * derives its key from MONGODB_URI — a real cost for a string nobody reads.
 */
const DERIVATION_LABEL = "royal-emerald-crest/session-key/v1";

let cached: Uint8Array | null = null;

export async function resolveSessionKey(): Promise<Uint8Array> {
  if (cached) return cached;

  const explicit = process.env.AUTH_SECRET;
  if (explicit && explicit.length > 0) {
    cached = new TextEncoder().encode(explicit);
    return cached;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoUri.length > 0) {
    // Web Crypto rather than node:crypto, so this is identical on the edge runtime.
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${DERIVATION_LABEL}:${mongoUri}`),
    );
    cached = new Uint8Array(digest);
    return cached;
  }

  cached = new TextEncoder().encode(DEV_FALLBACK);
  return cached;
}

/** Tests need to observe a fresh process; the key is memoised for the life of one. */
export function resetSessionKeyCacheForTests(): void {
  cached = null;
}

/**
 * True when the signing key is the fixed development value — no AUTH_SECRET and no
 * MONGODB_URI. Fine locally; a deployment in this state cannot keep anyone signed in.
 */
export function usingInsecureDevKey(): boolean {
  return !process.env.AUTH_SECRET && !process.env.MONGODB_URI;
}
