import type { Fact } from "@/components/parts/Facts";

export type CaseFigure = { src: string; alt: string; caption: string; width: number; height: number };

/** One picture or loop in a media row. A loop shows its picture as the poster. */
export type CaseMedia = {
  src?: string;
  video?: string;
  alt: string;
  width: number;
  height: number;
};
/** A row in a section: 1, 2 or 3 across, or a before/after compare. */
export type CaseRow =
  | { key: string; kind: "row"; layout: "full" | "half" | "third"; items: CaseMedia[] }
  | { key: string; kind: "compare"; before: CaseMedia; after: CaseMedia; labels: [string, string] };

export type CaseSection = {
  key: string;
  /** The layer name in the panel and the section label. */
  name: string;
  /** A short claim, not the name again. */
  heading: string;
  body: string;
  figure?: CaseFigure;
  /** Media rows under the text, after the figure. */
  rows?: CaseRow[];
  /** Wessel's pin on the figure (or the first media row). */
  note?: string;
  /** Mock wording; real: the facts in it are sourced (e.g. Search Console). */
  mock?: "all" | "wording";
};
export type Case = {
  slug: string;
  title: string;
  lang?: string;
  lead: string;
  intro: string;
  facts: Fact[];
  hero: { video?: string; videoAv1?: string; poster?: string; caption: string; alt: string };
  sections: CaseSection[];
  /** Which top-level texts are placeholder copy. */
  mock?: ("lead" | "intro" | "caption")[];
};

const M = "/media/de-saak";

// De Saak. The wording is mock, drafted from desaak.com and Wons's notes,
// until he rewrites it. The result
// numbers are real: Google Search Console, from Wons, 26 Oct 2025 to 21 Oct 2026.
export const FALLBACK_CASES: Case[] = [
  {
    slug: "de-saak",
    title: "De Saak",
    lead: "An ERP site that starts with the problem, not the software.",
    intro:
      "De Saak helps project companies run on Microsoft Business Central. I designed and built their site from the ground up: problem-led solution pages, a page per sector, and a kennisbank, so the site has something to rank with besides its own sales pages.",
    facts: [
      { label: "Role", value: "Designer and developer", mock: true },
      { label: "Scope", value: "Design, dev, SEO" },
      { label: "Timeline", value: "2023–now" },
    ],
    hero: {
      video: `${M}/desaak-hero.mp4`,
      poster: `${M}/desaak-hero.jpg`,
      caption: "desaak.com, homepage header loop.",
      alt: "De Saak header loop: a slow wave of light particles on deep blue",
    },
    mock: ["lead", "intro"],
    sections: [
      {
        key: "context",
        name: "Context",
        heading: "A site for people who run projects",
        body: "De Saak sets up Microsoft Business Central for project companies: builders, installers, engineers, consultancies. They wanted a site that talks to the people who run those projects, not to people who read ERP brochures. I designed and built it from the ground up.",
        mock: "all",
      },
      {
        key: "problem",
        name: "Problem",
        heading: "Start with the headache",
        body: "ERP sites tend to open with features. Project companies don’t search for features. They search for the headache: hours logged a week late, work orders that arrive after the invoice, everything typed over into Excel. So the site had to start there.",
        figure: {
          src: `${M}/ds-problem.jpg`,
          width: 1600,
          height: 1000,
          alt: "De Saak page section listing recognisable pain points next to a photo of two people at a laptop",
          caption: "Second block on every solution page: the pains, in the customer’s words.",
        },
        mock: "all",
      },
      {
        key: "approach",
        name: "Approach",
        heading: "Problems first, software underneath",
        body: "I built the structure around problems instead of products. Four oplossingen, each one a problem in plain Dutch, with Business Central underneath. Sectors and extensions sit next to them, so every visitor has one obvious door in.",
        figure: {
          src: `${M}/ds-oplossingen.jpg`,
          width: 1600,
          height: 1000,
          alt: "Four solution cards on the De Saak site: ERP for project companies, apps and automation, digital strategy, training and support",
          caption: "Four doors in: ERP, apps and data, strategy, training.",
        },
        mock: "all",
      },
      {
        key: "design",
        name: "Design",
        heading: "The same order on every page",
        body: "Calm teal, one bright accent, a lot of room. Every solution page runs in the same order: what it is, the pains you’ll recognise, how they get solved, proof, then the ask: plan een kennismaking. The same order on a phone, just stacked.",
        figure: {
          src: `${M}/ds-design.jpg`,
          width: 1600,
          height: 1000,
          alt: "The ERP solution page on desktop and on a phone",
          caption: "ERP voor projectbedrijven, desktop and phone.",
        },
        note: "The menu took longest.",
        mock: "all",
      },
      {
        key: "build",
        name: "Build",
        heading: "One set of blocks, used everywhere",
        body: "One set of page blocks, reused everywhere. A new sector page is the same parts with a different problem in them, so the team can add one without waiting on me.",
        figure: {
          src: `${M}/ds-sector.jpg`,
          width: 1600,
          height: 1000,
          alt: "The De Saak sector page for installation companies",
          caption: "Sector page for installers: same blocks, different problem.",
        },
        mock: "all",
      },
      {
        key: "seo",
        name: "SEO",
        heading: "Answer what they type",
        body: "A kennisbank with practical articles on Business Central, AI and customer stories, written around what project companies actually type into Google. Every solution and sector page links into it, and it links back.",
        figure: {
          src: `${M}/ds-kennisbank.jpg`,
          width: 1600,
          height: 1000,
          alt: "The De Saak kennisbank overview with article cards and topic filters",
          caption: "The kennisbank: topics on the left, articles that answer one question each.",
        },
        mock: "all",
      },
      {
        key: "result",
        name: "Result",
        heading: "Seen more, clicked less (for now)",
        body: "In the last twelve months the site earned 45.2K impressions and 639 clicks in Google, at an average position of 24.1. Most of it came late: impressions climbed all year and passed 600 a day in October. Clicks haven’t caught up yet (1.4% CTR). That’s the next job.",
        figure: {
          src: `${M}/ds-searchconsole.jpg`,
          width: 1400,
          height: 517,
          alt: "Google Search Console chart: impressions rising across the year while average position holds around 20 to 30",
          caption: "Google Search Console, 26 Oct 2025 to 21 Oct 2026.",
        },
        mock: "wording",
      },
      {
        key: "takeaway",
        name: "Takeaway",
        heading: "Write the kennisbank first",
        body: "Starting from the problem made the writing harder and the structure easier. Next time I’d write the kennisbank first, and let the pages grow out of it.",
        mock: "all",
      },
    ],
  },
];
