import { ProjectsIcon } from "@sanity/icons/Projects";
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";
import { defineArrayMember, defineField, defineType } from "sanity";
import { TOOLS } from "../../lib/tools";
import { copiesField } from "./videoCopies";

// One picture or loop in a media row.
const caseMedia = defineArrayMember({
  type: "object",
  name: "caseMedia",
  title: "Picture or loop",
  fields: [
    defineField({
      name: "image",
      title: "Picture",
      type: "image",
      options: { hotspot: true },
      description: "With a loop, this is its poster (shown while it loads and when motion is paused).",
    }),
    defineField({ name: "video", title: "Loop", type: "file", options: { accept: "video/mp4,video/webm" }, description: "Muted, loops. Optional." }),
    defineField({ name: "alt", type: "string", description: "What it shows, for screen readers.", validation: (rule) => rule.required() }),
  ],
  validation: (rule) =>
    rule.custom((v: { image?: unknown; video?: unknown } | undefined) => (v?.image || v?.video ? true : "Add a picture or a loop")),
  preview: { select: { title: "alt", media: "image" } },
});

// A row of 1, 2 or 3 across. Pictures in a 2 or 3 row share the first one's shape.
const mediaRow = defineArrayMember({
  type: "object",
  name: "mediaRow",
  title: "Row",
  fields: [
    defineField({
      name: "layout",
      type: "string",
      options: {
        list: [
          { title: "Full width", value: "full" },
          { title: "Two across (1/2)", value: "half" },
          { title: "Three across (1/3)", value: "third" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "full",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "items", title: "Pictures and loops", type: "array", of: [caseMedia], validation: (rule) => rule.required().min(1).max(3) }),
  ],
  preview: {
    select: { layout: "layout", items: "items", media: "items.0.image" },
    prepare: ({ layout, items, media }: { layout?: string; items?: unknown[]; media?: unknown }) => ({
      title: { full: "Full width", half: "Two across", third: "Three across" }[layout ?? "full"] ?? "Row",
      subtitle: `${items?.length ?? 0} item${items?.length === 1 ? "" : "s"}`,
      media: media as never,
    }),
  },
});

// Before and after, compared in one frame.
const compareRow = defineArrayMember({
  type: "object",
  name: "compareRow",
  title: "Before / after",
  fields: [
    defineField({ name: "before", type: "image", fields: [defineField({ name: "alt", type: "string", validation: (rule) => rule.required() })], validation: (rule) => rule.required() }),
    defineField({ name: "after", type: "image", fields: [defineField({ name: "alt", type: "string", validation: (rule) => rule.required() })], validation: (rule) => rule.required() }),
    defineField({ name: "beforeLabel", type: "string", initialValue: "Before" }),
    defineField({ name: "afterLabel", type: "string", initialValue: "After" }),
  ],
  preview: { select: { media: "after" }, prepare: ({ media }: { media?: unknown }) => ({ title: "Before / after", media: media as never }) },
});

// A project: one row on Home and Work (DESIGN.md §6, Project row) and its
// case page, all in one document. It shows once its case has a section.
export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  icon: ProjectsIcon,
  description:
    "Home and Work show the built-in rows until a project with a case is published here, then only published ones with a case.",
  groups: [
    { name: "row", title: "Row", default: true },
    { name: "media", title: "Media" },
    { name: "case", title: "Case page" },
  ],
  fields: [
    defineField({ name: "title", type: "string", group: "row", validation: (rule) => rule.required() }),
    defineField({
      name: "slug",
      type: "slug",
      group: "row",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "lang",
      title: "Title language",
      type: "string",
      group: "row",
      options: { list: [{ title: "English", value: "en" }, { title: "Dutch", value: "nl" }], layout: "radio" },
      initialValue: "en",
      description: "Dutch titles get Dutch hyphenation, so long compounds break cleanly.",
    }),
    defineField({
      name: "summary",
      type: "text",
      rows: 3,
      group: "row",
      description: "The users' problem first, then what changed. About three sentences.",
      validation: (rule) => rule.required().max(320),
    }),
    defineField({ name: "timeline", type: "string", group: "row", description: "Like \"2023–now\" or \"2026\".", validation: (rule) => rule.required() }),
    defineField({ name: "role", type: "string", group: "row", description: "Like \"Designer and developer\"." }),
    defineField({
      name: "tools",
      type: "array",
      group: "row",
      of: [defineArrayMember({ type: "string" })],
      options: { list: Object.entries(TOOLS).map(([value, t]) => ({ title: t.name, value })) },
    }),
    defineField({
      name: "note",
      title: "Wessel's pin note",
      type: "string",
      group: "row",
      description: "One short, true detail he pins on the media. Like \"The menu took longest.\"",
      validation: (rule) => rule.max(40),
    }),
    defineField({
      name: "label",
      title: "Screen reader label",
      type: "string",
      group: "row",
      description: "Read out for the media link. Like \"De Saak case study. Design, dev and SEO, 2023 to now.\"",
    }),
    // Set by dragging in the Projects list.
    orderRankField({ type: "project" }),
    defineField({
      name: "poster",
      title: "Portrait poster",
      type: "image",
      group: "media",
      description: "3:4, shown while the loop loads and whenever motion is paused. Set the focal point: the site crops around it.",
      options: { hotspot: true },
      validation: (rule) => rule.warning().required(),
    }),
    defineField({
      name: "video",
      title: "Portrait loop",
      type: "file",
      group: "media",
      options: { accept: "video/mp4,video/webm" },
      description: "3:4, muted, plays at 0.75×. Keep it under 10 MB.",
    }),
    defineField({
      name: "videoFocus",
      title: "Loop focus point",
      type: "string",
      group: "media",
      description: "The part of the loop that stays in view when it's cropped (a wide loop in a portrait frame). Match the poster's focal point.",
      options: {
        list: [
          { title: "Top left", value: "left top" },
          { title: "Top", value: "center top" },
          { title: "Top right", value: "right top" },
          { title: "Left", value: "left center" },
          { title: "Centre", value: "center" },
          { title: "Right", value: "right center" },
          { title: "Bottom left", value: "left bottom" },
          { title: "Bottom", value: "center bottom" },
          { title: "Bottom right", value: "right bottom" },
        ],
        layout: "radio",
      },
      initialValue: "center",
    }),
    { ...copiesField, group: "media" },
    defineField({ name: "lead", type: "string", group: "case", description: "One line under the title, in Lead." }),
    defineField({ name: "intro", type: "text", rows: 3, group: "case", description: "Two or three sentences next to the title." }),
    defineField({ name: "scope", type: "string", group: "case", description: "Like \"Design, dev, SEO\"." }),
    defineField({
      name: "hero",
      title: "Header video",
      type: "object",
      group: "case",
      fields: [
        defineField({ name: "video", type: "file", options: { accept: "video/mp4,video/webm" }, description: "16:9 loop, muted." }),
        copiesField,
        defineField({ name: "poster", type: "image" }),
        defineField({ name: "alt", type: "string", description: "What the loop shows, for screen readers." }),
        // Media carries itself, no captions. Hidden, not removed: older entries still hold one.
        defineField({ name: "caption", type: "string", hidden: true }),
      ],
    }),
    defineField({
      name: "sections",
      type: "array",
      group: "case",
      description: "The read. Each one is a layer in the panel. The project shows on Home and Work once one has a name and heading; small projects go on the Playground instead.",
      of: [
        defineArrayMember({
          type: "object",
          name: "caseSection",
          fields: [
            defineField({ name: "name", type: "string", description: "The layer name, like \"Problem\".", validation: (rule) => rule.required() }),
            defineField({ name: "heading", type: "string", description: "A short claim, not the name again.", validation: (rule) => rule.required() }),
            defineField({ name: "body", type: "text", rows: 5, validation: (rule) => rule.required() }),
            defineField({
              name: "figure",
              title: "Figure (single picture)",
              type: "image",
              description: "The first way to add a picture. Media rows below do more (loops, 2 or 3 across, before/after).",
              fields: [
                defineField({ name: "alt", type: "string", validation: (rule) => rule.required() }),
                defineField({ name: "caption", type: "string", hidden: true }),
              ],
            }),
            defineField({
              name: "media",
              title: "Media rows",
              type: "array",
              description: "Under the text, top to bottom. Mix them per section: a full-width loop, then two pictures side by side, say.",
              of: [mediaRow, compareRow],
            }),
            defineField({ name: "note", title: "Wessel's pin note", type: "string", validation: (rule) => rule.max(40) }),
          ],
          preview: { select: { title: "name", subtitle: "heading", media: "figure" } },
        }),
      ],
    }),
  ],
  orderings: [orderRankOrdering],
  preview: { select: { title: "title", subtitle: "timeline", media: "poster" } },
});
