import Image from "next/image";
import Link from "next/link";
import type { GemCardView } from "@/lib/gems/queries";
import { GemPrice } from "./price";
import { GemStatusBadge } from "./status-badge";
import { cn } from "@/lib/cn";

/**
 * The photograph is the product, so it gets the room. The image sits on the dark tray
 * colour in both themes — a jeweller shows a stone on a dark tray for the same reason.
 */
export function GemCard({ gem, priority = false }: { gem: GemCardView; priority?: boolean }) {
  const untreated = /^none/i.test(gem.treatment);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-md)] border bg-surface transition-colors hover:border-accent">
      <div className="relative aspect-square overflow-hidden bg-tray">
        <Image
          src={gem.image}
          alt={gem.imageAlt}
          width={600}
          height={600}
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 900px) 30vw, (min-width: 480px) 46vw, 92vw"
          className={cn(
            "size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            gem.status === "sold" && "opacity-50",
          )}
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <GemStatusBadge status={gem.status} />
          {untreated && <span className="sr-only">Untreated</span>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="label-caps">{gem.reference}</p>
        <h3 className="text-h3">
          {/* Stretched link: the whole card is the target, only the name is announced. */}
          <Link href={`/gem/${gem.slug}`} className="after:absolute after:inset-0">
            {gem.title}
          </Link>
        </h3>

        <dl className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-muted">
          <div className="flex gap-1">
            <dt className="sr-only">Carat weight</dt>
            <dd>{gem.caratWeight.toFixed(2)} ct</dd>
          </div>
          <div className="flex gap-1">
            <dt className="sr-only">Shape</dt>
            <dd>{gem.shape}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="sr-only">Origin</dt>
            <dd>{gem.origin.split(",")[0]}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <GemPrice priceMinor={gem.priceMinor} size="sm" />
          {untreated && <span className="label-caps">Untreated</span>}
        </div>
      </div>
    </article>
  );
}

export function GemGrid({
  gems,
  priorityCount = 0,
}: {
  gems: GemCardView[];
  priorityCount?: number;
}) {
  return (
    <div className="gem-grid">
      {gems.map((gem, index) => (
        <GemCard key={gem.id} gem={gem} priority={index < priorityCount} />
      ))}
    </div>
  );
}
