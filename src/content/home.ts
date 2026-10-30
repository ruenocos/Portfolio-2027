import type { Project } from "@/components/parts/ProjectRow";
import { FALLBACK_PROJECTS } from "./projects";

// Everything the home page says and shows. Sanity fills it (the "home"
// singleton plus the projects picked for Home); until a field is filled there,
// the approved copy below stands in. Fields marked mock are placeholders, shown with data-mock
// so nothing invented ships unmarked (DESIGN.md §2.8).

export type Photo = { src: string; alt: string };
export type ArchiveCard = { src: string; name: string; mock?: boolean };
export type Track = { key: "ux" | "motion" | "ai"; title: string; line: string };

export type HomeContent = {
  hero: {
    basedIn: string;
    /** The role line, in Wessel's voice (Accent). Two lines on the hero. */
    role: [string, string];
    reel: { loop?: string; full?: string; poster?: string; mock?: boolean };
  };
  about: {
    opener: string;
    /** Who Wessel is, in short paragraphs (blank line between them). */
    intro: string;
    photos: Photo[];
  };
  projects: Project[];
  focus: { statement: string; tracks: Track[] };
  archive: ArchiveCard[];
};

export const FALLBACK_HOME: HomeContent = {
  hero: {
    basedIn: "Netherlands",
    role: ["UI/UX and", "motion designer"],
    // A placeholder loop until the real reel is cut.
    reel: { loop: "/media/reel-loop.mp4", full: "/media/reel.mp4", poster: "/media/reel.jpg", mock: true },
  },
  about: {
    opener: "Hi, I’m Wessel. I design websites and animate them at WP Masters.",
    intro:
      "I start with the person on the other side of the screen: who they are and how it should feel when they land. Once that’s clear, I use motion to show what changed and where to go next.\n\nI learned design at Mediacollege Amsterdam and motion through a lot of YouTube. Off screen, it’s sports and board games.",
    photos: [
      { src: "/media/portrait.jpg", alt: "Wessel Oud, portrait" },
      { src: "/media/about-barcelona.jpg", alt: "Wessel in front of the Sagrada Família in Barcelona" },
      { src: "/media/about-hat.jpg", alt: "Wessel in a denim bucket hat, mid-thought" },
    ],
  },
  projects: FALLBACK_PROJECTS,
  focus: {
    statement: "I like the small stuff. The bits you feel before you notice them.",
    tracks: [
      { key: "ux", title: "UX/UI design", line: "I design websites and the components behind them, so nobody has to redraw the same button." },
      { key: "motion", title: "Motion design", line: "From a small hover to a full After Effects piece, motion is how I explain things on screen." },
      { key: "ai", title: "AI / automation", line: "Exports and handoff files eat time. I’d rather a plugin did them, so I build those too." },
    ],
  },
  // The fanned hand above "All work": all six projects, the three still to
  // write on placeholder tiles.
  archive: [
    { src: "/media/archive-tile3.jpg", name: "AniPlanner", mock: true },
    { src: "/media/archive-tile1.jpg", name: "Orka", mock: true },
    { src: "/media/archive-ui-motion.jpg", name: "UI motion study" },
    { src: "/media/archive-desaak.jpg", name: "De Saak" },
    { src: "/media/archive-designer-tool.jpg", name: "Designer tool" },
    { src: "/media/archive-tile2.jpg", name: "Wagg.le", mock: true },
  ],
};
