import type { Fact } from "@/components/parts/Facts";

export type CaseFigure = { src: string; alt: string; caption: string; width: number; height: number };
export type CaseSection = {
  key: string;
  /** The layer name in the panel and the section label. */
  name: string;
  /** A short claim, not the name again (Wons 2026-10-27). */
  heading: string;
  body: string;
  figure?: CaseFigure;
  /** Wessel's pin on the figure. */
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
  hero: { video?: string; poster?: string; caption: string; alt: string };
  sections: CaseSection[];
  /** Which top-level texts are placeholder copy. */
  mock?: ("lead" | "intro" | "caption")[];
};

const O = "/media/orka";
const fig = (src: string, alt: string, caption: string): CaseFigure => ({ src: `${O}/${src}.jpg`, width: 1600, height: 1000, alt, caption });

// Orka v01 (2026-10-29). Facts are Wons's answers and the Orka repo (README,
// git history, Wons's own TODO notes at the pause); the wording is mock until
// Wons rewrites it. Every screen is real Orka UI on a made-up demo workspace,
// so no number in them is a result.
const ORKA_CASE: Case = {
  slug: "orka",
  title: "Orka",
  lead: "A content tool that takes a blog post from keyword to published.",
  intro:
    "Orka is my own product idea for WordPress site owners. It audits the site, plans what to write, drafts the articles with AI and publishes them back. A working prototype I designed and built in about four weeks, now paused. The screens use a made-up coffee roaster as demo data.",
  facts: [
    { label: "Role", value: "Product, UX/UI and build" },
    { label: "Scope", value: "Product, design, build" },
    { label: "Timeline", value: "2026" },
  ],
  hero: {
    video: `${O}/orka-hero.mp4`,
    poster: `${O}/orka-hero.jpg`,
    caption: "The editor while a draft writes itself, one step at a time. Demo data.",
    alt: "Orka editor: the generating panel ticks through draft, SEO, links, citations and quality, then the article is ready for review",
  },
  mock: ["lead", "intro", "caption"],
  sections: [
    {
      key: "context",
      name: "Context",
      heading: "A content team in one app",
      body: "Orka is for people who own a WordPress site and know they should blog for search, but never get to it. It audits the site, plans campaigns, drafts the articles and publishes them on a schedule. I did the product, the UX/UI and the build, with AI tools doing a lot of the typing.",
      figure: fig("or-home", "Orka home: publishing chart, articles that need review and progress per campaign", "Home: what went out, what needs you, how far each campaign is."),
      mock: "all",
    },
    {
      key: "problem",
      name: "Problem",
      heading: "The same chores for every post",
      body: "Find a keyword, check the volume, write a brief, draft it, fill the meta title and description, add links, pick a date, publish. Every article runs the same steps, and most of them are copy and paste. That's slow, and it's the part people skip.",
      figure: fig("or-keywords", "Orka keyword list with intent, difficulty, volume and cost per click per keyword", "Keyword research: intent, difficulty and volume, per keyword."),
      mock: "all",
    },
    {
      key: "approach",
      name: "Approach",
      heading: "Start from the site, not a blank page",
      body: "Onboarding connects the WordPress site and audits it first: how much is there, what it's about, what's missing. The first campaign is built from what the audit found, so nobody starts from an empty list.",
      figure: fig("or-audit", "Orka onboarding audit results: posts analysed, average word count, top topics, strengths and content gaps", "Onboarding: the audit finds the topics and the gaps."),
      mock: "all",
    },
    {
      key: "design",
      name: "Design",
      heading: "Every article has a place in the line",
      body: "Every article moves through the same line: idea, planned, drafting, ready for review, scheduled, published. I kept that line visible everywhere, as a board, a list and a calendar, so you can always see what's next.",
      figure: fig("or-board", "Orka content board with one column per status, from idea to published", "The content board: one column per step."),
      mock: "all",
    },
    {
      key: "build",
      name: "Build",
      heading: "A pipeline, not one prompt",
      body: "Writing an article runs in five steps: draft, SEO, links, citations and a quality check. The editor shows each one as it runs, so you see what it's doing instead of a spinner. Next.js and Convex underneath, Claude for the writing, DataForSEO for the keyword data.",
      figure: fig("or-editor", "Orka editor with SEO fields on the left and the finished article on the right", "The editor after the steps: keywords and meta on the left, the article on the right."),
      note: "Five steps, not one prompt.",
      mock: "all",
    },
    {
      key: "takeaway",
      name: "Takeaway",
      heading: "The data was there. The app didn't use it.",
      body: "My own notes from when I paused it say it best: the SEO data was in a good spot, but the app almost never used it. If I pick Orka up again, that's where I start.",
      mock: "all",
    },
  ],
};

const M = "/media/de-saak";

// De Saak v01 (studio/web/hifi/case, spec v02). The wording is mock, drafted
// from desaak.com and Wons's notes, until Wons rewrites it. The result
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
  ORKA_CASE,
];
