import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings";

/**
 * A stone that has been sold and taken down leaves a real, linked-to URL behind, so this
 * page is a normal part of the catalogue's life rather than an error state. It says so.
 */
export default async function NotFound() {
  const site = await getSiteSettings();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-16 text-center">
      <p className="label-caps">404</p>
      <h1 className="text-h1 mt-3">We could not find that page</h1>
      <p className="mt-3 text-ink-muted">
        If you followed a link to a particular stone, it has most likely been sold and taken
        down. The collection changes often, and we can usually find something comparable.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/collection">Browse the collection</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/contact">Tell us what you are looking for</Link>
        </Button>
      </div>
      <p className="mt-10 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand">
          {site.name}
        </Link>
      </p>
    </main>
  );
}
