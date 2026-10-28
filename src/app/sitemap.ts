import type { MetadataRoute } from "next";
import { caseSlugs } from "@/content/get";
import { PAGES, SITE_URL } from "@/lib/site";

// The real pages plus every case page that's built (the same list as
// generateStaticParams in work/[slug]).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = [...PAGES, ...(await caseSlugs()).map((slug) => `/work/${slug}`)];
  return paths.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));
}
