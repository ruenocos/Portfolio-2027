import type { NextConfig } from "next";

// Basic hardening for every response. No CSP yet: Sanity Studio and the
// draft-mode overlay need their own allowances, worth doing with analytics.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // Netlify's Image CDN resizes /public pictures (lib/image). Netlify sets NETLIFY at build.
  env: { NEXT_PUBLIC_IMAGE_CDN: process.env.NETLIFY ? "netlify" : "" },
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
