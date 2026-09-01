import { NextResponse } from "next/server";

/**
 * Deterministic placeholder stone imagery.
 *
 * A dealer's real catalogue is photographs of the actual stones — that is the whole
 * product. This demo has no photographs, so each stone is drawn from its slug: the same
 * stone always renders the same way, and each view catches the light differently.
 *
 * It is drawn as a real brilliant cut rather than a flat polygon — a girdle outline, a
 * table facet, radiating crown facets shaded individually, a highlight and a cast shadow —
 * because a flat shape reads as a broken image and makes the whole shop look unfinished.
 *
 * This is not the production image path. A real catalogue stores photograph URLs in
 * `gem.images[].url` and this route is simply unused.
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Hue, saturation and lightness per variety, so an emerald reads green and a ruby red. */
const VARIETY: Record<string, { h: number; s: number; l: number }> = {
  emerald: { h: 154, s: 62, l: 34 },
  ruby: { h: 348, s: 68, l: 41 },
  spinel: { h: 340, s: 58, l: 47 },
  sapphire: { h: 219, s: 62, l: 40 },
  aquamarine: { h: 187, s: 52, l: 60 },
  topaz: { h: 338, s: 44, l: 70 },
  tourmaline: { h: 128, s: 46, l: 43 },
  peridot: { h: 76, s: 58, l: 45 },
  garnet: { h: 8, s: 58, l: 38 },
  quartz: { h: 274, s: 30, l: 58 },
};

function hsl(h: number, s: number, l: number, a = 1): string {
  const clampedL = Math.max(4, Math.min(94, l));
  const clampedS = Math.max(0, Math.min(100, s));
  return a === 1 ? `hsl(${h} ${clampedS}% ${clampedL}%)` : `hsl(${h} ${clampedS}% ${clampedL}% / ${a})`;
}

/** Points of a regular polygon, rotated. */
function polygon(sides: number, r: number, cx: number, cy: number, rot: number, squash = 1) {
  const pts: [number, number][] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = (i / sides) * Math.PI * 2 + rot;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * squash]);
  }
  return pts;
}

const toPath = (pts: [number, number][]) =>
  pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; index: string }> },
) {
  const { slug, index } = await params;

  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 120);
  const view = Math.min(Math.max(Number.parseInt(index, 10) || 1, 1), 8);
  const seed = hash(`${safeSlug}:${view}`);

  const key = Object.keys(VARIETY).find((k) => safeSlug.includes(k)) ?? "quartz";
  const base = VARIETY[key];

  // Each view is lit slightly differently, as a stone is when it is turned.
  const tilt = ((seed % 7) - 3) * 3;
  const lightShift = ((seed >> 4) % 5) - 2;

  const deep = hsl(base.h, base.s + 10, base.l - 18);
  const mid = hsl(base.h, base.s, base.l + lightShift);
  const light = hsl(base.h, base.s - 14, base.l + 20);
  const pale = hsl(base.h, base.s - 26, base.l + 34);

  const cx = 300;
  const cy = 296;
  const r = 176 + ((seed >> 8) % 26);
  const sides = 8;
  const rot = ((seed >> 11) % 40) * (Math.PI / 180);

  const girdle = polygon(sides, r, cx, cy, rot);
  const crown = polygon(sides, r * 0.7, cx, cy, rot + Math.PI / sides);
  const table = polygon(sides, r * 0.4, cx, cy, rot);

  // Crown facets: one wedge per side, each shaded by its angle to the light.
  const facets: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = girdle[i];
    const b = girdle[(i + 1) % sides];
    const m = crown[i];
    const angle = (i / sides) * Math.PI * 2 + rot;
    // Light sits upper-left, so facets facing that way are brightest.
    const facing = Math.cos(angle - Math.PI * 1.25);
    const l = base.l + facing * 16 + lightShift;
    facets.push(
      `<polygon points="${toPath([a, b, m])}" fill="${hsl(base.h, base.s - 4, l)}"/>`,
    );
  }

  // Table facets: a star from the table edge to the crown, catching more light.
  const stars: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = table[i];
    const b = table[(i + 1) % sides];
    const m = crown[(i + 1) % sides];
    const angle = (i / sides) * Math.PI * 2 + rot;
    const facing = Math.cos(angle - Math.PI * 1.15);
    stars.push(
      `<polygon points="${toPath([a, b, m])}" fill="${hsl(base.h, base.s - 12, base.l + 14 + facing * 12)}" opacity="0.92"/>`,
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${key} gemstone">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#faf7f2"/>
      <stop offset="100%" stop-color="#ece5d9"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${mid}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${mid}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tableFill" x1="18%" y1="4%" x2="82%" y2="96%">
      <stop offset="0%" stop-color="${pale}"/>
      <stop offset="46%" stop-color="${light}"/>
      <stop offset="100%" stop-color="${mid}"/>
    </linearGradient>
    <linearGradient id="rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${deep}" stop-opacity="0.6"/>
    </linearGradient>
  </defs>

  <rect width="600" height="600" fill="url(#bg)"/>

  <!-- the colour a stone throws onto the plate around it -->
  <circle cx="${cx}" cy="${cy}" r="${r * 1.5}" fill="url(#glow)"/>
  <ellipse cx="${cx + 8}" cy="${cy + r * 0.92}" rx="${r * 0.78}" ry="${r * 0.13}" fill="${deep}" opacity="0.26"/>

  <g transform="rotate(${tilt} ${cx} ${cy})">
    <polygon points="${toPath(girdle)}" fill="${deep}"/>
    ${facets.join("\n    ")}
    <polygon points="${toPath(crown)}" fill="${mid}" opacity="0.55"/>
    ${stars.join("\n    ")}
    <polygon points="${toPath(table)}" fill="url(#tableFill)"/>

    <polygon points="${toPath(girdle)}" fill="none" stroke="url(#rim)" stroke-width="2.5"/>
    <polygon points="${toPath(crown)}" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1"/>
    <polygon points="${toPath(table)}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.2"/>

    <!-- specular highlight on the table -->
    <ellipse cx="${cx - r * 0.16}" cy="${cy - r * 0.2}" rx="${r * 0.2}" ry="${r * 0.09}"
      fill="#ffffff" opacity="0.5" transform="rotate(-34 ${cx - r * 0.16} ${cy - r * 0.2})"/>
    <ellipse cx="${cx + r * 0.26}" cy="${cy + r * 0.24}" rx="${r * 0.09}" ry="${r * 0.04}"
      fill="#ffffff" opacity="0.28" transform="rotate(-34 ${cx + r * 0.26} ${cy + r * 0.24})"/>
  </g>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
