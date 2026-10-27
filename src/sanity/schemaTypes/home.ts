import { defineArrayMember, defineField, defineType } from "sanity";

const photo = defineArrayMember({
  type: "image",
  options: { hotspot: true },
  fields: [defineField({ name: "alt", title: "Alt text", type: "string", validation: (rule) => rule.required() })],
});

// Home (one fixed document). Every field is optional: what's empty keeps the
// approved copy that ships with the site (src/content/home.ts).
export const home = defineType({
  name: "home",
  title: "Home",
  type: "document",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "about", title: "About" },
    { name: "focus", title: "Focus" },
    { name: "archive", title: "Archive" },
  ],
  fields: [
    defineField({ name: "basedIn", title: "Based in", type: "string", group: "hero" }),
    defineField({
      name: "role",
      title: "Role line",
      type: "array",
      group: "hero",
      of: [defineArrayMember({ type: "string" })],
      description: "Two lines, in Wessel's voice (the serif).",
      validation: (rule) => rule.length(2),
    }),
    defineField({
      name: "reel",
      type: "object",
      group: "hero",
      fields: [
        defineField({ name: "loop", title: "Loop in the name", type: "file", options: { accept: "video/mp4" }, description: "Short and small: it plays inside the name." }),
        defineField({ name: "full", title: "Full reel", type: "file", options: { accept: "video/mp4" }, description: "Opens in the player." }),
        defineField({ name: "poster", type: "image" }),
      ],
    }),
    defineField({ name: "aboutOpener", title: "Opener", type: "text", rows: 2, group: "about" }),
    defineField({ name: "aboutNext", title: "What's next", type: "text", rows: 2, group: "about" }),
    defineField({ name: "photos", type: "array", group: "about", of: [photo], description: "The deck, top photo first." }),
    defineField({ name: "focusStatement", title: "Statement", type: "text", rows: 2, group: "focus" }),
    defineField({
      name: "tracks",
      type: "array",
      group: "focus",
      description: "One per diorama: UX, Motion, AI, in that order.",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "key",
              type: "string",
              options: { list: ["ux", "motion", "ai"] },
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "title", type: "string" }),
            defineField({ name: "line", type: "string" }),
          ],
          preview: { select: { title: "title", subtitle: "key" } },
        }),
      ],
    }),
    defineField({
      name: "archive",
      title: "Archive cards",
      type: "array",
      group: "archive",
      description: "The fanned hand above All work. Eight reads best.",
      of: [
        defineArrayMember({
          type: "image",
          fields: [defineField({ name: "name", type: "string", validation: (rule) => rule.required() })],
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Home" }) },
});
