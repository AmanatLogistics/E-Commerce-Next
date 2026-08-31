"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { GemImage } from "@/lib/db/documents";

/**
 * Stone gallery: manual navigation with arrows on desktop and swipe on mobile, visible
 * thumbnails rather than a dot indicator, and click-to-zoom on the active image. No
 * autoplay — a buyer inspecting a stone is in control of what they look at.
 */
export function GemGallery({ images, title }: { images: GemImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
      setZoomed(false);
    },
    [count],
  );

  if (count === 0) return null;
  const active = images[index];

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(index + 1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(index - 1);
        }
      }}
    >
      <div
        className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] border bg-tray"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start === null) return;
          const delta = event.changedTouches[0].clientX - start;
          // 40px threshold, so a tap or a vertical scroll is not read as a swipe.
          if (Math.abs(delta) < 40) return;
          go(delta < 0 ? index + 1 : index - 1);
        }}
      >
        <button
          type="button"
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
          aria-pressed={zoomed}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            setOrigin(`${x}% ${y}%`);
            setZoomed((value) => !value);
          }}
          className={cn("block size-full", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
        >
          <Image
            key={active.url}
            src={active.url}
            alt={active.alt || `${title} — view ${index + 1} of ${count}`}
            width={active.width}
            height={active.height}
            priority={index === 0}
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="size-full object-cover transition-transform duration-200"
            style={{ transform: zoomed ? "scale(2.4)" : "scale(1)", transformOrigin: origin }}
          />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous view"
              className="absolute left-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-[var(--radius-full)] border bg-surface/90 text-ink shadow-e1 hover:bg-surface sm:flex"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next view"
              className="absolute right-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-[var(--radius-full)] border bg-surface/90 text-ink shadow-e1 hover:bg-surface sm:flex"
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        )}

        <p className="pointer-events-none absolute bottom-2 right-2 rounded-[var(--radius-sm)] bg-black/60 px-2 py-0.5 text-xs text-white">
          {index + 1} / {count}
        </p>
      </div>

      {count > 1 && (
        <ul className="flex gap-2" aria-label="Stone views">
          {images.map((image, i) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Show view ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "block size-16 overflow-hidden rounded-[var(--radius-md)] border bg-tray transition-colors sm:size-20",
                  i === index ? "border-accent" : "hover:border-ink-muted",
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  width={160}
                  height={160}
                  sizes="80px"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="sr-only" aria-live="polite">
        View {index + 1} of {count}
      </p>
    </div>
  );
}
