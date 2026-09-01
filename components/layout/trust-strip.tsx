import { siteConfig } from "@/lib/site-config";

/** The four promises, expanded. Sits above the footer on the storefront. */
export function TrustStrip() {
  return (
    <section aria-label="How we sell" className="border-y bg-surface">
      <ul className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {siteConfig.promises.map((promise) => (
          <li key={promise.title} className="text-center">
            <h3 className="font-display text-h3 text-ink">{promise.title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{promise.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
