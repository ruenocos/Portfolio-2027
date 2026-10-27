import type { StructureResolver } from "sanity/structure";

// Home and Site settings are one fixed document each; everything else is a list.
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem().title("Home").id("home").child(S.document().schemaType("home").documentId("home")),
      S.documentTypeListItem("project").title("Projects"),
      S.divider(),
      S.listItem()
        .title("Site settings")
        .id("siteSettings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
      S.divider(),
      S.documentTypeListItem("caseStudy").title("Old case studies"),
      S.documentTypeListItem("playgroundPiece").title("Playground"),
      S.documentTypeListItem("timelineEntry").title("Timeline"),
      S.documentTypeListItem("proofNumber").title("Proof numbers"),
    ]);
