import Image from "next/image";
import { isRemoteImage } from "@/lib/image-src";
import { cn } from "@/lib/cn";

/**
 * One image component for photographs whose address a dealer typed.
 *
 * next/image is the right thing for pictures we host: it resizes, re-encodes and serves them
 * from our own domain. It is the wrong thing for an address pasted from somewhere else,
 * because optimizing means OUR server fetches THAT url — so a text box in the admin panel
 * would become a way to make our infrastructure issue arbitrary outbound requests, and to
 * spend our bandwidth serving someone else's files. It would also mean every host a dealer
 * ever pastes has to be listed in next.config.ts before the picture appears at all, which is
 * the opposite of "paste any link".
 *
 * So: our own paths go through next/image, and remote addresses are handed to the browser as
 * a plain <img>. The browser fetches them directly, exactly as it would on any other site.
 *
 * The props are next/image's, minus the ones that only mean something to the optimizer.
 */
export function GemPhoto({
  src,
  alt,
  width,
  height,
  sizes,
  priority,
  className,
  style,
  ariaHidden,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaHidden?: boolean;
}) {
  /*
   * Every photograph fades in rather than snapping from the empty plate to full colour.
   * It costs nothing — the animation runs on the compositor — and it is the difference
   * between a catalogue that pops and one that develops.
   */
  const withFade = cn("photo-in", className);

  if (isRemoteImage(src)) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element --
         Deliberate. Optimizing a remote address would make THIS server fetch it, which is
         exactly what the component exists to avoid. See the note above. */
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        // A broken link should leave a quiet empty frame, not a torn-page icon over the grid.
        className={withFade}
        style={style}
        aria-hidden={ariaHidden}
        // Do not leak which stone a buyer is looking at to the image's host.
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={withFade}
      style={style}
      aria-hidden={ariaHidden}
    />
  );
}
