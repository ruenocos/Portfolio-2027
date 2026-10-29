import type { NextConfig } from "next";

// Basic hardening for every response. No CSP yet: Sanity Studio and the
// draft-mode overlay need their own allowances, worth doing with analytics.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

// Production answers on its own domain only. Vercel also serves each
// production build on *.vercel.app addresses; those send visitors (and
// search engines) to the real one with a permanent redirect. Previews are
// left alone, they're built with VERCEL_ENV=preview.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const redirectVercelApp =
  process.env.VERCEL_ENV === "production" && productionHost && !productionHost.endsWith(".vercel.app");

const nextConfig: NextConfig = {
  // The widths lib/image asks /_next/image for, so the optimizer accepts them.
  // Resized copies stay cached for a week, which also spares Vercel's monthly
  // image-optimisation quota.
  images: { deviceSizes: [640, 960, 1280, 1600, 2000], imageSizes: [160, 320, 480], minimumCacheTTL: 604800 },
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    if (!redirectVercelApp) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: ".+\\.vercel\\.app" }],
        destination: `https://${productionHost}/:path*`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Pictures and loops in /public: a week in the browser (they went out
      // with max-age=0, so every visit asked again). A file that changes
      // gets a new name, or shows after a week at the latest.
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
};

export default nextConfig;
