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
  // The widths lib/image asks /_next/image for, so the optimizer accepts them.
  images: { deviceSizes: [640, 960, 1280, 1600, 2000], imageSizes: [160, 320, 480] },
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
