"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * The error boundary shows the digest rather than the message: Next redacts server error
 * messages in production, and the digest is what correlates this screen with the server log.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-16 text-center">
      <p className="label-caps">Something went wrong</p>
      <h1 className="text-h1 mt-3">We could not load this page</h1>
      <p className="mt-3 text-ink-muted">
        This is our fault, not yours. Trying again often works; if it does not, the
        collection and the contact page are still available.
      </p>
      <p className="mt-3 text-sm text-ink-muted">
        Running this site yourself? Open{" "}
        <a href="/api/health" className="underline hover:text-brand">
          /api/health
        </a>{" "}
        — it reports whether the database is reachable and what configuration is missing.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" asChild>
          <Link href="/collection">Browse the collection</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="mt-10 text-sm text-ink-muted">
          Reference for support: <code>{error.digest}</code>
        </p>
      )}
    </main>
  );
}
