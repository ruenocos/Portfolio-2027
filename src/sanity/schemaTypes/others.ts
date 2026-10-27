import { defineArrayMember, defineField, defineType } from "sanity";

// A Playground post: one picture or loop on the masonry board (v08). The
// board sizes it from the image, so the still sets the ratio.
export const playgroundPiece = defineType({
  name: "playgroundPiece",
  title: "Playground post",
  type: "document",
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
    defineField({ name: "order", type: "number", initialValue: 10 }),
  ],
  orderings: [{ title: "Order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: { select: { title: "title", media: "image" } },
});

export const timelineEntry = defineType({
  name: "timelineEntry",
  title: "Timeline entry",
  type: "document",
  fields: [
    defineField({ name: "period", type: "string", description: "Like \"2021 to now\".", validation: (rule) => rule.required() }),
    defineField({ name: "role", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "place", type: "string" }),
    defineField({ name: "story", title: "One-line story", type: "string" }),
    defineField({ name: "highlight", title: "Show on Home", type: "boolean", initialValue: false }),
    defineField({ name: "order", type: "number", initialValue: 10 }),
  ],
  preview: { select: { title: "role", subtitle: "period" } },
});

export const proofNumber = defineType({
  name: "proofNumber",
  title: "Proof number",
  type: "document",
  fields: [
    defineField({ name: "value", type: "string", description: "Like \"3h\" or \"40+\".", validation: (rule) => rule.required() }),
    defineField({ name: "label", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "project", type: "reference", to: [{ type: "caseStudy" }] }),
    defineField({ name: "order", type: "number", initialValue: 10 }),
  ],
  preview: { select: { title: "value", subtitle: "label" } },
});

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", initialValue: "Wessel" }),
    defineField({ name: "role", type: "string" }),
    defineField({ name: "headline", type: "string", description: "The big hero line." }),
    defineField({ name: "intro", type: "text", rows: 2 }),
    defineField({ name: "positioning", type: "text", rows: 2, description: "Also used as the site description for Google." }),
    defineField({ name: "email", type: "string" }),
    defineField({ name: "linkedin", title: "LinkedIn URL", type: "url" }),
    defineField({
      name: "whatIDo",
      title: "What I do",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "title", type: "string" }),
            defineField({ name: "text", type: "string" }),
          ],
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
