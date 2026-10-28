import { HomeIcon } from "@sanity/icons/Home";
import { ImagesIcon } from "@sanity/icons/Images";
import { ProjectsIcon } from "@sanity/icons/Projects";
import { UserIcon } from "@sanity/icons/User";
import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list";
import type { StructureResolver } from "sanity/structure";

// Home and About are one fixed document each. Projects and Playground posts
// are lists in the order the site shows them: drag to reorder.
export const structure: StructureResolver = (S, context) =>
  S.list()
    .title("Content")
    .items([
      S.listItem().title("Home").id("home").icon(HomeIcon).child(S.document().schemaType("home").documentId("home")),
      S.listItem().title("About").id("about").icon(UserIcon).child(S.document().schemaType("about").documentId("about")),
      S.divider(),
      orderableDocumentListDeskItem({ type: "project", title: "Projects", icon: ProjectsIcon, S, context }),
      orderableDocumentListDeskItem({ type: "playgroundPiece", title: "Playground", icon: ImagesIcon, S, context }),
    ]);
