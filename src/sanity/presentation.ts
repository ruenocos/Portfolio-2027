import { defineDocuments, defineLocations, type PresentationPluginOptions } from "sanity/presentation";

// Tells the Studio which page shows which document, for click-to-edit.
export const resolve: PresentationPluginOptions["resolve"] = {
  mainDocuments: defineDocuments([
    { route: "/work/:slug", filter: `_type == "caseStudy" && slug.current == $slug` },
  ]),
  locations: {
    siteSettings: defineLocations({
      message: "Used on every page",
      locations: [{ title: "Home", href: "/" }],
    }),
    caseStudy: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) => ({
        locations: [
          { title: doc?.title || "Case study", href: `/work/${doc?.slug}` },
          { title: "Home", href: "/" },
        ],
      }),
    }),
  },
};
