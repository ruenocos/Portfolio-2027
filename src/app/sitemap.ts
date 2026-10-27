import type { MetadataRoute } from "next";
import { PAGES, SITE_URL } from "@/lib/site";

// Case pages join this in Phase 4, from Sanity.
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));
}
