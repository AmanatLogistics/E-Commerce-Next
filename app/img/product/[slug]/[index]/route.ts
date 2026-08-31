import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site-config";

/**
 * Deterministic placeholder product imagery.
 *
 * The demo catalogue has to render somewhere with no image provider configured and no
 * outbound network, so each product's images are generated here from its slug: the same
 * slug always yields the same picture. They are drawn in the design system's own palette
 * so the grid looks composed rather than like broken placeholders.
 *
 * This is demo scaffolding, not the production image path. A real catalogue stores
 * provider URLs in `product.images[].url` and this route is simply unused.
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Hues sampled around the Blueprint & Brass palette, never a random rainbow. */
const PALETTES = [
  { bg: "#E4EBEE", panel: "#CBD9DF", ink: "#0B1A24", mark: "#0E5A74" },
  { bg: "#EAF0F0", panel: "#CFDEDD", ink: "#0B1A24", mark: "#127268" },
  { bg: "#F0EDE4", panel: "#E0D7C0", ink: "#221B08", mark: "#8A6510" },
  { bg: "#E7EAEF", panel: "#CED5E0", ink: "#0D1520", mark: "#2A4A7B" },
];

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; index: string }> },
) {
  const { slug, index } = await params;

  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 100);
  const view = Math.min(Math.max(Number.parseInt(index, 10) || 1, 1), 8);
  const seed = hash(`${safeSlug}:${view}`);
  const palette = PALETTES[hash(safeSlug) % PALETTES.length];

  const label = escapeXml(
    safeSlug.split("-").slice(0, 4).join(" ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );

  // A simple, stable composition: a tinted plate, an off-centre block, and two rules.
  const cx = 300 + ((seed >> 3) % 120) - 60;
  const cy = 300 + ((seed >> 7) % 100) - 50;
  const w = 200 + ((seed >> 11) % 140);
  const h = 150 + ((seed >> 13) % 160);
  const r = 6 + ((seed >> 17) % 10);
  const rot = ((seed >> 19) % 14) - 7;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${label}">
  <rect width="600" height="600" fill="${palette.bg}"/>
  <rect x="40" y="40" width="520" height="520" rx="10" fill="${palette.panel}"/>
  <g transform="rotate(${rot} ${cx} ${cy})">
    <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${r}" fill="${palette.mark}" opacity="0.92"/>
    <rect x="${cx - w / 2 + 16}" y="${cy - h / 2 + 16}" width="${Math.max(w - 32, 20)}" height="${Math.max(h / 3, 12)}" rx="${Math.max(r - 3, 2)}" fill="${palette.bg}" opacity="0.55"/>
  </g>
  <text x="40" y="580" font-family="system-ui, sans-serif" font-size="19" font-weight="600" fill="${palette.ink}" opacity="0.62">${label}</text>
  <text x="560" y="580" text-anchor="end" font-family="system-ui, sans-serif" font-size="15" fill="${palette.ink}" opacity="0.38">${siteConfig.name} · ${view}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
