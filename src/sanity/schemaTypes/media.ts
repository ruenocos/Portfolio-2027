import { defineArrayMember, defineField, defineType } from "sanity";

// An image or a video clip, always with alt text.
export const media = defineType({
  name: "media",
  title: "Image or clip",
  type: "object",
  fields: [
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({
      name: "video",
      title: "Video clip",
      type: "file",
      options: { accept: "video/mp4,video/webm" },
      description: "Short, muted loop. Keep it under 10 MB.",
    }),
    defineField({
      name: "alt",
      title: "Alt text",
      type: "string",
      description: "What someone who can't see it should know.",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "caption", type: "string" }),
  ],
  validation: (rule) =>
    rule.custom((value: { image?: unknown; video?: unknown } | undefined) =>
      value?.image || value?.video ? true : "Add an image or a clip",
    ),
  preview: { select: { title: "alt", media: "image" } },
});

// Rich text kept deliberately small: paragraphs, one heading level, lists, links.
export const richText = defineType({
  name: "richText",
  title: "Text",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragraph", value: "normal" },
        { title: "Heading", value: "h3" },
      ],
      lists: [{ title: "Bullets", value: "bullet" }],
      marks: {
        decorators: [
          { title: "Bold", value: "strong" },
          { title: "Italic", value: "em" },
          { title: "Code", value: "code" },
        ],
      },
    }),
  ],
});
