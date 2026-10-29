import { ProjectsIcon } from "@sanity/icons/Projects";
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";
import { defineArrayMember, defineField, defineType } from "sanity";
import { TOOLS } from "../../lib/tools";
import { copiesField } from "./videoCopies";

// A project: one row on Home and Work (DESIGN.md §6, Project row), and its
// case page when it has one (case-study-spec v02), all in one document.
export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  icon: ProjectsIcon,
  description:
    "Home and Work show the built-in rows until a project is published here, then only published ones. Publish all of them together.",
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
    defineField({
      name: "hasCase",
      title: "Case page is live",
      type: "boolean",
      group: "row",
      initialValue: false,
      description: "Off: the project's page is the short one (title, summary, video, facts). On: the full case below.",
      validation: (rule) =>
        rule.custom((on, { document }) =>
          on && !(document?.sections as unknown[] | undefined)?.length
            ? { message: "The case page has no sections yet, so it shows the mock case.", level: "warning" }
            : true,
        ),
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
        defineField({ name: "caption", type: "string" }),
      ],
    }),
    defineField({
      name: "sections",
      type: "array",
      group: "case",
      description: "The read. Each one is a layer in the panel.",
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
              type: "image",
              fields: [
                defineField({ name: "alt", type: "string", validation: (rule) => rule.required() }),
                defineField({ name: "caption", type: "string" }),
              ],
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
