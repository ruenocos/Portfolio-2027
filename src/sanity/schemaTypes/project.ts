import { defineArrayMember, defineField, defineType } from "sanity";
import { TOOLS } from "../../lib/tools";

// A project: one row on Home and Work (DESIGN.md §6, Project row). The case
// study story is added to the same document with the case page.
export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  groups: [
    { name: "row", title: "Row", default: true },
    { name: "media", title: "Media" },
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
    defineField({
      name: "hasCase",
      title: "Case page is live",
      type: "boolean",
      group: "row",
      initialValue: false,
      description: "Off: the media says \"Case study soon\" instead of linking.",
    }),
    defineField({ name: "featured", title: "Show on Home", type: "boolean", group: "row", initialValue: true }),
    defineField({ name: "order", type: "number", group: "row", initialValue: 10 }),
    defineField({
      name: "poster",
      title: "Portrait poster",
      type: "image",
      group: "media",
      description: "3:4, shown while the loop loads and whenever motion is paused.",
      options: { hotspot: true },
    }),
    defineField({
      name: "video",
      title: "Portrait loop",
      type: "file",
      group: "media",
      options: { accept: "video/mp4,video/webm" },
      description: "3:4, muted, plays at 0.75×. Keep it under 10 MB.",
    }),
  ],
  orderings: [{ title: "Order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: { select: { title: "title", subtitle: "timeline", media: "poster" } },
});
