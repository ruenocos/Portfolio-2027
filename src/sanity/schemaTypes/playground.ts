import { ImagesIcon } from "@sanity/icons/Images";
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";
import { defineField, defineType } from "sanity";
import { copiesField } from "./videoCopies";

// A Playground post: one picture or loop on the masonry board (v08). The
// board sizes it from the image, so the still sets the ratio.
export const playgroundPiece = defineType({
  name: "playgroundPiece",
  title: "Playground post",
  type: "document",
  icon: ImagesIcon,
  fields: [
    defineField({ name: "title", type: "string", description: "What it shows. Read out, and shown when opened.", validation: (rule) => rule.required() }),
    defineField({
      name: "image",
      title: "Still / poster",
      type: "image",
      description: "Any ratio. For a loop, its first frame.",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "video", title: "Loop", type: "file", options: { accept: "video/mp4,video/webm" }, description: "Optional. Muted, plays while on screen." }),
    copiesField,
    // Set by dragging in the Playground list.
    orderRankField({ type: "playgroundPiece", newItemPosition: "before" }),
  ],
  orderings: [orderRankOrdering],
  preview: { select: { title: "title", media: "image" } },
});
