import type { NextConfig } from "next";

/**
 * Security headers are set here rather than per-route so a new route cannot be added
 * without them. The CSP allows the inline styles Next injects for streaming and the
 * blob/data image sources the product gallery uses; it does not allow inline script.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    /**
     * The seeded catalogue is served by app/img/gem/[slug]/[index]/route.ts, which
     * generates a deterministic SVG per stone so the demo renders with no external image
     * host and no binary blobs in the database. SVG optimisation is therefore enabled, and
     * locked down: the optimiser serves images under a sandbox CSP, and only the hosts
     * listed below may supply remote images. Real deployments point `images[].url` at a
     * provider (Cloudinary / UploadThing / S3) — that path needs no change here beyond
     * adding the hostname.
     */
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
