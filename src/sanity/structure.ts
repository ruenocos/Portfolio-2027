import type { StructureResolver } from "sanity/structure";

// Site settings is one fixed document; everything else is a list.
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Site settings")
        .id("siteSettings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
      S.divider(),
      S.documentTypeListItem("caseStudy").title("Case studies"),
      S.documentTypeListItem("playgroundPiece").title("Playground"),
      S.documentTypeListItem("timelineEntry").title("Timeline"),
      S.documentTypeListItem("proofNumber").title("Proof numbers"),
    ]);
