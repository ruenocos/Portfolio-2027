import { defineArrayMember, defineField, defineType } from "sanity";

export const playgroundPiece = defineType({
  name: "playgroundPiece",
  title: "Playground piece",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "kind", type: "string", description: "Like \"Micro-interaction\" or \"Type motion\"." }),
    defineField({ name: "media", type: "media", validation: (rule) => rule.required() }),
    defineField({ name: "note", type: "text", rows: 2 }),
    defineField({ name: "link", type: "url" }),
    defineField({ name: "order", type: "number", initialValue: 10 }),
  ],
  preview: { select: { title: "title", subtitle: "kind", media: "media.image" } },
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
