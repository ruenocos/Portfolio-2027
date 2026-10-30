import { HomeIcon } from "@sanity/icons/Home";
import { defineArrayMember, defineField, defineType } from "sanity";
import { FALLBACK_HOME as f } from "../../content/home";

const photo = defineArrayMember({
  type: "image",
  options: { hotspot: true },
  fields: [defineField({ name: "alt", title: "Alt text", type: "string", validation: (rule) => rule.required() })],
});

// Home (one fixed document). Every field is optional: what's empty keeps the
// approved copy that ships with the site (src/content/home.ts), shown here as
// the grey placeholder so it's clear what an empty field puts on the page.
export const home = defineType({
  name: "home",
  title: "Home",
  type: "document",
  icon: HomeIcon,
  description: "Empty fields use the text shown in grey.",
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "about", title: "About teaser" },
    { name: "work", title: "Selected work" },
    { name: "focus", title: "Focus" },
    { name: "archive", title: "Archive" },
  ],
  fields: [
    defineField({ name: "basedIn", title: "Based in", type: "string", group: "hero", placeholder: f.hero.basedIn }),
    defineField({
      name: "role",
      title: "Role line",
      type: "array",
      group: "hero",
      of: [defineArrayMember({ type: "string" })],
      description: `Two lines, in Wessel's voice (the serif). Empty: "${f.hero.role.join(" ")}".`,
      validation: (rule) => rule.length(2),
    }),
    defineField({
      name: "reel",
      type: "object",
      group: "hero",
      fields: [
        defineField({ name: "loop", title: "Loop in the name", type: "file", options: { accept: "video/mp4" }, description: "Short and small: it plays inside the name." }),
        defineField({ name: "full", title: "Full reel", type: "file", options: { accept: "video/mp4" }, description: "Opens in the player." }),
        defineField({ name: "poster", type: "image", description: "Shown while the loop loads and whenever motion is paused." }),
      ],
    }),
    defineField({ name: "aboutOpener", title: "Opener", type: "text", rows: 2, group: "about", placeholder: f.about.opener }),
    // Named aboutNext from when it was one "what's next" line; renaming would strand the stored text.
    defineField({ name: "aboutNext", title: "Intro", type: "text", rows: 6, group: "about", placeholder: f.about.intro, description: "Who you are, in short paragraphs. Leave a blank line between them." }),
    defineField({ name: "photos", type: "array", group: "about", of: [photo], description: "The deck, top photo first. Portrait 3:4: set the focal point so faces stay in frame." }),
    defineField({
      name: "featured",
      title: "Projects on Home",
      type: "array",
      group: "work",
      description: "Pick up to three, in the order they show. Empty: the three newest projects.",
      of: [defineArrayMember({ type: "reference", to: [{ type: "project" }], weak: true })],
      validation: (rule) => rule.max(3).unique(),
    }),
    defineField({ name: "focusStatement", title: "Statement", type: "text", rows: 2, group: "focus", placeholder: f.focus.statement }),
    defineField({
      name: "tracks",
      type: "array",
      group: "focus",
      description: "One per diorama: UX, Motion, AI, in that order.",
      of: [
        defineArrayMember({
          type: "object",
          name: "track",
          fields: [
            defineField({
              name: "key",
              title: "Diorama",
              type: "string",
              options: {
                list: [
                  { title: "UX/UI", value: "ux" },
                  { title: "Motion", value: "motion" },
                  { title: "AI", value: "ai" },
                ],
                layout: "radio",
              },
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "title", type: "string" }),
            defineField({ name: "line", type: "string" }),
          ],
          preview: { select: { title: "title", subtitle: "line" } },
        }),
      ],
      validation: (rule) =>
        rule.max(3).custom((tracks: { key?: string }[] | undefined) => {
          const keys = (tracks ?? []).map((t) => t.key).filter(Boolean);
          return new Set(keys).size === keys.length ? true : "Each diorama once: UX/UI, Motion, AI.";
        }),
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
