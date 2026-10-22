// Placeholder content, used until the same thing exists in Sanity.
// The shapes match the Sanity schemas in src/sanity/schemaTypes.

export type Project = {
  slug: string;
  short: string;
  kind: string;
  title: string;
  summary: string;
  visual: "stat" | "browser" | "locked" | "media";
  stat?: { value: string; label: string };
  cover?: { src: string; alt: string; video?: boolean };
  url?: string;
  nda?: boolean;
};

export type Site = {
  name: string;
  role: string;
  headline: string;
  intro: string;
  positioning: string;
  email: string;
  linkedin: string;
};

export const site: Site = {
  name: "Wessel",
  role: "UI/UX designer and design engineer",
  headline: "Hi, I'm Wessel. I design, animate and automate.",
  intro:
    "UI/UX designer and design engineer. I build the tools that let teams skip the boring parts.",
  positioning:
    "I design interfaces, animate them, and automate the boring parts so teams ship better work.",
  email: "[your email]",
  linkedin: "https://www.linkedin.com/",
};

export const projects: Project[] = [
  {
    slug: "figma-plugin",
    short: "Figma plugin",
    kind: "Internal tool",
    title: "Design tokens to SCSS in one click",
    summary:
      "Designers and developers named the same styles differently, so every project started with hand-built SCSS. My plugin turns the design tokens into ready-to-paste SCSS, mobile text sizes included.",
    visual: "stat",
    stat: { value: "3h", label: "saved on every project, by one plugin" },
  },
  {
    slug: "de-saak",
    short: "De Saak",
    kind: "Website, end to end",
    title: "Designed, built and marketed by one person",
    summary:
      "The one project where I owned everything: the design, the build and the marketing. [result to add]",
    visual: "browser",
    url: "desaak.com",
  },
  {
    slug: "client-project",
    short: "[WP Masters project]",
    kind: "Client website",
    title: "[Project title]",
    summary:
      "Client work shown behind a password while it is under NDA. [one-line outcome]",
    visual: "locked",
    nda: true,
  },
];
