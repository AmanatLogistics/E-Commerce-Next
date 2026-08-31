import { NextResponse } from "next/server";

/**
 * Deterministic placeholder stone imagery.
 *
 * A gem dealer's real catalogue is photographs of the actual stones — that is the whole
 * product. This demo has no photographs, so each stone's images are generated from its
 * slug and its variety's hue: the same stone always renders the same way. They are drawn
 * on the dark tray colour so the grid reads as a jeweller's tray rather than as a wall of
 * broken images.
 *
 * This is demo scaffolding, not the production image path. A real catalogue stores
 * photograph URLs in `gem.images[].url` and this route is simply unused.
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Hue and saturation per gem variety, so an emerald renders green and a ruby red. */
const VARIETY_HUES: Record<string, { h: number; s: number; l: number }> = {
  emerald: { h: 152, s: 58, l: 38 },
  ruby: { h: 350, s: 62, l: 42 },
  spinel: { h: 342, s: 48, l: 48 },
  sapphire: { h: 218, s: 58, l: 42 },
  aquamarine: { h: 188, s: 45, l: 58 },
  topaz: { h: 340, s: 38, l: 66 },
  tourmaline: { h: 118, s: 42, l: 44 },
  peridot: { h: 78, s: 55, l: 46 },
  garnet: { h: 12, s: 55, l: 40 },
  quartz: { h: 276, s: 32, l: 54 },
};

function hslToCss(h: number, s: number, l: number): string {
  return `hsl(${h} ${s}% ${l}%)`;
}

/** A faceted outline: a table facet inside a rotated polygon, per shape family. */
function facetPolygon(sides: number, radius: number, cx: number, cy: number, rot: number): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2 + rot;
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`);
  }
  return points.join(" ");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; index: string }> },
) {
  const { slug, index } = await params;

  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 120);
  const view = Math.min(Math.max(Number.parseInt(index, 10) || 1, 1), 8);
  const seed = hash(`${safeSlug}:${view}`);

  const varietyKey =
    Object.keys(VARIETY_HUES).find((key) => safeSlug.includes(key)) ?? "quartz";
  const base = VARIETY_HUES[varietyKey];

  // Each view shifts lightness slightly, as different angles catch different light.
  const lift = ((seed % 5) - 2) * 4;
  const stone = hslToCss(base.h, base.s, Math.min(78, Math.max(22, base.l + lift)));
  const stoneDeep = hslToCss(base.h, Math.min(85, base.s + 12), Math.max(14, base.l - 16));
  const stoneLight = hslToCss(base.h, Math.max(18, base.s - 18), Math.min(88, base.l + 26));

  const sides = 6 + (seed % 3);
  const rot = ((seed >> 5) % 60) * (Math.PI / 180);
  const radius = 168 + ((seed >> 9) % 40);
  const cx = 300;
  const cy = 300;

  const outer = facetPolygon(sides, radius, cx, cy, rot);
  const mid = facetPolygon(sides, radius * 0.68, cx, cy, rot + 0.26);
  const table = facetPolygon(sides, radius * 0.36, cx, cy, rot);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${varietyKey} specimen">
  <defs>
    <radialGradient id="tray" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="#232a2f"/>
      <stop offset="100%" stop-color="#0d1012"/>
    </radialGradient>
    <linearGradient id="body" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="${stoneLight}"/>
      <stop offset="55%" stop-color="${stone}"/>
      <stop offset="100%" stop-color="${stoneDeep}"/>
    </linearGradient>
  </defs>

  <rect width="600" height="600" fill="url(#tray)"/>
  <ellipse cx="${cx}" cy="${cy + radius * 0.86}" rx="${radius * 0.82}" ry="${radius * 0.14}" fill="#000" opacity="0.42"/>

  <polygon points="${outer}" fill="url(#body)"/>
  <polygon points="${mid}" fill="${stoneDeep}" opacity="0.38"/>
  <polygon points="${table}" fill="${stoneLight}" opacity="0.72"/>
  <polygon points="${outer}" fill="none" stroke="${stoneLight}" stroke-opacity="0.55" stroke-width="1.5"/>
  <polygon points="${mid}" fill="none" stroke="${stoneLight}" stroke-opacity="0.3" stroke-width="1"/>

  <ellipse cx="${cx - radius * 0.3}" cy="${cy - radius * 0.34}" rx="${radius * 0.2}" ry="${radius * 0.1}"
    fill="#ffffff" opacity="0.4" transform="rotate(-28 ${cx - radius * 0.3} ${cy - radius * 0.34})"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
