import { getSiteSettings } from "@/lib/settings";

/** The four promises, expanded. Sits above the footer on the storefront. */
export async function TrustStrip() {
  const site = await getSiteSettings();
  return (
    <section aria-label="How we sell" className="border-y bg-surface">
      <ul className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {site.promises.map((promise) => (
          <li key={promise.title} className="text-center">
            <h3 className="font-display text-h3 text-ink">{promise.title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{promise.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
