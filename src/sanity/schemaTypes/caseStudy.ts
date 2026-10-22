import { defineField, defineType } from "sanity";

// The six-step case study: hook, context, exploration, motion, workflow, outcome.
const steps = [
  { name: "hook", title: "1. Hook", description: "The one thing to remember, in a sentence and a visual." },
  { name: "context", title: "2. Context", description: "The problem, who it was for, your role." },
  { name: "exploration", title: "3. Exploration", description: "Options you tried and why you picked one." },
  { name: "motion", title: "4. Motion", description: "How it moves, and why it moves that way." },
  { name: "workflow", title: "5. Workflow", description: "How you built it, including tools and AI where it helped." },
  { name: "outcome", title: "6. Outcome", description: "What changed: numbers, quotes, what you'd do next." },
];

export const caseStudy = defineType({
  name: "caseStudy",
  title: "Case study",
  type: "document",
  groups: [
    { name: "card", title: "Card", default: true },
    { name: "story", title: "Story" },
  ],
  fields: [
    defineField({ name: "title", type: "string", group: "card", validation: (rule) => rule.required() }),
    defineField({
      name: "slug",
      type: "slug",
      group: "card",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "short",
      title: "Short name",
      type: "string",
      group: "card",
      description: "Used in the project list, like \"Figma plugin\".",
      validation: (rule) => rule.required().max(28),
    }),
    defineField({ name: "kind", type: "string", group: "card", description: "Like \"Internal tool\" or \"Client website\"." }),
    defineField({ name: "summary", type: "text", rows: 3, group: "card", validation: (rule) => rule.required().max(280) }),
    defineField({
      name: "stat",
      title: "Key number",
      type: "object",
      group: "card",
      fields: [
        defineField({ name: "value", type: "string", description: "Like \"3h\"." }),
        defineField({ name: "label", type: "string", description: "Like \"saved on every project\"." }),
      ],
    }),
    defineField({ name: "cover", type: "media", group: "card" }),
    defineField({ name: "url", title: "Live URL", type: "url", group: "card" }),
    defineField({
      name: "nda",
      title: "Under NDA",
      type: "boolean",
      group: "card",
      initialValue: false,
      description:
        "Shows a password lock. Only put public teaser info in Sanity: the locked story lives in the code, because this dataset is public.",
    }),
    defineField({ name: "featured", title: "Show on Home", type: "boolean", group: "card", initialValue: true }),
    defineField({ name: "order", type: "number", group: "card", initialValue: 10 }),
    ...steps.map((step) =>
      defineField({
        name: step.name,
        title: step.title,
        description: step.description,
        type: "object",
        group: "story",
        hidden: ({ document }) => Boolean(document?.nda),
        fields: [
          defineField({ name: "body", type: "richText" }),
          defineField({ name: "media", type: "array", of: [{ type: "media" }] }),
        ],
      }),
    ),
  ],
  orderings: [{ title: "Order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: { select: { title: "title", subtitle: "kind", media: "cover.image" } },
});
