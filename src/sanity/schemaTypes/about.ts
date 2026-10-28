import { UserIcon } from "@sanity/icons/User";
import { defineArrayMember, defineField, defineType } from "sanity";
import { FALLBACK_ABOUT as f } from "../../content/about";

// About (one fixed document). Every field is optional: what's empty keeps
// the approved copy that ships with the site (src/content/about.ts), shown
// here as the grey placeholder.
const TONE: Record<string, string> = { tang: "Tangerine", grape: "Grape", ink: "Ink", outline: "Outline" };
const SIZE: Record<string, string> = { s: "Small", m: "Medium", l: "Large" };

export const about = defineType({
  name: "about",
  title: "About",
  type: "document",
  icon: UserIcon,
  description: "Empty fields use the text shown in grey.",
  fields: [
    defineField({ name: "hello", type: "string", description: "The page title.", placeholder: f.hello }),
    defineField({ name: "lead", type: "text", rows: 2, placeholder: f.lead }),
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
          ],
          preview: { select: { title: "place", subtitle: "when" } },
        }),
      ],
    }),
    defineField({
      name: "stickers",
      title: "Off screen stickers",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "sticker",
          fields: [
            defineField({ name: "text", type: "string", validation: (rule) => rule.required().max(24) }),
            defineField({
              name: "tone",
              type: "string",
              options: {
                list: [
                  { title: "Tangerine", value: "tang" },
                  { title: "Grape", value: "grape" },
                  { title: "Ink", value: "ink" },
                  { title: "Outline", value: "outline" },
                ],
                layout: "radio",
                direction: "horizontal",
              },
              initialValue: "tang",
            }),
            defineField({
              name: "size",
              type: "string",
              description: "Large for themes, small for single games.",
              options: {
                list: [
                  { title: "Small", value: "s" },
                  { title: "Medium", value: "m" },
                  { title: "Large", value: "l" },
                ],
                layout: "radio",
                direction: "horizontal",
              },
              initialValue: "m",
            }),
          ],
          preview: {
            select: { title: "text", tone: "tone", size: "size" },
            prepare: ({ title, tone, size }) => ({ title, subtitle: [TONE[tone] ?? tone, SIZE[size] ?? size].filter(Boolean).join(" · ") }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "About" }) },
});
