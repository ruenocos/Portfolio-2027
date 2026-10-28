import { defineArrayMember, defineField, defineType } from "sanity";

// About (one fixed document). Every field is optional: what's empty keeps
// the approved copy that ships with the site (src/content/about.ts).
export const about = defineType({
  name: "about",
  title: "About",
  type: "document",
  fields: [
    defineField({ name: "hello", type: "string", description: "The page title, like \"Hi, I’m Wessel.\"" }),
    defineField({ name: "lead", type: "text", rows: 2 }),
    defineField({
      name: "photos",
      type: "array",
      description: "The tossable stack, top photo first. Portrait 3:4.",
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [defineField({ name: "alt", title: "Alt text", type: "string", validation: (rule) => rule.required() })],
        }),
      ],
    }),
    defineField({
      name: "facts",
      type: "array",
      description: "Three, like Now / Studied / Looking for.",
      of: [
        defineArrayMember({
          type: "object",
          name: "aboutFact",
          fields: [
            defineField({ name: "label", type: "string", validation: (rule) => rule.required() }),
            defineField({ name: "value", type: "string", validation: (rule) => rule.required() }),
            defineField({ name: "sub", type: "string" }),
          ],
        }),
      ],
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: "experience",
      type: "array",
      description: "Newest first. Work and school in one list.",
      of: [
        defineArrayMember({
          type: "object",
          name: "job",
          fields: [
            defineField({ name: "when", type: "string", description: "Like \"Jul 2024 – now\".", validation: (rule) => rule.required() }),
            defineField({ name: "place", type: "string", validation: (rule) => rule.required() }),
            defineField({ name: "role", type: "string", validation: (rule) => rule.required() }),
            defineField({ name: "case", title: "Case page", type: "reference", to: [{ type: "project" }] }),
          ],
          preview: { select: { title: "place", subtitle: "when" } },
        }),
      ],
    }),
    defineField({
      // v09 (2026-10-28): replaces the old "stickers" list (tone + shape).
      name: "offScreen",
      title: "Off screen stickers",
      description: "The shape is the kind of thing and sets the fill.",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "sticker",
          fields: [
            defineField({ name: "text", type: "string", validation: (rule) => rule.required().max(24) }),
            defineField({
              name: "kind",
              type: "string",
              options: {
                list: [
                  { title: "Card · card and board games", value: "card" },
                  { title: "Square · making and learning", value: "square" },
                  { title: "Round · moving", value: "round" },
                  { title: "Pill · people and play", value: "pill" },
                ],
                layout: "radio",
              },
              initialValue: "pill",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: "text", subtitle: "kind" } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "About" }) },
});
