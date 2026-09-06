import { GemPhoto } from "@/components/gem/gem-photo";
import Link from "next/link";
import type { GemCardView } from "@/lib/gems/queries";
import { GemPrice } from "./price";
import { cn } from "@/lib/cn";

/**
 * The catalogue card. Follows the conventions of the category: a large square image on a
 * pale plate, a second view revealed on hover, a corner badge for anything the buyer
 * should notice, then variety, name, the attributes they compare on, and the price.
 */
export function GemCard({
  gem,
  priority = false,
  secondImage,
}: {
  gem: GemCardView;
  priority?: boolean;
  /** The second view, swapped in on hover. Absent for a stone with a single image. */
  secondImage?: string;
}) {
  const untreated = /^none/i.test(gem.treatment);
  const sold = gem.status === "sold";

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-plate">
        <GemPhoto
          src={gem.image}
          alt={gem.imageAlt}
          width={600}
          height={600}
          priority={priority}
          sizes="(min-width: 1100px) 23vw, (min-width: 640px) 31vw, 46vw"
          className={cn(
            "size-full object-cover transition-opacity duration-500",
            secondImage && "group-hover:opacity-0",
            sold && "opacity-60",
          )}
        />
        {secondImage && (
          <GemPhoto
            src={secondImage}
            alt=""
            ariaHidden
            width={600}
            height={600}
            sizes="(min-width: 1100px) 23vw, (min-width: 640px) 31vw, 46vw"
            className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        {/* One badge only. Stacking three of them is how a grid starts to look like a sale bin. */}
        {sold ? (
          <span className="absolute left-3 top-3 rounded-[var(--radius-sm)] bg-ink/85 px-2.5 py-1 text-xs uppercase tracking-[var(--tracking-nav)] text-white">
            Sold
          </span>
        ) : gem.status === "reserved" ? (
          <span className="absolute left-3 top-3 rounded-[var(--radius-sm)] bg-gold px-2.5 py-1 text-xs uppercase tracking-[var(--tracking-nav)] text-gold-ink">
            Reserved
          </span>
        ) : untreated ? (
          <span className="absolute left-3 top-3 rounded-[var(--radius-sm)] bg-surface/95 px-2.5 py-1 text-xs uppercase tracking-[var(--tracking-nav)] text-brand">
            Untreated
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col items-center gap-1.5 px-1 pt-4 text-center">
        <p className="label-caps">{gem.categorySlug.replace(/-/g, " ")}</p>

        <h3 className="font-display text-h3 leading-snug text-ink">
          {/* Stretched link: the whole card is the target, only the name is announced. */}
          <Link href={`/gem/${gem.slug}`} className="after:absolute after:inset-0">
            {gem.title}
          </Link>
        </h3>

        <p className="text-sm text-ink-muted">
          {gem.caratWeight.toFixed(2)} ct · {gem.shape} · {gem.origin.split(",")[0]}
        </p>

        <div className="mt-1.5">
          <GemPrice priceMinor={gem.priceMinor} size="sm" />
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
    <div className="gem-grid stagger">
      {gems.map((gem, index) => (
        <GemCard
          key={gem.id}
          gem={gem}
          priority={index < priorityCount}
          secondImage={gem.secondImage}
        />
      ))}
    </div>
  );
}
