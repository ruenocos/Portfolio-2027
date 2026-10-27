import type { MetadataRoute } from "next";
import { IS_PRODUCTION, SITE_URL } from "@/lib/site";

// Deploy previews stay out of search. Production hides the Studio,
// the token page and the API.
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio", "/system", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
