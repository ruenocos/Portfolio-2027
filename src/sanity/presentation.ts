import { defineDocuments, defineLocations, type PresentationPluginOptions } from "sanity/presentation";

// Tells the Studio which page shows which document, for click-to-edit.
export const resolve: PresentationPluginOptions["resolve"] = {
  mainDocuments: defineDocuments([
    { route: "/", filter: `_type == "home" && _id == "home"` },
    { route: "/about", filter: `_type == "about" && _id == "about"` },
    { route: "/work/:slug", filter: `_type == "project" && slug.current == $slug` },
  ]),
  locations: {
    home: defineLocations({ message: "The home page", locations: [{ title: "Home", href: "/" }] }),
    about: defineLocations({ message: "The About page", locations: [{ title: "About", href: "/about" }] }),
    project: defineLocations({
      select: { title: "title", slug: "slug.current", hasCase: "hasCase" },
      resolve: (doc) => ({
        locations: [
          ...(doc?.hasCase && doc?.slug ? [{ title: doc.title || "Case", href: `/work/${doc.slug}` }] : []),
          { title: "Work", href: "/work" },
          { title: "Home", href: "/" },
        ],
      }),
    }),
    playgroundPiece: defineLocations({ message: "On the Playground", locations: [{ title: "Playground", href: "/playground" }] }),
  },
};
