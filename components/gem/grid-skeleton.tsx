/**
 * Suspense fallback for the gem grid. It mirrors the grid's real geometry so the page does
 * not jump when the results arrive.
 *
 * Used as a Suspense boundary *inside* a page, never as a route-level `loading.tsx`. A
 * route-level loading file makes the whole route stream, and a streamed response has
 * already sent 200 by the time a page calls notFound() — which would make every unknown
 * variety and every sold stone answer 200 instead of 404.
 */
export function GemGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div>
      <div className="gem-grid">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[var(--radius-md)] border">
            <div className="aspect-square animate-pulse bg-surface-sunken" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-surface-sunken" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-sunken" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-sunken" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        Loading stones
      </span>
    </div>
  );
}
